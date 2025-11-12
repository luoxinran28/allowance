use std::sync::Arc;
use axum::{
    extract::{State, Json, Path},
    http::HeaderMap,
};
use serde_json::json;

use crate::models::payment::*;
use crate::services::PaymentService;
use crate::utils::{AppResult, AppError};
use crate::handlers::auth::AuthHandler;

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

/// Create a payment intent for subscription upgrade
pub async fn create_payment_intent(
    State(state): State<Arc<AuthHandler>>,
    headers: HeaderMap,
    Json(req): Json<CreatePaymentIntentRequest>,
) -> AppResult<Json<PaymentIntentResponse>> {
    let user_id = extract_user_from_header(&state, &headers)?;

    // Get pricing for tier
    let (amount, _) = match req.product_tier.as_str() {
        "pro" => (999, "Pro tier"),
        "enterprise" => (2999, "Enterprise tier"),
        _ => return Err(AppError::InvalidRequest("Invalid tier".to_string())),
    };

    let intent = PaymentService::create_payment_intent(
        &state.pool,
        user_id,
        amount,
        &req.product_tier,
        req.billing_period_months,
    )
    .await?;

    Ok(Json(intent.into()))
}

/// Confirm payment and create subscription
pub async fn confirm_payment(
    State(state): State<Arc<AuthHandler>>,
    headers: HeaderMap,
    Json(req): Json<ConfirmPaymentRequest>,
) -> AppResult<Json<serde_json::Value>> {
    let user_id = extract_user_from_header(&state, &headers)?;

    // Confirm payment intent
    let payment = PaymentService::confirm_payment(&state.pool, &req.intent_id).await?;

    // Create subscription
    let subscription = PaymentService::create_subscription(
        &state.pool,
        user_id,
        &payment.product_tier,
        payment.billing_period_months,
    )
    .await?;

    // Update user tier
    sqlx::query("UPDATE users SET tier = $1 WHERE id = $2")
        .bind(&payment.product_tier)
        .bind(user_id)
        .execute(&*state.pool)
        .await?;

    Ok(Json(json!({
        "success": true,
        "subscription": SubscriptionResponse::from(subscription)
    })))
}

/// Get current subscription
pub async fn get_subscription(
    State(state): State<Arc<AuthHandler>>,
    headers: HeaderMap,
) -> AppResult<Json<serde_json::Value>> {
    let user_id = extract_user_from_header(&state, &headers)?;

    match PaymentService::get_active_subscription(&state.pool, user_id).await? {
        Some(sub) => Ok(Json(json!({
            "subscription": SubscriptionResponse::from(sub)
        }))),
        None => Ok(Json(json!({
            "subscription": null
        }))),
    }
}

/// Upgrade subscription tier
pub async fn upgrade_tier(
    State(state): State<Arc<AuthHandler>>,
    headers: HeaderMap,
    Json(req): Json<UpgradeTierRequest>,
) -> AppResult<Json<SubscriptionResponse>> {
    let user_id = extract_user_from_header(&state, &headers)?;

    let subscription = PaymentService::upgrade_tier(&state.pool, user_id, &req.new_tier).await?;

    Ok(Json(subscription.into()))
}

/// Downgrade subscription tier
pub async fn downgrade_tier(
    State(state): State<Arc<AuthHandler>>,
    headers: HeaderMap,
    Json(req): Json<UpgradeTierRequest>,
) -> AppResult<Json<SubscriptionResponse>> {
    let user_id = extract_user_from_header(&state, &headers)?;

    let subscription = PaymentService::downgrade_tier(&state.pool, user_id, &req.new_tier).await?;

    Ok(Json(subscription.into()))
}

/// Cancel subscription
pub async fn cancel_subscription(
    State(state): State<Arc<AuthHandler>>,
    headers: HeaderMap,
) -> AppResult<Json<serde_json::Value>> {
    let user_id = extract_user_from_header(&state, &headers)?;

    PaymentService::cancel_subscription(&state.pool, user_id).await?;

    Ok(Json(json!({"success": true})))
}

/// Toggle auto-renewal
pub async fn toggle_auto_renew(
    State(state): State<Arc<AuthHandler>>,
    headers: HeaderMap,
    Json(req): Json<ToggleAutoRenewRequest>,
) -> AppResult<Json<serde_json::Value>> {
    let user_id = extract_user_from_header(&state, &headers)?;

    sqlx::query(
        "UPDATE subscriptions SET auto_renew = $1 WHERE user_id = $2 AND status = $3"
    )
    .bind(req.auto_renew)
    .bind(user_id)
    .bind("active")
    .execute(&*state.pool)
    .await?;

    Ok(Json(json!({"success": true})))
}

/// Get pricing information
pub async fn get_pricing() -> AppResult<Json<serde_json::Value>> {
    let pricing = PaymentService::get_pricing().await?;

    let tiers: Vec<_> = pricing
        .iter()
        .map(|(tier, amount, description)| {
            json!({
                "tier": tier,
                "amount": amount,
                "description": description
            })
        })
        .collect();

    Ok(Json(json!({"tiers": tiers})))
}
