use serde::Serialize;
use std::fmt::Debug;
use tracing::{debug, error, info, warn};
use chrono::Utc;

#[derive(Debug, Clone, Serialize)]
pub struct LogEntry {
    pub timestamp: String,
    pub level: String,
    pub message: String,
    pub service: String,
    pub version: String,
    pub request_id: Option<String>,
    pub user_id: Option<i64>,
    pub status_code: Option<u16>,
    pub duration_ms: Option<f64>,
    pub error: Option<String>,
    pub context: Option<serde_json::Value>,
}

impl LogEntry {
    pub fn new(level: &str, message: impl Into<String>) -> Self {
        Self {
            timestamp: Utc::now().to_rfc3339(),
            level: level.to_string(),
            message: message.into(),
            service: "allowance-server".to_string(),
            version: env!("CARGO_PKG_VERSION").to_string(),
            request_id: None,
            user_id: None,
            status_code: None,
            duration_ms: None,
            error: None,
            context: None,
        }
    }

    pub fn with_request_id(mut self, request_id: String) -> Self {
        self.request_id = Some(request_id);
        self
    }

    pub fn with_user_id(mut self, user_id: i64) -> Self {
        self.user_id = Some(user_id);
        self
    }

    pub fn with_status_code(mut self, status_code: u16) -> Self {
        self.status_code = Some(status_code);
        self
    }

    pub fn with_duration_ms(mut self, duration_ms: f64) -> Self {
        self.duration_ms = Some(duration_ms);
        self
    }

    pub fn with_error(mut self, error: impl Into<String>) -> Self {
        self.error = Some(error.into());
        self
    }

    pub fn with_context(mut self, context: serde_json::Value) -> Self {
        self.context = Some(context);
        self
    }

    pub fn to_json(&self) -> String {
        serde_json::to_string(self).unwrap_or_else(|_| "{}".to_string())
    }

    pub fn log(&self) {
        match self.level.as_str() {
            "ERROR" => {
                if let Some(error) = &self.error {
                    error!("{} - {}", self.message, error);
                } else {
                    error!("{}", self.message);
                }
            }
            "WARN" => warn!("{}", self.message),
            "INFO" => info!("{}", self.message),
            "DEBUG" => debug!("{}", self.message),
            _ => info!("{}", self.message),
        }
    }
}

pub struct Logger;

impl Logger {
    pub fn info(message: impl Into<String>) -> LogEntry {
        LogEntry::new("INFO", message)
    }

    pub fn warn(message: impl Into<String>) -> LogEntry {
        LogEntry::new("WARN", message)
    }

    pub fn error(message: impl Into<String>) -> LogEntry {
        LogEntry::new("ERROR", message)
    }

    pub fn debug(message: impl Into<String>) -> LogEntry {
        LogEntry::new("DEBUG", message)
    }

    pub fn request_received(method: &str, path: &str, request_id: &str) -> LogEntry {
        let message = format!("{} {}", method, path);
        Logger::info(message)
            .with_request_id(request_id.to_string())
            .with_context(serde_json::json!({
                "event": "request_received",
                "method": method,
                "path": path,
            }))
    }

    pub fn request_completed(
        method: &str,
        path: &str,
        status_code: u16,
        duration_ms: f64,
        request_id: &str,
    ) -> LogEntry {
        let level = if status_code < 400 { "INFO" } else { "WARN" };
        let message = format!("{} {} -> {}", method, path, status_code);

        LogEntry::new(level, message)
            .with_request_id(request_id.to_string())
            .with_status_code(status_code)
            .with_duration_ms(duration_ms)
            .with_context(serde_json::json!({
                "event": "request_completed",
                "method": method,
                "path": path,
                "status_code": status_code,
                "duration_ms": duration_ms,
            }))
    }

    pub fn authentication_success(user_id: i64, request_id: &str) -> LogEntry {
        Logger::info("Authentication successful")
            .with_user_id(user_id)
            .with_request_id(request_id.to_string())
            .with_context(serde_json::json!({
                "event": "authentication_success",
                "user_id": user_id,
            }))
    }

    pub fn authentication_failed(email: &str, reason: &str) -> LogEntry {
        Logger::warn(format!("Authentication failed: {}", reason))
            .with_error(reason)
            .with_context(serde_json::json!({
                "event": "authentication_failed",
                "email": email,
                "reason": reason,
            }))
    }

    pub fn authorization_denied(user_id: i64, required_permission: &str) -> LogEntry {
        Logger::warn(format!("Authorization denied for permission: {}", required_permission))
            .with_user_id(user_id)
            .with_error("insufficient_permissions")
            .with_context(serde_json::json!({
                "event": "authorization_denied",
                "user_id": user_id,
                "required_permission": required_permission,
            }))
    }

    pub fn database_error(operation: &str, error: &str) -> LogEntry {
        Logger::error(format!("Database error during {}: {}", operation, error))
            .with_error(error)
            .with_context(serde_json::json!({
                "event": "database_error",
                "operation": operation,
            }))
    }

