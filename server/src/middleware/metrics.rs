use axum::{
    body::Body,
    extract::ConnectInfo,
    http::{Request, StatusCode},
    middleware::Next,
    response::Response,
};
use std::{
    net::SocketAddr,
    sync::Arc,
    time::Instant,
};
use tokio::sync::RwLock;
use std::collections::HashMap;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetricsSnapshot {
    pub total_requests: u64,
    pub total_errors: u64,
    pub total_2xx: u64,
    pub total_4xx: u64,
    pub total_5xx: u64,
    pub response_times: Vec<f64>,
    pub p50_response_time_ms: f64,
    pub p95_response_time_ms: f64,
    pub p99_response_time_ms: f64,
    pub endpoints: HashMap<String, EndpointMetrics>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EndpointMetrics {
    pub method: String,
    pub path: String,
    pub total_requests: u64,
    pub total_errors: u64,
    pub avg_response_time_ms: f64,
    pub max_response_time_ms: f64,
    pub status_codes: HashMap<u16, u64>,
}

#[derive(Debug, Clone)]
struct RequestMetric {
    method: String,
    path: String,
    status_code: u16,
    response_time_ms: f64,
}

pub struct MetricsCollector {
    metrics: Arc<RwLock<Vec<RequestMetric>>>,
}

impl MetricsCollector {
    pub fn new() -> Self {
        Self {
            metrics: Arc::new(RwLock::new(Vec::new())),
        }
    }

    pub async fn record_request(
        &self,
        method: String,
        path: String,
        status_code: u16,
        response_time_ms: f64,
    ) {
        let mut metrics = self.metrics.write().await;
        metrics.push(RequestMetric {
            method,
            path,
            status_code,
            response_time_ms,
        });

        // Keep only last 10000 metrics to prevent unbounded growth
        if metrics.len() > 10000 {
            metrics.drain(0..5000);
        }
    }

    pub async fn get_snapshot(&self) -> MetricsSnapshot {
        let metrics = self.metrics.read().await;

        let total_requests = metrics.len() as u64;
        let total_errors = metrics.iter().filter(|m| m.status_code >= 400).count() as u64;
        let total_2xx = metrics.iter().filter(|m| m.status_code < 300).count() as u64;
        let total_4xx = metrics.iter().filter(|m| m.status_code >= 400 && m.status_code < 500).count() as u64;
        let total_5xx = metrics.iter().filter(|m| m.status_code >= 500).count() as u64;

        let mut response_times: Vec<f64> =
            metrics.iter().map(|m| m.response_time_ms).collect();
        response_times.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));

        let p50_response_time_ms = percentile(&response_times, 0.50);
        let p95_response_time_ms = percentile(&response_times, 0.95);
        let p99_response_time_ms = percentile(&response_times, 0.99);

        let mut endpoints: HashMap<String, EndpointMetrics> = HashMap::new();

        for metric in metrics.iter() {
            let key = format!("{} {}", metric.method, metric.path);
            let entry = endpoints
                .entry(key.clone())
                .or_insert_with(|| EndpointMetrics {
                    method: metric.method.clone(),
                    path: metric.path.clone(),
                    total_requests: 0,
                    total_errors: 0,
                    avg_response_time_ms: 0.0,
                    max_response_time_ms: 0.0,
                    status_codes: HashMap::new(),
                });

            entry.total_requests += 1;
            if metric.status_code >= 400 {
                entry.total_errors += 1;
            }
            entry.avg_response_time_ms =
                (entry.avg_response_time_ms * (entry.total_requests as f64 - 1.0)
                    + metric.response_time_ms)
                    / entry.total_requests as f64;
            entry.max_response_time_ms =
                entry.max_response_time_ms.max(metric.response_time_ms);
            *entry
                .status_codes
                .entry(metric.status_code)
                .or_insert(0) += 1;
        }

        MetricsSnapshot {
            total_requests,
            total_errors,
            total_2xx,
            total_4xx,
            total_5xx,
            response_times,
            p50_response_time_ms,
            p95_response_time_ms,
            p99_response_time_ms,
            endpoints,
        }
    }

    pub async fn get_endpoint_metrics(&self, method: &str, path: &str) -> Option<EndpointMetrics> {
        let snapshot = self.get_snapshot().await;
        let key = format!("{} {}", method, path);
        snapshot.endpoints.get(&key).cloned()
    }

    pub async fn reset(&self) {
        let mut metrics = self.metrics.write().await;
        metrics.clear();
    }
}

