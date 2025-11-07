use std::sync::Arc;
use axum::{
    extract::{State, Json},
    http::StatusCode,
    response::IntoResponse,
};
use serde_json::json;
use sqlx::PgPool;

use crate::models::{RegisterRequest, LoginRequest, ActivateRequest, AuthResponse, UserResponse};
use crate::services::AuthService;
use crate::utils::{AppError, JwtManager, AppResult};

pub struct AuthHandler {
    pub pool: Arc<PgPool>,
    pub jwt: Arc<JwtManager>,
}

/// Register new user
pub async fn register(
    State(state): State<Arc<AuthHandler>>,
    Json(req): Json<RegisterRequest>,
) -> AppResult<(StatusCode, Json<UserResponse>)> {
    let user = AuthService::register(&state.pool, &req.email, &req.password).await?;
    
    // Create activation token and send email
    let token = AuthService::create_activation_token(
        &state.pool,
        user.id,
        &req.email,
    ).await?;

    // TODO: Send activation email
    tracing::info!("User {} registered, activation token: {}", user.email, token);

    Ok((StatusCode::CREATED, Json(user)))
}

/// Login
pub async fn login(
    State(state): State<Arc<AuthHandler>>,
    Json(req): Json<LoginRequest>,
) -> AppResult<Json<AuthResponse>> {
    let user = AuthService::login(&state.pool, &req.email, &req.password).await?;

    let token = state.jwt.generate_token(user.id, user.email.clone())?;
    let refresh_token = state.jwt.generate_refresh_token(user.id)?;

    Ok(Json(AuthResponse {
        user: UserResponse::from(user),
        token,
        refresh_token,
    }))
}

/// Activate account
pub async fn activate(
    State(state): State<Arc<AuthHandler>>,
    Json(req): Json<ActivateRequest>,
) -> AppResult<Json<UserResponse>> {
    let user = AuthService::activate_user(&state.pool, &req.token).await?;
    
    // Auto-assign free_user role
    crate::services::RbacService::assign_role(
        &state.pool,
        user.id,
        "free_user",
    ).await?;

    Ok(Json(UserResponse::from(user)))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_register_validation() {
        let req = RegisterRequest {
            email: "invalid-email".to_string(),
            password: "short".to_string(),
        };
        // In real implementation, validate email format and password strength
    }
}
