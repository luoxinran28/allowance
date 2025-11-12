use axum::{
    extract::{State},
    http::HeaderMap,
    response::IntoResponse,
    Json,
};
use serde_json::{json, Value};
use sqlx::PgPool;
use chrono::Utc;
use crate::services::StripeService;
use crate::utils::AppResult;
use std::sync::Arc;

#[derive(Clone)]
pub struct WebhookState {
    pub pool: Arc<PgPool>,
    pub stripe: Arc<StripeService>,
    pub webhook_secret: String,
}

/// Handle Stripe webhook events
pub async fn handle_stripe_webhook(
    State(state): State<WebhookState>,
    headers: HeaderMap,
    body: String,
) -> impl IntoResponse {
    // Extract signature from headers
    let signature = match headers.get("stripe-signature") {
        Some(sig) => match sig.to_str() {
            Ok(s) => s.to_string(),
            Err(_) => return Json(json!({"error": "Invalid signature header"})).into_response(),
        },
        None => return Json(json!({"error": "Missing stripe-signature header"})).into_response(),
    };

    // Verify webhook signature
    match state.stripe.verify_webhook_signature(
        body.as_bytes(),
        &signature,
        &state.webhook_secret,
    ) {
        Ok(true) => {}
        Ok(false) => {
            return Json(json!({"error": "Invalid signature"})).into_response();
        }
        Err(_) => {
            return Json(json!({"error": "Signature verification failed"})).into_response();
        }
    }

    // Parse webhook payload
    let payload: Value = match serde_json::from_str(&body) {
        Ok(p) => p,
        Err(_) => return Json(json!({"error": "Invalid payload"})).into_response(),
    };

    // Extract event details
    let event_type = payload["type"].as_str().unwrap_or("unknown");
    let event_id = payload["id"].as_str().unwrap_or("unknown");

    // Store webhook event
    if let Err(e) = store_webhook_event(&state.pool, event_type, event_id, &payload).await {
        tracing::error!("Failed to store webhook event: {}", e);
    }

    // Handle specific event types
    match event_type {
        "payment_intent.succeeded" => {
            if let Err(e) = handle_payment_intent_succeeded(&state.pool, &payload).await {
                tracing::error!("Failed to handle payment_intent.succeeded: {}", e);
            }
        }
        "payment_intent.payment_failed" => {
            if let Err(e) = handle_payment_intent_failed(&state.pool, &payload).await {
                tracing::error!("Failed to handle payment_intent.payment_failed: {}", e);
            }
        }
        "customer.subscription.updated" => {
            if let Err(e) = handle_subscription_updated(&state.pool, &payload).await {
                tracing::error!("Failed to handle customer.subscription.updated: {}", e);
            }
        }
        "customer.subscription.deleted" => {
            if let Err(e) = handle_subscription_deleted(&state.pool, &payload).await {
                tracing::error!("Failed to handle customer.subscription.deleted: {}", e);
            }
        }
        "invoice.paid" => {
            if let Err(e) = handle_invoice_paid(&state.pool, &payload).await {
                tracing::error!("Failed to handle invoice.paid: {}", e);
            }
        }
        _ => {
            tracing::debug!("Unhandled webhook event type: {}", event_type);
        }
    }

    Json(json!({"received": true})).into_response()
}

async fn store_webhook_event(
    pool: &PgPool,
    event_type: &str,
    event_id: &str,
    payload: &Value,
) -> AppResult<()> {
    sqlx::query(
        "INSERT INTO stripe_webhook_events (event_type, event_id, payload, created_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (event_id) DO NOTHING"
    )
    .bind(event_type)
    .bind(event_id)
    .bind(payload.to_string())
    .bind(Utc::now())
    .execute(pool)
    .await?;

    Ok(())
}

async fn handle_payment_intent_succeeded(pool: &PgPool, payload: &Value) -> AppResult<()> {
    let stripe_intent_id = payload["data"]["object"]["id"]
        .as_str()
        .unwrap_or("unknown");
    
    let metadata = &payload["data"]["object"]["metadata"];
    let user_id = metadata["user_id"]
        .as_str()
        .and_then(|s| s.parse::<i64>().ok())
        .unwrap_or(0);

    // Update payment intent status
    sqlx::query(
        "UPDATE payment_intents SET status = $1, updated_at = $2 
         WHERE stripe_intent_id = $3"
    )
    .bind("succeeded")
    .bind(Utc::now())
    .bind(stripe_intent_id)
    .execute(pool)
    .await?;

    tracing::info!("Payment succeeded for user {}", user_id);
    Ok(())
}

async fn handle_payment_intent_failed(pool: &PgPool, payload: &Value) -> AppResult<()> {
    let stripe_intent_id = payload["data"]["object"]["id"]
        .as_str()
        .unwrap_or("unknown");

    sqlx::query(
        "UPDATE payment_intents SET status = $1, updated_at = $2 
         WHERE stripe_intent_id = $3"
    )
    .bind("failed")
    .bind(Utc::now())
    .bind(stripe_intent_id)
    .execute(pool)
    .await?;

    tracing::warn!("Payment failed for intent {}", stripe_intent_id);
    Ok(())
}

async fn handle_subscription_updated(pool: &PgPool, payload: &Value) -> AppResult<()> {
    let stripe_subscription_id = payload["data"]["object"]["id"]
        .as_str()
        .unwrap_or("unknown");
    
    let status = payload["data"]["object"]["status"]
        .as_str()
        .unwrap_or("active");

    sqlx::query(
        "UPDATE subscriptions SET status = $1, updated_at = $2 
         WHERE stripe_subscription_id = $3"
    )
    .bind(status)
    .bind(Utc::now())
    .bind(stripe_subscription_id)
    .execute(pool)
    .await?;

    tracing::info!("Subscription updated: {} -> {}", stripe_subscription_id, status);
    Ok(())
}

async fn handle_subscription_deleted(pool: &PgPool, payload: &Value) -> AppResult<()> {
    let stripe_subscription_id = payload["data"]["object"]["id"]
        .as_str()
        .unwrap_or("unknown");

    sqlx::query(
        "UPDATE subscriptions SET status = $1, updated_at = $2 
         WHERE stripe_subscription_id = $3"
    )
    .bind("canceled")
    .bind(Utc::now())
    .bind(stripe_subscription_id)
    .execute(pool)
    .await?;

    tracing::info!("Subscription deleted: {}", stripe_subscription_id);
    Ok(())
}

async fn handle_invoice_paid(pool: &PgPool, payload: &Value) -> AppResult<()> {
    let stripe_invoice_id = payload["data"]["object"]["id"]
        .as_str()
        .unwrap_or("unknown");

    sqlx::query(
        "UPDATE invoices SET status = $1, paid_date = $2 
         WHERE stripe_invoice_id = $3"
    )
    .bind("paid")
    .bind(Utc::now())
    .bind(stripe_invoice_id)
    .execute(pool)
    .await?;

    tracing::info!("Invoice paid: {}", stripe_invoice_id);
    Ok(())
}
