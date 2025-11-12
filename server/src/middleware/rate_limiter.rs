use axum::{
    body::Body,
    extract::ConnectInfo,
    http::Request,
    middleware::Next,
    response::{IntoResponse, Response},
};
use std::{
    net::SocketAddr,
    sync::Arc,
};
use tokio::sync::RwLock;
use std::collections::HashMap;
use std::time::{Duration, Instant};
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct RateLimitConfig {
    pub requests_per_minute: u32,
    pub requests_per_hour: u32,
    pub burst_size: u32,
}

impl Default for RateLimitConfig {
    fn default() -> Self {
        Self {
            requests_per_minute: 60,
            requests_per_hour: 1000,
            burst_size: 10,
        }
    }
}

#[derive(Debug, Clone)]
struct ClientQuota {
    minute_window: Instant,
    minute_count: u32,
    hour_window: Instant,
    hour_count: u32,
}

pub struct RateLimiter {
    config: RateLimitConfig,
    clients: Arc<RwLock<HashMap<String, ClientQuota>>>,
}

impl RateLimiter {
    pub fn new(config: RateLimitConfig) -> Self {
        let limiter = Self {
            config,
            clients: Arc::new(RwLock::new(HashMap::new())),
        };

        // Spawn cleanup task
        let limiter_clone = limiter.clone();
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_secs(300)); // 5 minutes
            loop {
                interval.tick().await;
                limiter_clone.cleanup_old_entries().await;
            }
        });

        limiter
    }

    pub async fn check_rate_limit(&self, client_id: String) -> Result<(), RateLimitError> {
        let now = Instant::now();
        let mut clients = self.clients.write().await;

        let quota = clients
            .entry(client_id)
            .or_insert_with(|| ClientQuota {
                minute_window: now,
                minute_count: 0,
                hour_window: now,
                hour_count: 0,
            });

        // Reset minute window if expired
        if now.duration_since(quota.minute_window) > Duration::from_secs(60) {
            quota.minute_window = now;
            quota.minute_count = 0;
        }

        // Reset hour window if expired
        if now.duration_since(quota.hour_window) > Duration::from_secs(3600) {
            quota.hour_window = now;
            quota.hour_count = 0;
        }

        // Check per-minute limit
        if quota.minute_count >= self.config.requests_per_minute {
            return Err(RateLimitError::PerMinuteExceeded {
                limit: self.config.requests_per_minute,
                window_reset: quota.minute_window + Duration::from_secs(60),
            });
        }

        // Check per-hour limit
        if quota.hour_count >= self.config.requests_per_hour {
            return Err(RateLimitError::PerHourExceeded {
                limit: self.config.requests_per_hour,
                window_reset: quota.hour_window + Duration::from_secs(3600),
            });
        }

        // Increment counters
        quota.minute_count += 1;
        quota.hour_count += 1;

        Ok(())
    }

    async fn cleanup_old_entries(&self) {
        let now = Instant::now();
        let mut clients = self.clients.write().await;

        clients.retain(|_, quota| {
            // Keep entries that have activity within the last hour
            now.duration_since(quota.hour_window) < Duration::from_secs(3600)
        });
    }

    pub async fn get_stats(&self, client_id: &str) -> Option<ClientQuotaInfo> {
        let clients = self.clients.read().await;
        clients.get(client_id).map(|quota| ClientQuotaInfo {
            minute_remaining: self.config.requests_per_minute.saturating_sub(quota.minute_count),
            hour_remaining: self.config.requests_per_hour.saturating_sub(quota.hour_count),
            minute_reset: quota.minute_window + Duration::from_secs(60),
            hour_reset: quota.hour_window + Duration::from_secs(3600),
        })
    }
}

impl Clone for RateLimiter {
    fn clone(&self) -> Self {
        Self {
            config: self.config.clone(),
            clients: Arc::clone(&self.clients),
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct ClientQuotaInfo {
    pub minute_remaining: u32,
    pub hour_remaining: u32,
    pub minute_reset: Instant,
    pub hour_reset: Instant,
}

#[derive(Debug)]
pub enum RateLimitError {
    PerMinuteExceeded {
        limit: u32,
        window_reset: Instant,
    },
    PerHourExceeded {
        limit: u32,
        window_reset: Instant,
    },
}

impl IntoResponse for RateLimitError {
    fn into_response(self) -> Response {
        match self {
            RateLimitError::PerMinuteExceeded { .. } => (
                axum::http::StatusCode::TOO_MANY_REQUESTS,
                "Rate limit exceeded: Per-minute limit reached",
            )
                .into_response(),
            RateLimitError::PerHourExceeded { .. } => (
                axum::http::StatusCode::TOO_MANY_REQUESTS,
                "Rate limit exceeded: Per-hour limit reached",
            )
                .into_response(),
        }
    }
}

pub async fn rate_limit_middleware(
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    req: Request<Body>,
    next: Next,
) -> Result<Response, RateLimitError> {
    let client_ip = addr.ip().to_string();
    
    // Get rate limiter from request extensions
    let limiter = req
        .extensions()
        .get::<RateLimiter>()
        .cloned()
        .unwrap_or_else(|| RateLimiter::new(RateLimitConfig::default()));

    limiter.check_rate_limit(client_ip).await?;

    Ok(next.run(req).await)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_rate_limit_per_minute() {
        let config = RateLimitConfig {
            requests_per_minute: 5,
            requests_per_hour: 100,
            burst_size: 5,
        };
        let limiter = RateLimiter::new(config);

        // First 5 requests should succeed
        for _ in 0..5 {
            assert!(limiter.check_rate_limit("client1".to_string()).await.is_ok());
        }

        // 6th request should fail
        assert!(limiter.check_rate_limit("client1".to_string()).await.is_err());
    }

    #[tokio::test]
    async fn test_rate_limit_per_hour() {
        let config = RateLimitConfig {
            requests_per_minute: 100,
            requests_per_hour: 10,
            burst_size: 10,
        };
        let limiter = RateLimiter::new(config);

        // First 10 requests should succeed
        for _ in 0..10 {
            assert!(limiter.check_rate_limit("client2".to_string()).await.is_ok());
        }

        // 11th request should fail
        assert!(limiter.check_rate_limit("client2".to_string()).await.is_err());
    }

    #[tokio::test]
    async fn test_different_clients_independent() {
        let config = RateLimitConfig {
            requests_per_minute: 2,
            requests_per_hour: 100,
            burst_size: 2,
        };
        let limiter = RateLimiter::new(config);

        // Client 1: 2 requests
        assert!(limiter.check_rate_limit("client1".to_string()).await.is_ok());
        assert!(limiter.check_rate_limit("client1".to_string()).await.is_ok());

        // Client 2: should still have quota
        assert!(limiter.check_rate_limit("client2".to_string()).await.is_ok());
        assert!(limiter.check_rate_limit("client2".to_string()).await.is_ok());
    }

    #[tokio::test]
    async fn test_get_stats() {
        let config = RateLimitConfig {
            requests_per_minute: 10,
            requests_per_hour: 100,
            burst_size: 10,
        };
        let limiter = RateLimiter::new(config);

        // Make 3 requests
        for _ in 0..3 {
            let _ = limiter.check_rate_limit("client1".to_string()).await;
        }

        let stats = limiter.get_stats("client1").await;
        assert!(stats.is_some());

        let stats = stats.unwrap();
        assert_eq!(stats.minute_remaining, 7); // 10 - 3
        assert_eq!(stats.hour_remaining, 97); // 100 - 3
    }
}
