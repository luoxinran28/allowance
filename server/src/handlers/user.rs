use std::sync::Arc;
use axum::{
    extract::{State, Json},
};

use crate::models::UserResponse;
use crate::services::AuthService;
use crate::utils::AppResult;
use crate::handlers::auth::AuthHandler;

/// Get user profile
pub async fn get_profile(
    State(state): State<Arc<AuthHandler>>,
) -> AppResult<Json<UserResponse>> {
    // TODO: Extract user_id from JWT token in request
    let user_id = 1i64; // Placeholder - will be extracted from auth middleware
    
    let user = AuthService::get_user_by_id(&state.pool, user_id).await?;
    Ok(Json(UserResponse::from(user)))
}

/// Update user profile
pub async fn update_profile(
    State(state): State<Arc<AuthHandler>>,
    Json(_payload): Json<serde_json::Value>,
) -> AppResult<Json<UserResponse>> {
    // TODO: Extract user_id from JWT token in request
    let user_id = 1i64; // Placeholder - will be extracted from auth middleware
    
    // TODO: Implement profile update logic
    let user = AuthService::get_user_by_id(&state.pool, user_id).await?;
    Ok(Json(UserResponse::from(user)))
}

/// Get user licenses
pub async fn get_licenses(
    State(state): State<Arc<AuthHandler>>,
) -> AppResult<Json<serde_json::Value>> {
    // TODO: Extract user_id from JWT token in request
    let user_id = 1i64; // Placeholder - will be extracted from auth middleware
    
    let licenses = crate::services::LicenseService::get_user_licenses(&state.pool, user_id).await?;
    Ok(Json(serde_json::to_value(licenses)?))
}
