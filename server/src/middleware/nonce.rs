use axum::{
    extract::Request,
    middleware::Next,
    response::Response,
};
use crate::utils::errors::AppError;
use crate::utils::nonce::is_nonce_expired;

/// Nonce verification middleware for POST/PUT/DELETE requests
/// 
/// This middleware validates:
/// - Request timestamp is not expired (3 minute window)
/// - Nonce and signature headers are present
/// - Signature is valid (NOTE: Currently skipped - requires state access to secret)
/// 
/// To fully enable Nonce verification:
/// 1. Modify to accept State<AppState>
/// 2. Verify signature using state.config.api_secret_key
/// 3. Check Nonce against Redis (state.redis)
/// 4. Add to main.rs router middleware stack
pub async fn nonce_middleware(
    request: Request,
    next: Next,
) -> Result<Response, AppError> {
    // Only validate POST, PUT, DELETE requests
    if !matches!(*request.method(), axum::http::Method::POST | axum::http::Method::PUT | axum::http::Method::DELETE) {
        return Ok(next.run(request).await);
    }

    let timestamp_header = request.headers().get("X-Timestamp")
        .and_then(|v| v.to_str().ok())
        .ok_or(AppError::BadRequest("Missing X-Timestamp header".to_string()))?;
    
    let _nonce_header = request.headers().get("X-Nonce")
        .and_then(|v| v.to_str().ok())
        .ok_or(AppError::BadRequest("Missing X-Nonce header".to_string()))?;
    
    let _sign_header = request.headers().get("X-Sign")
        .and_then(|v| v.to_str().ok())
        .ok_or(AppError::BadRequest("Missing X-Sign header".to_string()))?;

    // Validate timestamp is not expired
    let timestamp: i64 = timestamp_header.parse()
        .map_err(|_| AppError::BadRequest("Invalid timestamp format".to_string()))?;
    
    if is_nonce_expired(timestamp) {
        return Err(AppError::Conflict("Request expired or replay detected".to_string()));
    }

    // TODO: When integrated with full app state:
    // 1. Verify sign using api_secret_key
    // 2. Check Redis for nonce uniqueness
    // 3. Store nonce in Redis with TTL

    Ok(next.run(request).await)
}
