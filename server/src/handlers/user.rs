use std::sync::Arc;
use axum::{
    extract::{State, Json},
    http::HeaderMap,
};

use crate::models::UserResponse;
use crate::services::AuthService;
use crate::utils::{AppResult, AppError};
use crate::handlers::auth::AuthHandler;

/// Helper to extract user_id from Authorization header
fn extract_user_from_header(state: &AuthHandler, headers: &HeaderMap) -> AppResult<i64> {
    let auth_header = headers
        .get("authorization")
        .and_then(|h| h.to_str().ok())
        .ok_or(AppError::Unauthorized)?;

    if !auth_header.starts_with("Bearer ") {
        return Err(AppError::Unauthorized);
    }

    let token = &auth_header[7..];
    let claims = state.jwt.verify_token(token)?;
    Ok(claims.user_id)
}

/// Get user profile
pub async fn get_profile(
    State(state): State<Arc<AuthHandler>>,
    headers: HeaderMap,
) -> AppResult<Json<UserResponse>> {
    let user_id = extract_user_from_header(&state, &headers)?;
    
    let user = AuthService::get_user_by_id(&state.pool, user_id).await?;
    Ok(Json(UserResponse::from(user)))
}

#[derive(serde::Deserialize)]
pub struct UpdateProfileRequest {
    pub email: Option<String>,
    pub tier: Option<String>,
}

/// Update user profile
pub async fn update_profile(
    State(state): State<Arc<AuthHandler>>,
    headers: HeaderMap,
    Json(_payload): Json<UpdateProfileRequest>,
) -> AppResult<Json<UserResponse>> {
    let user_id = extract_user_from_header(&state, &headers)?;
    
    // TODO: Implement database update logic
    // For now, just return the current user
    let user = AuthService::get_user_by_id(&state.pool, user_id).await?;
    Ok(Json(UserResponse::from(user)))
}

/// Get user licenses
pub async fn get_licenses(
    State(state): State<Arc<AuthHandler>>,
    headers: HeaderMap,
) -> AppResult<Json<serde_json::Value>> {
    let user_id = extract_user_from_header(&state, &headers)?;
    
    let licenses = crate::services::ProductService::get_user_licenses(&state.pool, user_id).await?;
    Ok(Json(serde_json::to_value(licenses)?))
}