    pub fn payment_processed(user_id: i64, amount: i64, status: &str) -> LogEntry {
        Logger::info(format!("Payment processed: {} cents for status {}", amount, status))
            .with_user_id(user_id)
            .with_context(serde_json::json!({
                "event": "payment_processed",
                "user_id": user_id,
                "amount": amount,
                "status": status,
            }))
    }

    pub fn tier_upgraded(user_id: i64, from_tier: &str, to_tier: &str) -> LogEntry {
        Logger::info(format!("User tier upgraded from {} to {}", from_tier, to_tier))
            .with_user_id(user_id)
            .with_context(serde_json::json!({
                "event": "tier_upgraded",
                "user_id": user_id,
                "from_tier": from_tier,
                "to_tier": to_tier,
            }))
    }

    pub fn subscription_created(user_id: i64, tier: &str, period_months: i32) -> LogEntry {
        Logger::info(format!("Subscription created: tier={}, period={}m", tier, period_months))
            .with_user_id(user_id)
            .with_context(serde_json::json!({
                "event": "subscription_created",
                "user_id": user_id,
                "tier": tier,
                "period_months": period_months,
            }))
    }

    pub fn license_generated(user_id: i64, product_id: &str, version: &str) -> LogEntry {
        Logger::info(format!("License generated: product={}, version={}", product_id, version))
            .with_user_id(user_id)
            .with_context(serde_json::json!({
                "event": "license_generated",
                "user_id": user_id,
                "product_id": product_id,
                "version": version,
            }))
    }

    pub fn security_event(event_type: &str, user_id: Option<i64>, details: &str) -> LogEntry {
        Logger::warn(format!("Security event: {}: {}", event_type, details))
            .with_error(event_type)
            .with_context(serde_json::json!({
                "event": "security_event",
                "type": event_type,
                "user_id": user_id,
                "details": details,
            }))
    }

    pub fn service_startup(version: &str, environment: &str) -> LogEntry {
        Logger::info(format!("Service started: {} in {}", version, environment))
            .with_context(serde_json::json!({
                "event": "service_startup",
                "version": version,
                "environment": environment,
            }))
    }

    pub fn health_check(database_ok: bool, services_ok: bool) -> LogEntry {
        let message = format!(
            "Health check: db={}, services={}",
            if database_ok { "ok" } else { "failed" },
            if services_ok { "ok" } else { "failed" }
        );
        Logger::info(message).with_context(serde_json::json!({
            "event": "health_check",
            "database": database_ok,
            "services": services_ok,
        }))
    }
}

pub fn init_logging() {
    use tracing_subscriber::{fmt, prelude::*, EnvFilter};

    tracing_subscriber::registry()
        .with(EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")))
        .with(
            fmt::layer()
                .json()
                .with_writer(std::io::stdout)
                .with_target(true)
                .with_thread_ids(true)
                .with_file(true)
                .with_line_number(true),
        )
        .init();
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_log_entry_creation() {
        let entry = LogEntry::new("INFO", "Test message");
        assert_eq!(entry.level, "INFO");
        assert_eq!(entry.message, "Test message");
        assert_eq!(entry.service, "allowance-server");
    }

    #[test]
    fn test_log_entry_with_request_id() {
        let entry = LogEntry::new("INFO", "Test").with_request_id("req-123".to_string());
        assert_eq!(entry.request_id, Some("req-123".to_string()));
    }

    #[test]
    fn test_log_entry_with_user_id() {
        let entry = LogEntry::new("INFO", "Test").with_user_id(42);
        assert_eq!(entry.user_id, Some(42));
    }

    #[test]
    fn test_log_entry_serialization() {
        let entry = LogEntry::new("INFO", "Test")
            .with_user_id(42)
            .with_status_code(200)
            .with_duration_ms(123.45);

        let json = entry.to_json();
        assert!(json.contains("\"level\":\"INFO\""));
        assert!(json.contains("\"user_id\":42"));
        assert!(json.contains("\"status_code\":200"));
    }

    #[test]
    fn test_logger_authentication_success() {
        let entry = Logger::authentication_success(42, "req-123");
        assert_eq!(entry.level, "INFO");
        assert_eq!(entry.user_id, Some(42));
        assert_eq!(entry.request_id, Some("req-123".to_string()));
    }

    #[test]
    fn test_logger_authentication_failed() {
        let entry = Logger::authentication_failed("user@example.com", "invalid_password");
        assert_eq!(entry.level, "WARN");
        assert!(entry.error.is_some());
    }

    #[test]
    fn test_logger_tier_upgrade() {
        let entry = Logger::tier_upgraded(42, "free", "pro");
        assert_eq!(entry.level, "INFO");
        assert_eq!(entry.user_id, Some(42));
    }

    #[test]
    fn test_logger_payment() {
        let entry = Logger::payment_processed(42, 999, "succeeded");
        assert_eq!(entry.level, "INFO");
        assert_eq!(entry.user_id, Some(42));
    }

    #[test]
    fn test_logger_security_event() {
        let entry = Logger::security_event("suspicious_activity", Some(42), "too many failed logins");
        assert_eq!(entry.level, "WARN");
        assert_eq!(entry.user_id, Some(42));
    }
}
