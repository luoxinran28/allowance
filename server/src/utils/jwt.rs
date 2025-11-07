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

pub struct JwtManager {
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

    /// Generate access token (JWT)
    pub fn generate_token(&self, user_id: i64, email: String) -> AppResult<String> {
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
            &EncodingKey::from_secret(self.secret.as_bytes()),
        )
        .map_err(|_| AppError::InternalServerError)
    }

    /// Generate refresh token
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

    /// Verify and decode token
    pub fn verify_token(&self, token: &str) -> AppResult<Claims> {
        decode::<Claims>(
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
