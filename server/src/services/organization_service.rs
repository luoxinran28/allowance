use sqlx::PgPool;
use chrono::Utc;

use crate::models::Organization;
use crate::utils::{errors::{AppError, AppResult}, crypto::generate_uuid};

/// Organization service
pub struct OrganizationService;

impl OrganizationService {
    /// Create a new organization
    pub async fn create_organization(
        pool: &PgPool,
        user_id: i64,
        name: &str,
        description: Option<&str>,
    ) -> AppResult<Organization> {
        let org_id = generate_uuid();
        let now = Utc::now().naive_utc();

        let org = sqlx::query_as::<_, Organization>(
            r#"
            INSERT INTO organizations (org_id, name, description, created_by, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
            "#
        )
            .bind(&org_id)
            .bind(name)
            .bind(description)
            .bind(user_id)
            .bind(now)
            .bind(now)
            .fetch_one(pool)
            .await?;

        Ok(org)
    }

    /// Get organization by ID
    pub async fn get_organization(
        pool: &PgPool,
        org_id: i64,
    ) -> AppResult<Organization> {
        let org = sqlx::query_as::<_, Organization>(
            "SELECT * FROM organizations WHERE id = $1"
        )
            .bind(org_id)
            .fetch_optional(pool)
            .await?
            .ok_or(AppError::NotFound("Organization not found".to_string()))?;

        Ok(org)
    }

    /// Search organizations by name
    pub async fn search_organizations(
        pool: &PgPool,
        query: &str,
    ) -> AppResult<Vec<Organization>> {
        let search_query = format!("%{}%", query);
        let orgs = sqlx::query_as::<_, Organization>(
            r#"
            SELECT * FROM organizations
            WHERE name ILIKE $1 OR description ILIKE $1
            ORDER BY created_at DESC
            LIMIT 50
            "#
        )
            .bind(&search_query)
            .fetch_all(pool)
            .await?;

        Ok(orgs)
    }

    /// List all organizations (with pagination)
    pub async fn list_organizations(
        pool: &PgPool,
        page: i64,
        page_size: i64,
    ) -> AppResult<(Vec<Organization>, i64)> {
        let offset = (page - 1) * page_size;

        let orgs = sqlx::query_as::<_, Organization>(
            r#"
            SELECT * FROM organizations
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
            "#
        )
            .bind(page_size)
            .bind(offset)
            .fetch_all(pool)
            .await?;

        let total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM organizations")
            .fetch_one(pool)
            .await?;

        Ok((orgs, total))
    }

    /// Get organizations created by user
    pub async fn get_user_organizations(
        pool: &PgPool,
        user_id: i64,
    ) -> AppResult<Vec<Organization>> {
        let orgs = sqlx::query_as::<_, Organization>(
            r#"
            SELECT * FROM organizations
            WHERE created_by = $1
            ORDER BY created_at DESC
            "#
        )
            .bind(user_id)
            .fetch_all(pool)
            .await?;

        Ok(orgs)
    }

    /// Update organization
    pub async fn update_organization(
        pool: &PgPool,
        org_id: i64,
        name: Option<&str>,
        description: Option<&str>,
    ) -> AppResult<Organization> {
        let now = Utc::now().naive_utc();

        let org = sqlx::query_as::<_, Organization>(
            r#"
            UPDATE organizations
            SET name = COALESCE($1, name),
                description = COALESCE($2, description),
                updated_at = $3
            WHERE id = $4
            RETURNING *
            "#
        )
            .bind(name)
            .bind(description)
            .bind(now)
            .bind(org_id)
            .fetch_optional(pool)
            .await?
            .ok_or(AppError::NotFound("Organization not found".to_string()))?;

        Ok(org)
    }

    /// Delete organization (only by creator)
    pub async fn delete_organization(
        pool: &PgPool,
        org_id: i64,
        user_id: i64,
    ) -> AppResult<()> {
        // Verify organization exists and user is creator
        let org = Self::get_organization(pool, org_id).await?;
        if org.created_by != user_id {
            return Err(AppError::Forbidden);
        }

        let result = sqlx::query(
            "DELETE FROM organizations WHERE id = $1"
        )
            .bind(org_id)
            .execute(pool)
            .await?;

        if result.rows_affected() == 0 {
            return Err(AppError::NotFound("Organization not found".to_string()));
        }

        Ok(())
    }
}
