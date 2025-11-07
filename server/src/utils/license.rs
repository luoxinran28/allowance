use chrono::{Duration, Utc};
use jsonwebtoken::{encode, decode, EncodingKey, DecodingKey, Header, Validation, Algorithm};
use serde::{Deserialize, Serialize};

use crate::models::LicenseClaims;
use crate::utils::errors::{AppError, AppResult};

/// Generate license token (JWT format for offline verification)
pub fn generate_license_token(
    user_id: i64,
    product_id: String,
    version_name: String,
    tier: String,
    daily_limit: Option<i32>,
    monthly_limit: Option<i32>,
    days_valid: i32,
    secret: &str,
) -> AppResult<String> {
    let now = Utc::now();
    let expires_at = now + Duration::days(days_valid as i64);

    let claims = LicenseClaims {
        user_id,
        product_id,
        version_name,
        tier,
        expires_at: expires_at.timestamp(),
        daily_limit,
        monthly_limit,
        iat: now.timestamp(),
        exp: expires_at.timestamp(),
    };

    encode(
        &Header::new(Algorithm::HS256),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|_| AppError::InternalServerError)
}

/// Verify and decode license token (offline verification)
pub fn verify_license_token(token: &str, secret: &str) -> AppResult<LicenseClaims> {
    decode::<LicenseClaims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::new(Algorithm::HS256),
    )
    .map(|data| data.claims)
    .map_err(|err| {
        if err.to_string().contains("ExpiredSignature") {
            AppError::LicenseExpired
        } else {
            AppError::InvalidToken
        }
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_license_token_generation_and_verification() {
        let secret = "test-secret-key-min-32-characters-long";
        
        let token = generate_license_token(
            1,
            "form-001".to_string(),
            "pro".to_string(),
            "standard".to_string(),
            Some(100),
            Some(10000),
            30,
            secret,
        ).unwrap();

        let claims = verify_license_token(&token, secret).unwrap();
        
        assert_eq!(claims.user_id, 1);
        assert_eq!(claims.product_id, "form-001");
        assert_eq!(claims.version_name, "pro");
        assert_eq!(claims.tier, "standard");
        assert_eq!(claims.daily_limit, Some(100));
    }

    #[test]
    fn test_invalid_license_token() {
        let secret = "test-secret-key-min-32-characters-long";
        let result = verify_license_token("invalid.token.here", secret);
        assert!(result.is_err());
    }
}
