use dotenvy::dotenv;
use std::env;

#[derive(Clone)]
pub struct Config {
    pub server_host: String,
    pub server_port: u16,
    pub database_url: String,
    /// JWT token lifetime in hours (applies to all products)
    pub jwt_expiration_hours: i64,
    pub refresh_token_expiration_days: i64,
    /// HMAC-SHA256 key for Allowance frontend nonce signing (internal use only)
    pub api_secret_key: String,
    pub stripe_api_key: String,
    pub stripe_webhook_secret: String,
    pub stripe_test_mode: bool,
}

impl Config {
    pub fn from_env() -> Self {
        dotenv().ok();

        let database_url = match env::var("DATABASE_URL") {
            Ok(val) => {
                eprintln!("DATABASE_URL found: {}", val);
                val
            }
            Err(e) => {
                eprintln!("DATABASE_URL not found: {}", e);
                panic!("DATABASE_URL not set");
            }
        };

        // JWT_SECRET is no longer needed in env — signing keys are per-product in DB.
        // If JWT_SECRET is still set in .env, log a deprecation warning.
        if env::var("JWT_SECRET").is_ok() {
            eprintln!("⚠️  DEPRECATION: JWT_SECRET in .env is ignored. JWT signing keys are now per-product in the database.");
        }

        let api_secret_key = match env::var("API_SECRET") {
            Ok(val) => {
                eprintln!("API_SECRET found");
                val
            }
            Err(e) => {
                eprintln!("API_SECRET not found: {}, this is required for nonce signing", e);
                panic!("API_SECRET not set");
            }
        };

        Config {
            server_host: "0.0.0.0".to_string(),
            server_port: 4040,
            database_url,
            jwt_expiration_hours: 24,
            refresh_token_expiration_days: 7,
            api_secret_key,
            stripe_api_key: "sk_test_placeholder".to_string(),
            stripe_webhook_secret: "whsec_test_placeholder".to_string(),
            stripe_test_mode: true,
        }
    }
}
