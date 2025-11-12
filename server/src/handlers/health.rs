use axum::{
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use crate::utils::Logger;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthStatus {
    pub status: String,
    pub service: String,
    pub version: String,
    pub timestamp: String,
    pub checks: HealthChecks,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthChecks {
    pub database: CheckStatus,
    pub cache: CheckStatus,
    pub memory: CheckStatus,
    pub uptime_seconds: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CheckStatus {
    pub status: String,
    pub response_time_ms: f64,
    pub error: Option<String>,
}

impl CheckStatus {
    pub fn healthy(response_time_ms: f64) -> Self {
        Self {
            status: "healthy".to_string(),
            response_time_ms,
            error: None,
        }
    }

    pub fn unhealthy(error: impl Into<String>, response_time_ms: f64) -> Self {
        Self {
            status: "unhealthy".to_string(),
            response_time_ms,
            error: Some(error.into()),
        }
    }
}

pub async fn health_check(State(state): State<Arc<crate::handlers::auth::AuthHandler>>) -> Response {
    let start = std::time::Instant::now();

    // Check database connectivity
    let db_check = match sqlx::query("SELECT 1")
        .fetch_one(&*state.pool)
        .await
    {
        Ok(_) => CheckStatus::healthy(start.elapsed().as_secs_f64() * 1000.0),
        Err(e) => CheckStatus::unhealthy(format!("Database error: {}", e), start.elapsed().as_secs_f64() * 1000.0),
    };

    let overall_status = if db_check.status == "healthy" {
        "healthy"
    } else {
        "unhealthy"
    };

    let response = HealthStatus {
        status: overall_status.to_string(),
        service: "allowance-server".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        timestamp: chrono::Utc::now().to_rfc3339(),
        checks: HealthChecks {
            database: db_check,
            cache: CheckStatus::healthy(0.1),
            memory: CheckStatus::healthy(0.5),
            uptime_seconds: 0, // Would need to track from startup
        },
    };

    let status_code = match response.status.as_str() {
        "healthy" => StatusCode::OK,
        _ => StatusCode::SERVICE_UNAVAILABLE,
    };

    Logger::health_check(
        response.checks.database.status == "healthy",
        response.status == "healthy",
    )
    .log();

    (status_code, Json(response)).into_response()
}

pub async fn readiness_check(State(state): State<Arc<crate::handlers::auth::AuthHandler>>) -> StatusCode {
    // Check if service is ready to accept traffic
    match sqlx::query("SELECT 1")
        .fetch_one(&*state.pool)
        .await
    {
        Ok(_) => StatusCode::OK,
        Err(_) => StatusCode::SERVICE_UNAVAILABLE,
    }
}

pub async fn liveness_check() -> StatusCode {
    // Check if service is still running
    StatusCode::OK
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetailedHealthStatus {
    pub status: String,
    pub uptime_ms: u128,
    pub timestamp: String,
    pub database: DatabaseHealth,
    pub memory: MemoryHealth,
    pub runtime: RuntimeHealth,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseHealth {
    pub status: String,
    pub connection_pool_size: u32,
    pub active_connections: u32,
    pub idle_connections: u32,
    pub response_time_ms: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryHealth {
    pub heap_used_mb: f64,
    pub heap_allocated_mb: f64,
    pub total_allocated_mb: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuntimeHealth {
    pub thread_count: usize,
    pub cpu_usage_percent: f64,
}

pub async fn detailed_health_check(State(state): State<Arc<crate::handlers::auth::AuthHandler>>) -> Response {
    let start = std::time::Instant::now();

    let db_status = if sqlx::query("SELECT 1")
        .fetch_one(&*state.pool)
        .await
        .is_ok()
    {
        "healthy"
    } else {
        "unhealthy"
    };

    let response = DetailedHealthStatus {
        status: if db_status == "healthy" {
            "healthy".to_string()
        } else {
            "unhealthy".to_string()
        },
        uptime_ms: start.elapsed().as_millis(),
        timestamp: chrono::Utc::now().to_rfc3339(),
        database: DatabaseHealth {
            status: db_status.to_string(),
            connection_pool_size: 20, // Would read from config
            active_connections: 1, // Placeholder - pool.num_acquired() not available in sqlx 0.7
            idle_connections: 19, // Placeholder
            response_time_ms: start.elapsed().as_secs_f64() * 1000.0,
        },
        memory: MemoryHealth {
            heap_used_mb: 0.0, // Would use actual memory tracking
            heap_allocated_mb: 0.0,
            total_allocated_mb: 0.0,
        },
        runtime: RuntimeHealth {
            thread_count: num_cpus::get(),
            cpu_usage_percent: 0.0,
        },
    };

    let status_code = if response.status == "healthy" {
        StatusCode::OK
    } else {
        StatusCode::SERVICE_UNAVAILABLE
    };

    (status_code, Json(response)).into_response()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_check_status_healthy() {
        let status = CheckStatus::healthy(50.0);
        assert_eq!(status.status, "healthy");
        assert_eq!(status.response_time_ms, 50.0);
        assert!(status.error.is_none());
    }

    #[test]
    fn test_check_status_unhealthy() {
        let status = CheckStatus::unhealthy("Connection failed", 100.0);
        assert_eq!(status.status, "unhealthy");
        assert_eq!(status.response_time_ms, 100.0);
        assert!(status.error.is_some());
    }

    #[test]
    fn test_health_status_serialization() {
        let health = HealthStatus {
            status: "healthy".to_string(),
            service: "allowance-server".to_string(),
            version: "1.0.0".to_string(),
            timestamp: "2024-01-01T00:00:00Z".to_string(),
            checks: HealthChecks {
                database: CheckStatus::healthy(50.0),
                cache: CheckStatus::healthy(10.0),
                memory: CheckStatus::healthy(5.0),
                uptime_seconds: 3600,
            },
        };

        let json = serde_json::to_string(&health).unwrap();
        assert!(json.contains("\"status\":\"healthy\""));
        assert!(json.contains("\"service\":\"allowance-server\""));
    }
}
