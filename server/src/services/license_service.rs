use sqlx::PgPool;
use chrono::Utc;

use crate::models::{ProductVersion, UserLicense};
use crate::utils::{
    license::generate_license_token,
    errors::{AppError, AppResult},
};

/// License service for product authorization
pub struct LicenseService;

impl LicenseService {
    /// Generate product license for user
    pub async fn generate_license(
        pool: &PgPool,
        user_id: i64,
        product_version_id: i64,
        days_valid: i32,
        jwt_secret: &str,
    ) -> AppResult<String> {
        // Fetch product version with details
        let product_version = sqlx::query_as::<_, ProductVersion>(
            r#"
            SELECT pv.* FROM product_versions pv
            WHERE pv.id = $1
            "#
        )
            .bind(product_version_id)
            .fetch_optional(pool)
            .await?
            .ok_or(AppError::ProductNotFound)?;

        // Get user tier
        let user = sqlx::query_scalar::<_, String>(
            "SELECT tier FROM users WHERE id = $1"
        )
            .bind(user_id)
            .fetch_one(pool)
            .await?;

        // Generate JWT token
        let license_key = generate_license_token(
            user_id,
            "form-001".to_string(),  // TODO: Get from product
            product_version.version_name.clone(),
            user.clone(),
            product_version.daily_limit,
            product_version.monthly_limit,
            days_valid,
            jwt_secret,
        )?;

        // Store license in database
        let expires_at = Utc::now() + chrono::Duration::days(days_valid as i64);
        
        sqlx::query(
            r#"
            INSERT INTO user_licenses 
            (user_id, product_version_id, license_key, starts_at, expires_at)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT DO NOTHING
            "#
        )
            .bind(user_id)
            .bind(product_version_id)
            .bind(&license_key)
            .bind(Utc::now().naive_utc())
            .bind(expires_at.naive_utc())
            .execute(pool)
            .await?;

        Ok(license_key)
    }

    /// Get user licenses
    pub async fn get_user_licenses(
        pool: &PgPool,
        user_id: i64,
    ) -> AppResult<Vec<UserLicense>> {
        let licenses = sqlx::query_as::<_, UserLicense>(
            r#"
            SELECT ul.* FROM user_licenses ul
            WHERE ul.user_id = $1 AND ul.revoked_at IS NULL
            "#
        )
            .bind(user_id)
            .fetch_all(pool)
            .await?;

        Ok(licenses)
    }

    /// Record license usage
    pub async fn record_usage(
        pool: &PgPool,
        user_id: i64,
        product_version_id: i64,
    ) -> AppResult<()> {
        let license = sqlx::query_as::<_, UserLicense>(
            r#"
            SELECT ul.* FROM user_licenses ul
            WHERE ul.user_id = $1 AND ul.product_version_id = $2
            AND ul.expires_at > NOW() AND ul.revoked_at IS NULL
            "#
        )
            .bind(user_id)
            .bind(product_version_id)
            .fetch_optional(pool)
            .await?
            .ok_or(AppError::LicenseNotFound)?;

        // Fetch product version to get daily limit
        let product_version = sqlx::query_as::<_, ProductVersion>(
            "SELECT * FROM product_versions WHERE id = $1"
        )
            .bind(product_version_id)
            .fetch_optional(pool)
            .await?
            .ok_or(AppError::ProductNotFound)?;

        // Check daily limit
        if let Some(limit) = product_version.daily_limit {
            if license.daily_usage >= limit {
                return Err(AppError::DailyLimitExceeded);
            }
        }

        // Update usage
        sqlx::query(
            r#"
            UPDATE user_licenses 
            SET daily_usage = daily_usage + 1, 
                monthly_usage = monthly_usage + 1,
                last_used_at = $1,
                updated_at = $1
            WHERE id = $2
            "#
        )
            .bind(Utc::now().naive_utc())
            .bind(license.id)
            .execute(pool)
            .await?;

        Ok(())
    }

    /// Revoke license
    pub async fn revoke_license(
        pool: &PgPool,
        license_id: i64,
    ) -> AppResult<()> {
        sqlx::query(
            "UPDATE user_licenses SET revoked_at = $1 WHERE id = $2"
        )
            .bind(Utc::now().naive_utc())
            .bind(license_id)
            .execute(pool)
            .await?;

        Ok(())
    }
}
