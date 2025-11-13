use sqlx::{PgPool, Row};
use chrono::Utc;
use uuid::Uuid;

use crate::models::{User, UserResponse, EmailToken};
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
    ) -> AppResult<UserResponse> {
        // Check if email already exists
        let existing = sqlx::query_as::<_, User>(
            "SELECT * FROM users WHERE email = $1"
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

        // Create user (starts as inactive)
        let user = sqlx::query_as::<_, User>(
            r#"
            INSERT INTO users (uid, email, password_hash, status, tier)
            VALUES ($1, $2, $3, 'inactive', 'free')
            RETURNING *
            "#
        )
            .bind(&uid)
            .bind(email)
            .bind(password_hash)
            .fetch_one(pool)
            .await?;

        Ok(UserResponse::from(user))
    }

    /// Login with email and password
    pub async fn login(
        pool: &PgPool,
        email: &str,
        password: &str,
    ) -> AppResult<User> {
        let user = sqlx::query_as::<_, User>(
            "SELECT * FROM users WHERE email = $1"
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
        if user.status != "active" {
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
            "UPDATE users SET status = 'active', updated_at = $1 WHERE id = $2 RETURNING *"
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
            "SELECT * FROM users WHERE email = $1"
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
            "SELECT * FROM users WHERE id = $1"
        )
            .bind(user_id)
            .fetch_optional(pool)
            .await?
            .ok_or(AppError::UserNotFound)
    }

    /// Get user by email
    pub async fn get_user_by_email(pool: &PgPool, email: &str) -> AppResult<User> {
        sqlx::query_as::<_, User>(
            "SELECT * FROM users WHERE email = $1"
        )
            .bind(email)
            .fetch_optional(pool)
            .await?
            .ok_or(AppError::UserNotFound)
    }
}
