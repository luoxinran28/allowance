use chrono::{DateTime, Utc, Duration};
use sqlx::PgPool;
use crate::utils::{AppResult, AppError};
use crate::services::stripe_service::StripeService;
use crate::models::payment::{PaymentIntent, Subscription, Invoice};
use uuid::Uuid;

pub struct PaymentService;

impl PaymentService {
    /// Create a new payment intent with Stripe integration
    pub async fn create_payment_intent(
        pool: &PgPool,
        stripe: &StripeService,
        user_id: i64,
        amount: i64,
        product_tier: &str,
        billing_period_months: i32,
    ) -> AppResult<PaymentIntent> {
        // Create Stripe payment intent
        let stripe_intent = stripe.create_payment_intent(amount, user_id, product_tier).await?;
        
        let intent_id = format!("pi_{}", Uuid::new_v4().to_string()[..12].to_string());
        
        let payment = sqlx::query_as::<_, PaymentIntent>(
            "INSERT INTO payment_intents (id, user_id, amount, currency, status, product_tier, billing_period_months, stripe_intent_id, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9) RETURNING *"
        )
        .bind(&intent_id)
        .bind(user_id)
        .bind(amount)
        .bind("USD")
        .bind("pending")
        .bind(product_tier)
        .bind(billing_period_months)
        .bind(stripe_intent.id.to_string())
        .bind(Utc::now())
        .fetch_one(pool)
        .await?;
        
        Ok(payment)
    }

    /// Confirm payment with Stripe
    pub async fn confirm_payment(
        pool: &PgPool,
        stripe: &StripeService,
        intent_id: &str,
        payment_method: Option<&str>,
    ) -> AppResult<PaymentIntent> {
        let payment = sqlx::query_as::<_, PaymentIntent>(
            "SELECT * FROM payment_intents WHERE id = $1"
        )
        .bind(intent_id)
        .fetch_optional(pool)
        .await?
        .ok_or(AppError::NotFound("Payment intent not found".to_string()))?;

        // Confirm with Stripe
        if let Some(stripe_intent_id) = &payment.stripe_intent_id {
            let _stripe_payment = stripe.confirm_payment(stripe_intent_id, payment_method).await?;
        }

        let updated = sqlx::query_as::<_, PaymentIntent>(
            "UPDATE payment_intents SET status = $1, updated_at = $2 
             WHERE id = $3 RETURNING *"
        )
        .bind("succeeded")
        .bind(Utc::now())
        .bind(intent_id)
        .fetch_one(pool)
        .await?;

        Ok(updated)
    }

    /// Create subscription after successful payment
    pub async fn create_subscription(
        pool: &PgPool,
        user_id: i64,
        tier: &str,
        billing_period_months: i32,
    ) -> AppResult<Subscription> {
        let now = Utc::now();
        let end_date = now + Duration::days((billing_period_months as i64) * 30);

        let subscription = sqlx::query_as::<_, Subscription>(
            "INSERT INTO subscriptions (user_id, tier, status, current_period_start, current_period_end, auto_renew, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $7) RETURNING *"
        )
        .bind(user_id)
        .bind(tier)
        .bind("active")
        .bind(now)
        .bind(end_date)
        .bind(true)  // auto-renew enabled by default
        .bind(now)
        .fetch_one(pool)
        .await?;

        Ok(subscription)
    }

    /// Get active subscription for user
    pub async fn get_active_subscription(
        pool: &PgPool,
        user_id: i64,
    ) -> AppResult<Option<Subscription>> {
        let subscription = sqlx::query_as::<_, Subscription>(
            "SELECT * FROM subscriptions WHERE user_id = $1 AND status = $2 
             ORDER BY created_at DESC LIMIT 1"
        )
        .bind(user_id)
        .bind("active")
        .fetch_optional(pool)
        .await?;

        Ok(subscription)
    }

    /// Upgrade subscription tier
    pub async fn upgrade_tier(
        pool: &PgPool,
        user_id: i64,
        new_tier: &str,
    ) -> AppResult<Subscription> {
        let mut tx = pool.begin().await?;

        // Get current subscription
        let current = sqlx::query_as::<_, Subscription>(
            "SELECT * FROM subscriptions WHERE user_id = $1 AND status = $2 
             ORDER BY created_at DESC LIMIT 1 FOR UPDATE"
        )
        .bind(user_id)
        .bind("active")
        .fetch_optional(&mut *tx)
        .await?
        .ok_or(AppError::NotFound("Subscription not found".to_string()))?;

        // Cancel current subscription
        sqlx::query("UPDATE subscriptions SET status = $1, updated_at = $2 WHERE id = $3")
            .bind("canceled")
            .bind(Utc::now())
            .bind(current.id)
            .execute(&mut *tx)
            .await?;

        // Calculate remaining days
        let now = Utc::now();
        let remaining_days = (current.current_period_end - now).num_days();
        let remaining_months = (remaining_days as f64 / 30.0).ceil() as i32;

        // Create new subscription with remaining period
        let new_subscription = sqlx::query_as::<_, Subscription>(
            "INSERT INTO subscriptions (user_id, tier, status, current_period_start, current_period_end, auto_renew, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $7) RETURNING *"
        )
        .bind(user_id)
        .bind(new_tier)
        .bind("active")
        .bind(now)
        .bind(current.current_period_end)  // Keep same end date
        .bind(current.auto_renew)
        .bind(now)
        .fetch_one(&mut *tx)
        .await?;

        // Update user tier
        sqlx::query("UPDATE users SET tier = $1, updated_at = $2 WHERE id = $3")
            .bind(new_tier)
            .bind(now)
            .bind(user_id)
            .execute(&mut *tx)
            .await?;

        tx.commit().await?;
        Ok(new_subscription)
    }

