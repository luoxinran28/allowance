use dotenvy::dotenv;
use std::env;

#[derive(Clone)]
pub struct Config {
    pub server_host: String,
    pub server_port: u16,
    pub database_url: String,
    pub jwt_secret: String,
    pub jwt_expiration_hours: i64,
    pub refresh_token_expiration_days: i64,
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

        let jwt_secret = match env::var("JWT_SECRET") {
            Ok(val) => {
                eprintln!("JWT_SECRET found: {}", val);
                val
            }
            Err(e) => {
                eprintln!("JWT_SECRET not found: {}", e);
                panic!("JWT_SECRET not set");
            }
        };

        Config {
            server_host: "0.0.0.0".to_string(),
            server_port: 4040,
            database_url,
            jwt_secret,
            jwt_expiration_hours: 24,
            refresh_token_expiration_days: 7,
            stripe_api_key: "sk_test_placeholder".to_string(),
            stripe_webhook_secret: "whsec_test_placeholder".to_string(),
            stripe_test_mode: true,
        }
    }
}
