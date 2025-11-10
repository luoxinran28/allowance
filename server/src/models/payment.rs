use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct PaymentIntent {
    pub id: String,
    pub user_id: i64,
    pub amount: i64,
    pub currency: String,
    pub status: String,  // pending, succeeded, failed
    pub product_tier: String,
    pub billing_period_months: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PaymentIntentResponse {
    pub id: String,
    pub status: String,
    pub amount: i64,
    pub product_tier: String,
}

impl From<PaymentIntent> for PaymentIntentResponse {
    fn from(p: PaymentIntent) -> Self {
        PaymentIntentResponse {
            id: p.id,
            status: p.status,
            amount: p.amount,
            product_tier: p.product_tier,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Subscription {
    pub id: i64,
    pub user_id: i64,
    pub tier: String,
    pub status: String,
    pub current_period_start: DateTime<Utc>,
    pub current_period_end: DateTime<Utc>,
    pub auto_renew: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SubscriptionResponse {
    pub id: i64,
    pub tier: String,
    pub status: String,
    pub current_period_end: DateTime<Utc>,
    pub auto_renew: bool,
}

impl From<Subscription> for SubscriptionResponse {
    fn from(s: Subscription) -> Self {
        SubscriptionResponse {
            id: s.id,
            tier: s.tier,
            status: s.status,
            current_period_end: s.current_period_end,
            auto_renew: s.auto_renew,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Invoice {
    pub id: i64,
    pub user_id: i64,
    pub subscription_id: i64,
    pub amount: i64,
    pub status: String,
    pub due_date: DateTime<Utc>,
    pub paid_date: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct InvoiceResponse {
    pub id: i64,
    pub amount: i64,
    pub status: String,
    pub due_date: DateTime<Utc>,
}

impl From<Invoice> for InvoiceResponse {
    fn from(i: Invoice) -> Self {
        InvoiceResponse {
            id: i.id,
            amount: i.amount,
            status: i.status,
            due_date: i.due_date,
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct CreatePaymentIntentRequest {
    pub product_tier: String,
    pub billing_period_months: i32,
}

#[derive(Debug, Deserialize)]
pub struct ConfirmPaymentRequest {
    pub intent_id: String,
}

#[derive(Debug, Deserialize)]
pub struct UpgradeTierRequest {
    pub new_tier: String,
}

#[derive(Debug, Deserialize)]
pub struct ToggleAutoRenewRequest {
    pub auto_renew: bool,
}
