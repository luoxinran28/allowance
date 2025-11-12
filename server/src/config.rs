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
    pub smtp_host: String,
    pub smtp_port: u16,
    pub smtp_user: String,
    pub smtp_password: String,
    pub email_from: String,
    pub frontend_url: String,
    pub activation_token_expiration_hours: i64,
    pub password_reset_token_expiration_hours: i64,
    pub stripe_api_key: String,
    pub stripe_webhook_secret: String,
    pub stripe_test_mode: bool,
}

impl Config {
    pub fn from_env() -> Self {
        dotenv().ok();

        Config {
            server_host: env::var("SERVER_HOST").unwrap_or_else(|_| "127.0.0.1".to_string()),
            server_port: env::var("SERVER_PORT")
                .unwrap_or_else(|_| "4040".to_string())
                .parse()
                .unwrap_or(4040),
            database_url: env::var("DATABASE_URL").expect("DATABASE_URL not set"),
            jwt_secret: env::var("JWT_SECRET").expect("JWT_SECRET not set"),
            jwt_expiration_hours: env::var("JWT_EXPIRATION_HOURS")
                .unwrap_or_else(|_| "24".to_string())
                .parse()
                .unwrap_or(24),
            refresh_token_expiration_days: env::var("REFRESH_TOKEN_EXPIRATION_DAYS")
                .unwrap_or_else(|_| "7".to_string())
                .parse()
                .unwrap_or(7),
            smtp_host: env::var("SMTP_HOST").unwrap_or_else(|_| "localhost".to_string()),
            smtp_port: env::var("SMTP_PORT")
                .unwrap_or_else(|_| "587".to_string())
                .parse()
                .unwrap_or(587),
            smtp_user: env::var("SMTP_USER").unwrap_or_else(|_| "user".to_string()),
            smtp_password: env::var("SMTP_PASSWORD").unwrap_or_else(|_| "password".to_string()),
            email_from: env::var("EMAIL_FROM").unwrap_or_else(|_| "noreply@allowance.com".to_string()),
            frontend_url: env::var("FRONTEND_URL").unwrap_or_else(|_| "http://localhost:3030".to_string()),
            activation_token_expiration_hours: 24,
            password_reset_token_expiration_hours: 1,
            stripe_api_key: env::var("STRIPE_API_KEY").unwrap_or_else(|_| "sk_test_placeholder".to_string()),
            stripe_webhook_secret: env::var("STRIPE_WEBHOOK_SECRET").unwrap_or_else(|_| "whsec_test_placeholder".to_string()),
            stripe_test_mode: env::var("STRIPE_TEST_MODE")
                .unwrap_or_else(|_| "true".to_string())
                .parse::<bool>()
                .unwrap_or(true),
        }
    }
}
