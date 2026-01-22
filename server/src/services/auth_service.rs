use sqlx::PgPool;
use chrono::Utc;
use uuid::Uuid;

use crate::models::{User, UserResponse, EmailToken, UserStatus};
use crate::services::free_user_service::FreeUserService;
use crate::utils::{
    crypto::{hash_password, verify_password, generate_token},
    errors::{AppError, AppResult},
};

/// Authentication service
pub struct AuthService;

impl AuthService {
    /// Register new user
    pub async fn register(
        pool: &PgPool,
        email: &str,
        password: &str,
        source_upid: &str,
    ) -> AppResult<UserResponse> {
        // Check if email already exists
        let existing = sqlx::query_as::<_, User>(
            "SELECT id, uid, email, password_hash, tier, status, organization_id, team_ids, license_status, source_upid, profile_data, created_at, updated_at, last_login FROM users WHERE email = $1"
        )
            .bind(email)
            .fetch_optional(pool)
            .await?;

        if existing.is_some() {
            return Err(AppError::EmailAlreadyRegistered);
        }

        // Generate uid
        let uid = format!("U{}", Uuid::new_v4().simple().to_string()[..15].to_uppercase());
        let password_hash = hash_password(password)?;

        // Create user (starts as inactive, tier=free)
        let user = sqlx::query_as::<_, User>(
            r#"
            INSERT INTO users (uid, email, password_hash, status, tier, source_upid)
            VALUES ($1, $2, $3, 'inactive', 'free', $4)
            RETURNING id, uid, email, password_hash, tier, status, organization_id, team_ids, license_status, source_upid, profile_data, created_at, updated_at, last_login
            "#
        )
            .bind(&uid)
            .bind(email)
            .bind(password_hash)
            .bind(source_upid)
            .fetch_one(pool)
            .await?;

        // Get product_id from upid
        let product_id: i64 = sqlx::query_scalar("SELECT id FROM products WHERE upid = $1")
            .bind(source_upid)
            .fetch_one(pool)
            .await?;

        // Create free user license
        FreeUserService::create_free_license(pool, user.id, product_id, source_upid).await?;

        Ok(UserResponse::from(user))
    }

    /// Login with email and password
    pub async fn login(
        pool: &PgPool,
        email: &str,
        password: &str,
    ) -> AppResult<User> {
        let user = sqlx::query_as::<_, User>(
            "SELECT id, uid, email, password_hash, tier, status, organization_id, team_ids, license_status, source_upid, profile_data, created_at, updated_at, last_login FROM users WHERE email = $1"
        )
            .bind(email)
            .fetch_optional(pool)
            .await?
            .ok_or(AppError::InvalidCredentials)?;

        // Verify password
        if !verify_password(password, &user.password_hash)? {
            return Err(AppError::InvalidCredentials);
        }

        // Check if user is active
        if user.status != UserStatus::Active {
            return Err(AppError::InvalidCredentials);
        }

        // Update last login
        let _ = sqlx::query(
            "UPDATE users SET last_login = $1 WHERE id = $2"
        )
            .bind(Utc::now().naive_utc())
            .bind(user.id)
            .execute(pool)
            .await;

        Ok(user)
    }

    /// Login with email, password, and UPID (product validation)
    pub async fn login_with_upid(
        pool: &PgPool,
        email: &str,
        password: &str,
        upid: &str,
    ) -> AppResult<User> {
        // First, perform regular authentication
        let user = Self::login(pool, email, password).await?;

        // Premium and Allstar users have access to all products
        if user.tier == crate::models::UserTier::Premium || user.tier == crate::models::UserTier::Allstar {
            return Ok(user);
        }

        // For other tiers, validate UPID access - check if user has free license for this product
        let license_count = sqlx::query_scalar::<_, i64>(
            r#"
            SELECT COUNT(*) FROM free_user_licenses ful
            JOIN products p ON ful.product_id = p.id
            WHERE ful.user_id = $1 AND p.upid = $2
            "#
        )
        .bind(user.id)
        .bind(upid)
        .fetch_one(pool)
        .await?;

        if license_count == 0 {
            return Err(AppError::BadRequest("No valid license found for this product".to_string()));
        }

        Ok(user)
    }

