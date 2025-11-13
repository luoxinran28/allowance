pub mod auth;
pub mod product;
pub mod user;
pub mod team;
pub mod admin;
pub mod organization;
pub mod payment;
pub mod health;
pub mod webhooks;
pub mod batch_licenses;

use axum::{
    response::{IntoResponse, Response},
    http::StatusCode,
    Json,
};
use serde_json::json;

use crate::utils::AppError;

/// Convert AppError to HTTP response
impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            AppError::InvalidCredentials => (
                StatusCode::UNAUTHORIZED,
                "Invalid email or password".to_string(),
            ),
            AppError::UserNotFound => (StatusCode::NOT_FOUND, "User not found".to_string()),
            AppError::UserAlreadyExists => (
                StatusCode::CONFLICT,
                "User already exists".to_string(),
            ),
            AppError::EmailAlreadyRegistered => (
                StatusCode::CONFLICT,
                "Email already registered".to_string(),
            ),
            AppError::InvalidToken | AppError::TokenExpired => (
                StatusCode::UNAUTHORIZED,
                "Invalid or expired token".to_string(),
            ),
            AppError::Unauthorized => (StatusCode::UNAUTHORIZED, "Unauthorized".to_string()),
            AppError::PermissionDenied => (
                StatusCode::FORBIDDEN,
                "Permission denied".to_string(),
            ),
            AppError::Forbidden => (StatusCode::FORBIDDEN, "Forbidden".to_string()),
            AppError::InvalidRequest(msg) => (StatusCode::BAD_REQUEST, msg),
            AppError::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg),
            AppError::NotFound(msg) => (StatusCode::NOT_FOUND, msg),
            AppError::Conflict(msg) => (StatusCode::CONFLICT, msg),
            AppError::ProductNotFound => (
                StatusCode::NOT_FOUND,
                "Product not found".to_string(),
            ),
            AppError::LicenseNotFound => (
                StatusCode::NOT_FOUND,
                "License not found".to_string(),
            ),
            AppError::LicenseExpired => (StatusCode::GONE, "License expired".to_string()),
            AppError::DailyLimitExceeded => (
                StatusCode::TOO_MANY_REQUESTS,
                "Daily limit exceeded".to_string(),
            ),
            AppError::EmailServiceError(msg) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Email service error: {}", msg),
            ),
            AppError::DatabaseError(e) => {
                tracing::error!("Database error: {}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Database error".to_string(),
                )
            }
            AppError::JsonError(e) => {
                tracing::error!("JSON error: {}", e);
                (StatusCode::BAD_REQUEST, "Invalid JSON".to_string())
            }
            AppError::InternalServerError => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Internal server error".to_string(),
            ),
        };

        let body = Json(json!({
            "error": message,
        }));

        (status, body).into_response()
    }
}
