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

/// Get user's teams and organizations (for dashboard display)
pub async fn get_user_associations(
    State(state): State<Arc<AuthHandler>>,
    headers: HeaderMap,
) -> AppResult<Json<serde_json::Value>> {
    let user_id = extract_user_from_header(&state, &headers)?;
    
    // Get user's teams
    let teams = sqlx::query_as::<_, (i64, String)>(
        r#"
        SELECT g.id, g.name FROM groups g
        JOIN user_groups ug ON g.id = ug.group_id
        WHERE ug.user_id = $1
        ORDER BY g.name ASC
        "#
    )
        .bind(user_id)
        .fetch_all(&*state.pool)
        .await?
        .into_iter()
        .map(|(id, name)| serde_json::json!({ "id": id, "name": name }))
        .collect::<Vec<_>>();

    // Get user's organizations
    let organizations = sqlx::query_as::<_, (i64, String)>(
        r#"
        SELECT DISTINCT o.id, o.name FROM organizations o
        JOIN groups g ON o.id = g.organization_id
        JOIN user_groups ug ON g.id = ug.group_id
        WHERE ug.user_id = $1
        ORDER BY o.name ASC
        "#
    )
        .bind(user_id)
        .fetch_all(&*state.pool)
        .await?
        .into_iter()
        .map(|(id, name)| serde_json::json!({ "id": id, "name": name }))
        .collect::<Vec<_>>();

    Ok(Json(serde_json::json!({
        "teams": teams,
        "organizations": organizations
    })))
}
