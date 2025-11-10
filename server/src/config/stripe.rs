use crate::AppResult;
use stripe::Client;

#[derive(Clone, Debug)]
pub struct StripeConfig {
    pub api_key: String,
    pub webhook_secret: String,
    pub test_mode: bool,
}

impl StripeConfig {
    pub fn from_env() -> AppResult<Self> {
        let api_key = std::env::var("STRIPE_API_KEY")
            .unwrap_or_else(|_| "sk_test_placeholder".to_string());
        
        let webhook_secret = std::env::var("STRIPE_WEBHOOK_SECRET")
            .unwrap_or_else(|_| "whsec_test_placeholder".to_string());
        
        let test_mode = std::env::var("STRIPE_TEST_MODE")
            .unwrap_or_else(|_| "true".to_string())
            .parse::<bool>()
            .unwrap_or(true);

        Ok(StripeConfig {
            api_key,
            webhook_secret,
            test_mode,
        })
    }

    pub fn client(&self) -> Client {
        Client::new(self.api_key.clone())
    }
}