    /// Downgrade subscription tier
    pub async fn downgrade_tier(
        pool: &PgPool,
        user_id: i64,
        new_tier: &str,
    ) -> AppResult<Subscription> {
        let mut tx = pool.begin().await?;

        // Get current subscription
        let current = sqlx::query_as::<_, Subscription>(
            "SELECT * FROM subscriptions WHERE user_id = $1 AND status = $2 
             ORDER BY created_at DESC LIMIT 1 FOR UPDATE"
        )
        .bind(user_id)
        .bind("active")
        .fetch_optional(&mut *tx)
        .await?
        .ok_or(AppError::NotFound("Subscription not found".to_string()))?;

        // Schedule downgrade for next billing period
        sqlx::query("UPDATE subscriptions SET tier = $1, updated_at = $2 WHERE id = $3")
            .bind(new_tier)
            .bind(Utc::now())
            .bind(current.id)
            .execute(&mut *tx)
            .await?;

        let updated = sqlx::query_as::<_, Subscription>(
            "SELECT * FROM subscriptions WHERE id = $1"
        )
        .bind(current.id)
        .fetch_one(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok(updated)
    }

    /// Cancel subscription
    pub async fn cancel_subscription(
        pool: &PgPool,
        user_id: i64,
    ) -> AppResult<Subscription> {
        let subscription = sqlx::query_as::<_, Subscription>(
            "UPDATE subscriptions SET status = $1, auto_renew = $2, updated_at = $3 
             WHERE user_id = $4 AND status = $5 RETURNING *"
        )
        .bind("canceled")
        .bind(false)
        .bind(Utc::now())
        .bind(user_id)
        .bind("active")
        .fetch_optional(pool)
        .await?
        .ok_or(AppError::NotFound("Subscription not found".to_string()))?;

        Ok(subscription)
    }

    /// Auto-renew subscriptions that are expiring
    pub async fn auto_renew_expiring_subscriptions(pool: &PgPool) -> AppResult<u64> {
        let now = Utc::now();
        let renewal_window = now + Duration::days(7);  // Renew subscriptions expiring in next 7 days

        let result = sqlx::query(
            "UPDATE subscriptions 
             SET current_period_start = $1, 
                 current_period_end = $2,
                 updated_at = $1
             WHERE status = $3 AND auto_renew = $4 
             AND current_period_end BETWEEN $5 AND $6"
        )
        .bind(now)
        .bind(now + Duration::days(30))
        .bind("active")
        .bind(true)
        .bind(now)
        .bind(renewal_window)
        .execute(pool)
        .await?;

        Ok(result.rows_affected())
    }

    /// Create invoice for subscription
    pub async fn create_invoice(
        pool: &PgPool,
        user_id: i64,
        subscription_id: i64,
        amount: i64,
    ) -> AppResult<Invoice> {
        let due_date = Utc::now() + Duration::days(30);

        let invoice = sqlx::query_as::<_, Invoice>(
            "INSERT INTO invoices (user_id, subscription_id, amount, status, due_date, created_at)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *"
        )
        .bind(user_id)
        .bind(subscription_id)
        .bind(amount)
        .bind("draft")
        .bind(due_date)
        .bind(Utc::now())
        .fetch_one(pool)
        .await?;

        Ok(invoice)
    }

    /// Mark invoice as paid
    pub async fn mark_invoice_paid(
        pool: &PgPool,
        invoice_id: i64,
    ) -> AppResult<Invoice> {
        let invoice = sqlx::query_as::<_, Invoice>(
            "UPDATE invoices SET status = $1, paid_date = $2 WHERE id = $3 RETURNING *"
        )
        .bind("paid")
        .bind(Utc::now())
        .bind(invoice_id)
        .fetch_optional(pool)
        .await?
        .ok_or(AppError::NotFound("Invoice not found".to_string()))?;

        Ok(invoice)
    }

    /// Get pricing information
    pub async fn get_pricing() -> AppResult<Vec<(String, i64, String)>> {
        Ok(vec![
            ("free".to_string(), 0, "Free forever".to_string()),
            ("pro".to_string(), 999, "Pro tier - $9.99/month".to_string()),
            ("enterprise".to_string(), 2999, "Enterprise - $29.99/month".to_string()),
        ])
    }
}
