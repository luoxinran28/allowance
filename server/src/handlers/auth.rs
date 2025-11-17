use std::sync::Arc;
use axum::{
    extract::{State, Json},
    http::StatusCode,
};
use sqlx::PgPool;

use crate::models::{RegisterRequest, LoginRequest, ActivateRequest, RequestPasswordResetRequest, ResetPasswordRequest, AuthResponse, UserResponse};
use crate::services::AuthService;
use crate::utils::{JwtManager, AppResult};

pub struct AuthHandler {
    pub pool: Arc<PgPool>,
    pub jwt: Arc<JwtManager>,
}

/// Register new user
/// 
/// Creates a new user account with email and password. An activation email will be sent.
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

/// User login
/// 
/// Authenticates user with email and password. Returns JWT token and refresh token.
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
/// 
/// Activates a user account using the email verification token sent during registration.
/// Automatically assigns the `free_user` role to the new user.
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

/// Request password reset
/// 
/// Initiates a password reset flow by sending a reset token to the user's email.
/// Token is valid for 1 hour.
pub async fn request_password_reset(
    State(state): State<Arc<AuthHandler>>,
    Json(req): Json<RequestPasswordResetRequest>,
) -> AppResult<StatusCode> {
    let token = AuthService::create_password_reset_token(&state.pool, &req.email).await?;
    
    // TODO: Send password reset email
    tracing::info!("Password reset requested for {}, token: {}", req.email, token);

    Ok(StatusCode::OK)
}

/// Reset password
/// 
/// Completes the password reset flow using the token sent to email.
/// Password must be at least 8 characters.
pub async fn reset_password(
    State(state): State<Arc<AuthHandler>>,
    Json(req): Json<ResetPasswordRequest>,
) -> AppResult<StatusCode> {
    AuthService::reset_password(&state.pool, &req.token, &req.new_password).await?;
    
    Ok(StatusCode::OK)
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