    /// Create email activation token
    pub async fn create_activation_token(
        pool: &PgPool,
        user_id: i64,
        email: &str,
    ) -> AppResult<String> {
        let token = generate_token(64);
        let expires_at = Utc::now() + chrono::Duration::hours(24);

        sqlx::query(
            r#"
            INSERT INTO email_tokens (user_id, token, token_type, email, expires_at)
            VALUES ($1, $2, 'activation', $3, $4)
            "#
        )
            .bind(user_id)
            .bind(&token)
            .bind(email)
            .bind(expires_at.naive_utc())
            .execute(pool)
            .await?;

        Ok(token)
    }

    /// Activate user account
    pub async fn activate_user(
        pool: &PgPool,
        token: &str,
    ) -> AppResult<User> {
        let mut tx = pool.begin().await?;

        // Find and verify token
        let email_token = sqlx::query_as::<_, EmailToken>(
            "SELECT * FROM email_tokens WHERE token = $1 AND token_type = 'activation'"
        )
            .bind(token)
            .fetch_optional(&mut *tx)
            .await?
            .ok_or(AppError::InvalidToken)?;

        // Check if token expired
        if email_token.expires_at < Utc::now().naive_utc() {
            return Err(AppError::TokenExpired);
        }

        // Check if already used
        if email_token.used_at.is_some() {
            return Err(AppError::InvalidToken);
        }

        let user_id = email_token.user_id.ok_or(AppError::UserNotFound)?;

        // Update user to active
        let user = sqlx::query_as::<_, User>(
            "UPDATE users SET status = 'active', updated_at = $1 WHERE id = $2 RETURNING id, uid, email, password_hash, tier, status, organization_id, team_ids, license_status, source_upid, profile_data, created_at, updated_at, last_login"
        )
            .bind(Utc::now().naive_utc())
            .bind(user_id)
            .fetch_one(&mut *tx)
            .await?;

        // Mark token as used
        sqlx::query(
            "UPDATE email_tokens SET used_at = $1 WHERE id = $2"
        )
            .bind(Utc::now().naive_utc())
            .bind(email_token.id)
            .execute(&mut *tx)
            .await?;

        tx.commit().await?;

        Ok(user)
    }

    /// Create password reset token
    pub async fn create_password_reset_token(
        pool: &PgPool,
        email: &str,
    ) -> AppResult<String> {
        let user = sqlx::query_as::<_, User>(
            "SELECT id, uid, email, tier, status, organization_id, team_ids, license_status, source_upid, profile_data, created_at, updated_at, last_login FROM users WHERE email = $1"
        )
            .bind(email)
            .fetch_optional(pool)
            .await?
            .ok_or(AppError::UserNotFound)?;

        let token = generate_token(64);
        let expires_at = Utc::now() + chrono::Duration::hours(1);

        sqlx::query(
            r#"
            INSERT INTO email_tokens (user_id, token, token_type, email, expires_at)
            VALUES ($1, $2, 'password_reset', $3, $4)
            "#
        )
            .bind(user.id)
            .bind(&token)
            .bind(email)
            .bind(expires_at.naive_utc())
            .execute(pool)
            .await?;

        Ok(token)
    }

    /// Reset password with token
    pub async fn reset_password(
        pool: &PgPool,
        token: &str,
        new_password: &str,
    ) -> AppResult<()> {
        let mut tx = pool.begin().await?;

        let email_token = sqlx::query_as::<_, EmailToken>(
            "SELECT * FROM email_tokens WHERE token = $1 AND token_type = 'password_reset'"
        )
            .bind(token)
            .fetch_optional(&mut *tx)
            .await?
            .ok_or(AppError::InvalidToken)?;

        if email_token.expires_at < Utc::now().naive_utc() {
            return Err(AppError::TokenExpired);
        }

        if email_token.used_at.is_some() {
            return Err(AppError::InvalidToken);
        }

        let user_id = email_token.user_id.ok_or(AppError::UserNotFound)?;
        let password_hash = hash_password(new_password)?;

        sqlx::query(
            "UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3"
        )
            .bind(password_hash)
            .bind(Utc::now().naive_utc())
            .bind(user_id)
            .execute(&mut *tx)
            .await?;

        sqlx::query(
            "UPDATE email_tokens SET used_at = $1 WHERE id = $2"
        )
            .bind(Utc::now().naive_utc())
            .bind(email_token.id)
            .execute(&mut *tx)
            .await?;

        tx.commit().await?;
        Ok(())
    }

