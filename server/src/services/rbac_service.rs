use sqlx::PgPool;

use crate::models::{Role, Permission, UserRole};
use crate::utils::{errors::{AppError, AppResult}};

/// RBAC service for permission checking
pub struct RbacService;

impl RbacService {
    /// Check if user has permission
    pub async fn has_permission(
        pool: &PgPool,
        user_id: i64,
        permission_code: &str,
    ) -> AppResult<bool> {
        let result = sqlx::query_scalar::<_, bool>(
            r#"
            SELECT EXISTS(
                SELECT 1 FROM user_roles ur
                JOIN role_permissions rp ON ur.role_id = rp.role_id
                JOIN permissions p ON rp.permission_id = p.id
                WHERE ur.user_id = $1 AND p.code = $2
            )
            "#
        )
            .bind(user_id)
            .bind(permission_code)
            .fetch_one(pool)
            .await?;

        Ok(result)
    }

    /// Get all permissions for user
    pub async fn get_user_permissions(
        pool: &PgPool,
        user_id: i64,
    ) -> AppResult<Vec<Permission>> {
        let permissions = sqlx::query_as::<_, Permission>(
            r#"
            SELECT DISTINCT p.* FROM permissions p
            JOIN role_permissions rp ON p.id = rp.permission_id
            JOIN user_roles ur ON rp.role_id = ur.role_id
            WHERE ur.user_id = $1
            "#
        )
            .bind(user_id)
            .fetch_all(pool)
            .await?;

        Ok(permissions)
    }

    /// Get user roles
    pub async fn get_user_roles(
        pool: &PgPool,
        user_id: i64,
    ) -> AppResult<Vec<Role>> {
        let roles = sqlx::query_as::<_, Role>(
            r#"
            SELECT DISTINCT r.* FROM roles r
            JOIN user_roles ur ON r.id = ur.role_id
            WHERE ur.user_id = $1
            "#
        )
            .bind(user_id)
            .fetch_all(pool)
            .await?;

        Ok(roles)
    }

    /// Assign role to user
    pub async fn assign_role(
        pool: &PgPool,
        user_id: i64,
        role_code: &str,
    ) -> AppResult<()> {
        let role = sqlx::query_as::<_, Role>(
            "SELECT * FROM roles WHERE code = $1"
        )
            .bind(role_code)
            .fetch_optional(pool)
            .await?
            .ok_or(AppError::NotFound("Role not found".to_string()))?;

        // Insert user_role if not already exists
        sqlx::query(
            r#"
            INSERT INTO user_roles (user_id, role_id)
            VALUES ($1, $2)
            ON CONFLICT (user_id, role_id) DO NOTHING
            "#
        )
            .bind(user_id)
            .bind(role.id)
            .execute(pool)
            .await?;

        Ok(())
    }

    /// Remove role from user
    pub async fn remove_role(
        pool: &PgPool,
        user_id: i64,
        role_code: &str,
    ) -> AppResult<()> {
        let role = sqlx::query_as::<_, Role>(
            "SELECT * FROM roles WHERE code = $1"
        )
            .bind(role_code)
            .fetch_optional(pool)
            .await?
            .ok_or(AppError::NotFound("Role not found".to_string()))?;

        sqlx::query(
            "DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2"
        )
            .bind(user_id)
            .bind(role.id)
            .execute(pool)
            .await?;

        Ok(())
    }

    /// Require permission (returns error if not permitted)
    pub async fn require_permission(
        pool: &PgPool,
        user_id: i64,
        permission_code: &str,
    ) -> AppResult<()> {
        let has_permission = Self::has_permission(pool, user_id, permission_code).await?;
        if !has_permission {
            return Err(AppError::PermissionDenied);
        }
        Ok(())
    }
}
