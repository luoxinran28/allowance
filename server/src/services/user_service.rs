// server/src/services/user_service.rs
// 用户服务 - 查询用户信息

use sqlx::PgPool;
use crate::models::User;
use crate::utils::{AppResult, AppError};

pub struct UserService;

impl UserService {
    /// 根据用户 ID 获取用户信息
    pub async fn get_user(pool: &PgPool, user_id: i64) -> AppResult<User> {
        let user = sqlx::query_as::<_, User>(
            "SELECT id, uid, email, password_hash, tier, status, organization_id, team_ids, license_status, source_upid,
                    profile_data, created_at, updated_at, last_login
            FROM users WHERE id = $1"
        )
            .bind(user_id)
            .fetch_optional(pool)
            .await?
            .ok_or(AppError::Unauthorized)?;

        Ok(user)
    }

    /// 根据邮箱获取用户信息
    pub async fn get_user_by_email(pool: &PgPool, email: &str) -> AppResult<User> {
        let user = sqlx::query_as::<_, User>(
            "SELECT id, uid, email, password_hash, tier, status, organization_id, team_ids, license_status, source_upid,
                    profile_data, created_at, updated_at, last_login
            FROM users WHERE email = $1"
        )
            .bind(email)
            .fetch_optional(pool)
            .await?
            .ok_or(AppError::Unauthorized)?;

        Ok(user)
    }
}