    /// Get user by ID
    pub async fn get_user_by_id(pool: &PgPool, user_id: i64) -> AppResult<User> {
        sqlx::query_as::<_, User>(
            "SELECT id, uid, email, password_hash, tier, status, organization_id, team_ids, license_status, source_upid, profile_data, created_at, updated_at, last_login FROM users WHERE id = $1"
        )
            .bind(user_id)
            .fetch_optional(pool)
            .await?
            .ok_or(AppError::UserNotFound)
    }

    /// Get user by email
    pub async fn get_user_by_email(pool: &PgPool, email: &str) -> AppResult<User> {
        sqlx::query_as::<_, User>(
            "SELECT id, uid, email, password_hash, tier, status, organization_id, team_ids, license_status, source_upid, profile_data, created_at, updated_at, last_login FROM users WHERE email = $1"
        )
            .bind(email)
            .fetch_optional(pool)
            .await?
            .ok_or(AppError::UserNotFound)
    }

    /// Determine user tier for a specific product (or global tier if no product specified)
    /// 
    /// When `source_upid` is provided (external product like KwongFu):
    /// - Returns "premium" or "allstar" if user's global tier is premium/allstar
    /// - Returns "standard" if user has team assignment for the product
    /// - Returns "free" if user only has free_user_license for the product
    /// 
    /// When `source_upid` is None (Allowance's own frontend):
    /// - Returns tier mapped from user's roles (admin->allstar, org_boss->premium, etc.)
    pub async fn determine_user_tier(
        pool: &PgPool,
        user: &User,
        source_upid: Option<&str>,
        roles: Option<&Vec<String>>,
    ) -> String {
        match source_upid {
            Some(upid) => Self::get_tier_for_product(pool, user, upid).await,
            None => Self::get_tier_from_roles(user, roles),
        }
    }

    /// Get tier for a specific product based on user's license
    async fn get_tier_for_product(pool: &PgPool, user: &User, upid: &str) -> String {
        // Premium and Allstar users have full access to all products
        if user.tier == crate::models::UserTier::Premium || user.tier == crate::models::UserTier::Allstar {
            return user.tier.to_string();
        }

        // Check if user has a team assignment for this product (standard tier)
        let has_team_license = sqlx::query_scalar::<_, i64>(
            r#"
            SELECT COUNT(*) FROM team_member_license_assignments tmla
            JOIN products p ON tmla.product_id = p.id
            WHERE tmla.user_id = $1 AND p.upid = $2 AND tmla.status = 'active'
            "#
        )
        .bind(user.id)
        .bind(upid)
        .fetch_one(pool)
        .await
        .unwrap_or(0);

        if has_team_license > 0 {
            return "standard".to_string();
        }

        // Check if user has a free license for this product
        let has_free_license = sqlx::query_scalar::<_, i64>(
            r#"
            SELECT COUNT(*) FROM free_user_licenses ful
            JOIN products p ON ful.product_id = p.id
            WHERE ful.user_id = $1 AND p.upid = $2
            "#
        )
        .bind(user.id)
        .bind(upid)
        .fetch_one(pool)
        .await
        .unwrap_or(0);

        if has_free_license > 0 {
            return "free".to_string();
        }

        // No license found - default to free
        "free".to_string()
    }

    /// Get tier from user's roles (for Allowance's own frontend)
    fn get_tier_from_roles(user: &User, roles: Option<&Vec<String>>) -> String {
        // If user has explicit tier set, use it for global tier mapping
        // But also check roles for more accurate tier
        if let Some(role_list) = roles {
            // Role hierarchy: admin > org_boss > team_leader > standard_employee > free_user
            if role_list.contains(&"admin".to_string()) {
                return "allstar".to_string();
            }
            if role_list.contains(&"org_boss".to_string()) {
                return "premium".to_string();
            }
            if role_list.contains(&"team_leader".to_string()) 
                || role_list.contains(&"standard_employee".to_string()) {
                return "standard".to_string();
            }
            if role_list.contains(&"free_user".to_string()) {
                return "free".to_string();
            }
        }

        // Fall back to user's stored tier
        user.tier.to_string()
    }
}
