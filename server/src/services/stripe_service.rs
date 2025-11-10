use stripe::{
    CreatePaymentIntent, CreatePaymentIntentMandateData, CreatePaymentIntentOffSession,
    CreateSetupIntent, PaymentIntent, SetupIntent, Client,
};
use chrono::Utc;
use uuid::Uuid;
use crate::{AppResult, models::payment::PaymentIntent as DbPaymentIntent};
use sqlx::PgPool;

#[derive(Clone)]
pub struct StripeService {
    client: Client,
    test_mode: bool,
}

impl StripeService {
    pub fn new(api_key: String, test_mode: bool) -> Self {
        StripeService {
            client: Client::new(api_key),
            test_mode,
        }
    }

    /// Create a payment intent in Stripe
    pub async fn create_payment_intent(
        &self,
        amount_cents: i64,
        user_id: i64,
        tier: &str,
    ) -> AppResult<stripe::PaymentIntent> {
        let mut params = CreatePaymentIntent::new(amount_cents, stripe::Currency::USD);
        params.metadata = Some(std::collections::HashMap::from([
            ("user_id".to_string(), user_id.to_string()),
            ("tier".to_string(), tier.to_string()),
        ]));
        
        if self.test_mode {
            // Use test payment method in test mode
            params.payment_method = Some("pm_card_visa".to_string());
            params.off_session = Some(CreatePaymentIntentOffSession::False);
        }

        let payment_intent = stripe::PaymentIntent::create(&self.client, params).await?;
        Ok(payment_intent)
    }

    /// Confirm a payment intent
    pub async fn confirm_payment(&self, intent_id: &str, payment_method: Option<&str>) -> AppResult<stripe::PaymentIntent> {
        let object_id = stripe::PaymentIntentId::from_str(intent_id)?;
        let mut params = stripe::ConfirmPaymentIntent::new();
        
        if let Some(pm) = payment_method {
            params.payment_method = Some(pm.to_string());
        }

        let payment_intent = stripe::PaymentIntent::confirm(&self.client, &object_id, params).await?;
        Ok(payment_intent)
    }

    /// Retrieve a payment intent
    pub async fn get_payment_intent(&self, intent_id: &str) -> AppResult<stripe::PaymentIntent> {
        let object_id = stripe::PaymentIntentId::from_str(intent_id)?;
        let payment_intent = stripe::PaymentIntent::retrieve(&self.client, &object_id, None).await?;
        Ok(payment_intent)
    }

    /// Create a setup intent for recurring payments
    pub async fn create_setup_intent(&self, user_id: i64) -> AppResult<stripe::SetupIntent> {
        let mut params = CreateSetupIntent::new();
        params.metadata = Some(std::collections::HashMap::from([
            ("user_id".to_string(), user_id.to_string()),
        ]));

        let setup_intent = stripe::SetupIntent::create(&self.client, params).await?;
        Ok(setup_intent)
    }

    /// Verify webhook signature
    pub fn verify_webhook_signature(
        &self,
        payload: &[u8],
        signature: &str,
        secret: &str,
    ) -> AppResult<bool> {
        // Stripe webhook signature verification
        // Format: t=timestamp,v1=signature
        let parts: Vec<&str> = signature.split(',').collect();
        let mut timestamp = "";
        let mut signatures = Vec::new();

        for part in parts {
            if part.starts_with("t=") {
                timestamp = &part[2..];
            } else if part.starts_with("v1=") {
                signatures.push(&part[3..]);
            }
        }

        if timestamp.is_empty() || signatures.is_empty() {
            return Ok(false);
        }

        // Create signed content
        let signed_content = format!("{}.{}", timestamp, String::from_utf8_lossy(payload));
        
        // Verify signature using HMAC-SHA256
        use sha2::{Sha256, Mac};
        use hmac::Hmac;

        let mut mac = Hmac::<Sha256>::new_from_slice(secret.as_bytes())?;
        mac.update(signed_content.as_bytes());
        let result = mac.finalize();
        let code_bytes = result.into_bytes();
        let computed_sig = hex::encode(code_bytes);

        Ok(signatures.iter().any(|&sig| sig == computed_sig))
    }
}

// Add necessary imports
use std::str::FromStr;
use sha2::Mac;