impl Clone for MetricsCollector {
    fn clone(&self) -> Self {
        Self {
            metrics: Arc::clone(&self.metrics),
        }
    }
}

fn percentile(sorted_data: &[f64], p: f64) -> f64 {
    if sorted_data.is_empty() {
        return 0.0;
    }

    let index = ((p * sorted_data.len() as f64) as usize).min(sorted_data.len() - 1);
    sorted_data[index]
}

pub async fn metrics_middleware(
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    req: Request<Body>,
    next: Next,
) -> Response {
    let method = req.method().to_string();
    let path = req.uri().path().to_string();
    let start = Instant::now();

    let response = next.run(req).await;
    let duration = start.elapsed();
    let response_time_ms = duration.as_secs_f64() * 1000.0;
    let status_code = response.status().as_u16();

    // Get metrics collector from extensions
    if let Some(collector) = response.extensions().get::<MetricsCollector>() {
        collector
            .record_request(method, path, status_code, response_time_ms)
            .await;
    }

    response
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_metrics_collection() {
        let collector = MetricsCollector::new();

        collector
            .record_request("GET".to_string(), "/api/test".to_string(), 200, 50.0)
            .await;
        collector
            .record_request("GET".to_string(), "/api/test".to_string(), 200, 75.0)
            .await;

        let snapshot = collector.get_snapshot().await;

        assert_eq!(snapshot.total_requests, 2);
        assert_eq!(snapshot.total_2xx, 2);
        assert_eq!(snapshot.total_errors, 0);
    }

    #[tokio::test]
    async fn test_endpoint_metrics() {
        let collector = MetricsCollector::new();

        for i in 0..5 {
            collector
                .record_request(
                    "POST".to_string(),
                    "/api/create".to_string(),
                    200,
                    (50 + i * 10) as f64,
                )
                .await;
        }

        let metrics = collector.get_endpoint_metrics("POST", "/api/create").await;
        assert!(metrics.is_some());

        let metrics = metrics.unwrap();
        assert_eq!(metrics.total_requests, 5);
        assert_eq!(metrics.total_errors, 0);
        assert!(metrics.avg_response_time_ms > 50.0);
        assert_eq!(metrics.max_response_time_ms, 90.0);
    }

    #[tokio::test]
    async fn test_error_tracking() {
        let collector = MetricsCollector::new();

        collector
            .record_request("GET".to_string(), "/api/not-found".to_string(), 404, 10.0)
            .await;
        collector
            .record_request("GET".to_string(), "/api/error".to_string(), 500, 20.0)
            .await;
        collector
            .record_request("POST".to_string(), "/api/data".to_string(), 200, 30.0)
            .await;

        let snapshot = collector.get_snapshot().await;

        assert_eq!(snapshot.total_requests, 3);
        assert_eq!(snapshot.total_errors, 2);
        assert_eq!(snapshot.total_4xx, 1);
        assert_eq!(snapshot.total_5xx, 1);
    }

    #[tokio::test]
    async fn test_percentiles() {
        let collector = MetricsCollector::new();

        let times = vec![10.0, 20.0, 30.0, 40.0, 50.0, 60.0, 70.0, 80.0, 90.0, 100.0];
        for time in times {
            collector
                .record_request("GET".to_string(), "/api/test".to_string(), 200, time)
                .await;
        }

        let snapshot = collector.get_snapshot().await;

        assert!(snapshot.p50_response_time_ms >= 40.0 && snapshot.p50_response_time_ms <= 60.0);
        assert!(snapshot.p95_response_time_ms >= 85.0 && snapshot.p95_response_time_ms <= 100.0);
        assert!(snapshot.p99_response_time_ms >= 95.0 && snapshot.p99_response_time_ms <= 100.0);
    }

    #[tokio::test]
    async fn test_reset() {
        let collector = MetricsCollector::new();

        collector
            .record_request("GET".to_string(), "/api/test".to_string(), 200, 50.0)
            .await;

        let snapshot = collector.get_snapshot().await;
        assert_eq!(snapshot.total_requests, 1);

        collector.reset().await;

        let snapshot = collector.get_snapshot().await;
        assert_eq!(snapshot.total_requests, 0);
    }
}
