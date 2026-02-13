use chrono::{Duration, Utc};
use jsonwebtoken::{encode, decode, EncodingKey, DecodingKey, Header, Validation, Algorithm};
use serde::{Deserialize, Serialize};

use crate::utils::errors::{AppError, AppResult};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub user_id: i64,
    pub email: String,
    pub iat: i64,
    pub exp: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RefreshClaims {
    pub user_id: i64,
    pub iat: i64,
    pub exp: i64,
}

/// JWT Manager for per-product token signing.
/// 
/// The `secret` field serves as a fallback for internal Allowance operations
/// (e.g., refresh tokens, non-product-specific tokens).
/// For product-specific tokens, use `generate_token_with_key()` with the
/// product's `jwt_signing_key` from the database.
pub struct JwtManager {
    /// Fallback secret for internal tokens (refresh tokens, Allowance's own frontend)
    /// Loaded from the "allowance" product's jwt_signing_key in DB
    secret: String,
    expiration_hours: i64,
    refresh_expiration_days: i64,
}

impl JwtManager {
    pub fn new(secret: String, expiration_hours: i64, refresh_expiration_days: i64) -> Self {
        JwtManager {
            secret,
            expiration_hours,
            refresh_expiration_days,
        }
    }

    /// Get the fallback JWT secret (used for refresh tokens / internal operations)
    pub fn get_secret(&self) -> String {
        self.secret.clone()
    }

    /// Generate access token signed with the PRODUCT-SPECIFIC key from DB.
    /// This is the primary method for login — each product gets its own signing key.
    pub fn generate_token_with_key(&self, user_id: i64, email: String, signing_key: &str) -> AppResult<String> {
        let now = Utc::now();
        let expires_at = now + Duration::hours(self.expiration_hours);

        let claims = Claims {
            user_id,
            email,
            iat: now.timestamp(),
            exp: expires_at.timestamp(),
        };

        encode(
            &Header::new(Algorithm::HS256),
            &claims,
            &EncodingKey::from_secret(signing_key.as_bytes()),
        )
        .map_err(|_| AppError::InternalServerError)
    }

    /// Generate access token using the fallback (Allowance internal) secret.
    /// Used when no product_slug is specified (Allowance's own frontend).
    pub fn generate_token(&self, user_id: i64, email: String) -> AppResult<String> {
        self.generate_token_with_key(user_id, email, &self.secret)
    }

    /// Generate refresh token (always uses fallback secret — refresh tokens
    /// are Allowance-internal and not verified by external products).
    pub fn generate_refresh_token(&self, user_id: i64) -> AppResult<String> {
        let now = Utc::now();
        let expires_at = now + Duration::days(self.refresh_expiration_days);

        let claims = RefreshClaims {
            user_id,
            iat: now.timestamp(),
            exp: expires_at.timestamp(),
        };

        encode(
            &Header::new(Algorithm::HS256),
            &claims,
            &EncodingKey::from_secret(self.secret.as_bytes()),
        )
        .map_err(|_| AppError::InternalServerError)
    }

    /// Verify and decode token using a specific key
    pub fn verify_token_with_key(&self, token: &str, key: &str) -> AppResult<Claims> {
        decode::<Claims>(
            token,
            &DecodingKey::from_secret(key.as_bytes()),
            &Validation::new(Algorithm::HS256),
        )
        .map(|data| data.claims)
        .map_err(|err| {
            if err.to_string().contains("ExpiredSignature") {
                AppError::TokenExpired
            } else {
                AppError::InvalidToken
            }
        })
    }

    /// Verify and decode token using the fallback secret
    pub fn verify_token(&self, token: &str) -> AppResult<Claims> {
        self.verify_token_with_key(token, &self.secret)
    }

    /// Verify and decode refresh token
    pub fn verify_refresh_token(&self, token: &str) -> AppResult<RefreshClaims> {
        decode::<RefreshClaims>(
            token,
            &DecodingKey::from_secret(self.secret.as_bytes()),
            &Validation::new(Algorithm::HS256),
        )
        .map(|data| data.claims)
        .map_err(|err| {
            if err.to_string().contains("ExpiredSignature") {
                AppError::TokenExpired
            } else {
                AppError::InvalidToken
            }
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_token_generation_and_verification() {
        let manager = JwtManager::new(
            "test-secret-key-min-32-characters-long".to_string(),
            24,
            7,
        );

        let token = manager.generate_token(1, "test@example.com".to_string()).unwrap();
        let claims = manager.verify_token(&token).unwrap();

        assert_eq!(claims.user_id, 1);
        assert_eq!(claims.email, "test@example.com");
    }

    #[test]
    fn test_token_with_product_key() {
        let manager = JwtManager::new(
            "fallback-secret-for-internal-use-only".to_string(),
            24,
            7,
        );

        let product_key = "per-product-signing-key-from-database";
        let token = manager.generate_token_with_key(42, "user@kwongfu.com".to_string(), product_key).unwrap();
        
        // Verify with same product key succeeds
        let claims = manager.verify_token_with_key(&token, product_key).unwrap();
        assert_eq!(claims.user_id, 42);
        assert_eq!(claims.email, "user@kwongfu.com");

        // Verify with fallback secret fails (different key)
        let result = manager.verify_token(&token);
        assert!(result.is_err());
    }

    #[test]
    fn test_invalid_token() {
        let manager = JwtManager::new(
            "test-secret-key-min-32-characters-long".to_string(),
            24,
            7,
        );

        let result = manager.verify_token("invalid.token.here");
        assert!(result.is_err());
    }
}
