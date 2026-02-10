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
/// Creates a new user account with email and password. User is auto-activated.
/// The `product_slug` field identifies which product the user is registering from (e.g. "kwongfu").
/// Returns user info with effective_tier set to "free" for new registrations.
pub async fn register(
    State(state): State<Arc<AuthHandler>>,
    Json(req): Json<RegisterRequest>,
) -> AppResult<(StatusCode, Json<UserResponse>)> {
    let user = AuthService::register(&state.pool, &req.email, &req.password, &req.product_slug).await?;
    
    tracing::info!("User {} registered successfully", user.email);

    // New users always start with "free" effective tier
    let mut response = user;
    response.effective_tier = Some("free".to_string());

    Ok((StatusCode::CREATED, Json(response)))
}

/// User login
/// 
/// Authenticates user with email and password. Returns JWT token and refresh token.
/// If `product_slug` is provided (e.g. "kwongfu"), validates that the user has access
/// to the product and returns the product-specific tier in `effective_tier` field.
pub async fn login(
    State(state): State<Arc<AuthHandler>>,
    Json(req): Json<LoginRequest>,
) -> AppResult<Json<AuthResponse>> {
    let user = if let Some(slug) = &req.product_slug {
        AuthService::login_with_product_slug(&state.pool, &req.email, &req.password, slug).await?
    } else {
        AuthService::login(&state.pool, &req.email, &req.password).await?
    };

    // Determine effective tier based on product context or stored tier
    let effective_tier = AuthService::determine_user_tier(
        &state.pool,
        &user,
        req.product_slug.as_deref(),
    ).await;

    let token = state.jwt.generate_token(user.id, user.email.clone())?;
    let refresh_token = state.jwt.generate_refresh_token(user.id)?;

    let mut user_response = UserResponse::from(user);
    user_response.effective_tier = Some(effective_tier);

    Ok(Json(AuthResponse {
        user: user_response,
        token,
        refresh_token,
    }))
}

/// Activate account
/// 
/// Activates a user account using the email verification token sent during registration.
pub async fn activate(
    State(state): State<Arc<AuthHandler>>,
    Json(req): Json<ActivateRequest>,
) -> AppResult<Json<UserResponse>> {
    let user = AuthService::activate_user(&state.pool, &req.token).await?;

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
    mod tests {    #[tokio::test]
    async fn test_register_validation() {
        // In real implementation, validate email format and password strength
    }
}
