use std::sync::Arc;
use axum::{
    extract::{State, Json},
    http::HeaderMap,
};
use serde_json::json;
use sqlx::PgPool;

use crate::models::payment::*;
use crate::services::{PaymentService, StripeService};
use crate::utils::{AppResult, AppError};

pub struct PaymentHandler {
    pub pool: Arc<PgPool>,
    pub jwt: Arc<crate::utils::JwtManager>,
    pub stripe: Arc<StripeService>,
}

fn extract_user_from_header(state: &PaymentHandler, headers: &HeaderMap) -> AppResult<i64> {
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
    State(state): State<Arc<PaymentHandler>>,
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
        &state.stripe,
        user_id,
        amount,
        &req.product_tier,
        req.billing_period_months,
    )
    .await?;

    Ok(Json(intent.into()))
}

/// Confirm payment and create subscription
/// DEPRECATED: Subscriptions table removed in three-tier refactor (Migration 012)
/// TODO: Replace with org_product_licenses-based payment flow
pub async fn confirm_payment(
    State(_state): State<Arc<PaymentHandler>>,
    _headers: HeaderMap,
    Json(_req): Json<ConfirmPaymentRequest>,
) -> AppResult<Json<serde_json::Value>> {
    // Subscriptions table was deleted - return error
    Err(AppError::NotImplemented("Payment subscription system deprecated. Use org-level license purchases instead.".to_string()))
}

/// Get current subscription
/// DEPRECATED: Subscriptions table removed in three-tier refactor (Migration 012)
/// Now returns user tier and license status instead
pub async fn get_subscription(
    State(state): State<Arc<PaymentHandler>>,
    headers: HeaderMap,
) -> AppResult<Json<serde_json::Value>> {
    let user_id = extract_user_from_header(&state, &headers)?;
    
    // Get user tier and license information
    #[derive(sqlx::FromRow)]
    struct UserLicenseRow {
        tier: String,
        status: String,
        free_license_count: i64,
        team_count: i64,
    }

    let user_row = sqlx::query_as::<_, UserLicenseRow>(
        r#"
        SELECT 
            u.tier,
            u.status,
            COUNT(ful.id) as free_license_count,
            COUNT(ut.team_id) as team_count
        FROM users u
        LEFT JOIN free_user_licenses ful ON u.id = ful.user_id
        LEFT JOIN user_teams ut ON u.id = ut.user_id
        WHERE u.id = $1
        GROUP BY u.id, u.tier, u.status
        "#
    )
    .bind(user_id)
    .fetch_one(&*state.pool)
    .await?;
    
    // Check if user has active org licenses through teams
    let has_org_licenses = sqlx::query_scalar::<_, bool>(
        r#"
        SELECT EXISTS(
            SELECT 1 FROM user_teams ut
            JOIN teams t ON ut.team_id = t.id
            JOIN org_product_licenses opl ON t.organization_id = opl.organization_id
            WHERE ut.user_id = $1 AND opl.expires_at > NOW()
        )
        "#,
    )
    .bind(user_id)
    .fetch_one(&*state.pool)
    .await?;
    
    Ok(Json(json!({
        "tier": user_row.tier,
        "status": user_row.status,
        "has_free_licenses": user_row.free_license_count > 0,
        "has_org_licenses": has_org_licenses,
        "team_count": user_row.team_count,
        "subscription_type": "tier_based",  // Indicate this is not a traditional subscription
        "message": "Subscription system replaced with three-tier license architecture"
    })))
}

/// Upgrade subscription tier
/// DEPRECATED: Subscriptions table removed in three-tier refactor (Migration 012)
pub async fn upgrade_tier(
    State(_state): State<Arc<PaymentHandler>>,
    _headers: HeaderMap,
    Json(_req): Json<UpgradeTierRequest>,
) -> AppResult<Json<SubscriptionResponse>> {
    Err(AppError::NotImplemented("Subscription system deprecated".to_string()))
}

/// Downgrade subscription tier
/// DEPRECATED: Subscriptions table removed in three-tier refactor (Migration 012)
pub async fn downgrade_tier(
    State(_state): State<Arc<PaymentHandler>>,
    _headers: HeaderMap,
    Json(_req): Json<UpgradeTierRequest>,
) -> AppResult<Json<SubscriptionResponse>> {
    Err(AppError::NotImplemented("Subscription system deprecated".to_string()))
}

/// Cancel subscription
/// DEPRECATED: Subscriptions table removed in three-tier refactor (Migration 012)
pub async fn cancel_subscription(
    State(_state): State<Arc<PaymentHandler>>,
    _headers: HeaderMap,
) -> AppResult<Json<serde_json::Value>> {
    Err(AppError::NotImplemented("Subscription system deprecated".to_string()))
}

/// Toggle auto-renewal
/// DEPRECATED: Subscriptions table removed in three-tier refactor (Migration 012)
pub async fn toggle_auto_renew(
    State(_state): State<Arc<PaymentHandler>>,
    _headers: HeaderMap,
    Json(_req): Json<ToggleAutoRenewRequest>,
) -> AppResult<Json<serde_json::Value>> {
    Err(AppError::NotImplemented("Subscription system deprecated".to_string()))
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
