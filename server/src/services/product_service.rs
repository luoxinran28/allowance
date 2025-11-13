use sqlx::{PgPool, Row};
use chrono::Utc;

use crate::models::{
    Product, License, UserLicense, LicenseApproval, CreateProductRequest, CreateLicenseRequest,
};
use crate::utils::errors::{AppError, AppResult};

pub struct ProductService;

impl ProductService {
    // ============= Product Management =============

    /// Create a new product UPID
    /// Format: UPID-{product_slug}-{tier}
    pub async fn create_product(
        pool: &PgPool,
        req: CreateProductRequest,
        admin_id: i64,
    ) -> AppResult<Product> {
        let upid = format!("UPID-{}-{}", req.product_slug, req.tier);

        let product = sqlx::query_as::<_, Product>(
            r#"
            INSERT INTO products (upid, product_slug, tier, name, description)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
            "#
        )
            .bind(&upid)
            .bind(&req.product_slug)
            .bind(&req.tier)
            .bind(&req.name)
            .bind(&req.description)
            .fetch_one(pool)
            .await?;

        Ok(product)
    }

    /// List all products
    pub async fn list_products(pool: &PgPool) -> AppResult<Vec<Product>> {
        let products = sqlx::query_as::<_, Product>(
            "SELECT * FROM products ORDER BY created_at DESC"
        )
            .fetch_all(pool)
            .await?;

        Ok(products)
    }

    /// Get product by UPID
    pub async fn get_product_by_upid(pool: &PgPool, upid: &str) -> AppResult<Product> {
        sqlx::query_as::<_, Product>("SELECT * FROM products WHERE upid = $1")
            .bind(upid)
            .fetch_optional(pool)
            .await?
            .ok_or(AppError::NotFound("Product not found".to_string()))
    }

    /// Get product by ID
    pub async fn get_product_by_id(pool: &PgPool, id: i64) -> AppResult<Product> {
        sqlx::query_as::<_, Product>("SELECT * FROM products WHERE id = $1")
            .bind(id)
            .fetch_optional(pool)
            .await?
            .ok_or(AppError::NotFound("Product not found".to_string()))
    }

    // ============= License Management =============

    /// Create a new license for an organization
    pub async fn create_license(
        pool: &PgPool,
        req: CreateLicenseRequest,
        creator_id: i64,
    ) -> AppResult<License> {
        // Verify product exists
        Self::get_product_by_upid(pool, &req.upid).await?;

        let license = sqlx::query_as::<_, License>(
            r#"
            INSERT INTO licenses (upid, org_id, issued_at, expires_at, max_users, created_by)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
            "#
        )
            .bind(&req.upid)
            .bind(req.org_id)
            .bind(req.issued_at)
            .bind(req.expires_at)
            .bind(req.max_users)
            .bind(creator_id)
            .fetch_one(pool)
            .await?;

        Ok(license)
    }

    /// Get license by ID
    pub async fn get_license_by_id<'a, T>(conn: T, id: i64) -> AppResult<License>
    where
        T: sqlx::Executor<'a, Database = sqlx::Postgres>,
    {
        sqlx::query_as::<_, License>("SELECT * FROM licenses WHERE id = $1")
            .bind(id)
            .fetch_optional(conn)
            .await?
            .ok_or(AppError::NotFound("License not found".to_string()))
    }

    /// Get licenses by organization
    pub async fn get_licenses_by_org(pool: &PgPool, org_id: i64) -> AppResult<Vec<License>> {
        let licenses = sqlx::query_as::<_, License>(
            "SELECT * FROM licenses WHERE org_id = $1 ORDER BY created_at DESC"
        )
            .bind(org_id)
            .fetch_all(pool)
            .await?;

        Ok(licenses)
    }

    /// Get active license for organization and product
    pub async fn get_active_license(
        pool: &PgPool,
        org_id: i64,
        upid: &str,
    ) -> AppResult<License> {
        sqlx::query_as::<_, License>(
            r#"
            SELECT * FROM licenses 
            WHERE org_id = $1 AND upid = $2 AND revoked = FALSE AND expires_at > NOW()
            ORDER BY expires_at DESC
            LIMIT 1
            "#
        )
            .bind(org_id)
            .bind(upid)
            .fetch_optional(pool)
            .await?
            .ok_or(AppError::Forbidden)
    }

    /// Check if license has available seats
    pub async fn check_license_availability(pool: &PgPool, license_id: i64) -> AppResult<bool> {
        let license = Self::get_license_by_id(pool, license_id).await?;
        Ok(license.current_users < license.max_users && !license.revoked)
    }

    /// Revoke license
    pub async fn revoke_license(pool: &PgPool, license_id: i64) -> AppResult<License> {
        let license = sqlx::query_as::<_, License>(
            "UPDATE licenses SET revoked = TRUE, updated_at = NOW() WHERE id = $1 RETURNING *"
        )
            .bind(license_id)
            .fetch_one(pool)
            .await?;

        Ok(license)
    }

    // ============= User License Management =============

    /// Assign license to user (increment current_users)
    pub async fn assign_license(
        pool: &PgPool,
        user_id: i64,
        license_id: i64,
        assigned_by: i64,
    ) -> AppResult<UserLicense> {
        let mut tx = pool.begin().await?;

        // Check license availability
        let license = sqlx::query_as::<_, License>("SELECT * FROM licenses WHERE id = $1 FOR UPDATE")
            .bind(license_id)
            .fetch_one(&mut *tx)
            .await?;

        if license.current_users >= license.max_users {
            return Err(AppError::BadRequest("License is full".to_string()));
        }

        // Create user_license record
        let user_license = sqlx::query_as::<_, UserLicense>(
            r#"
            INSERT INTO user_licenses (user_id, license_id, assigned_at, assigned_by)
            VALUES ($1, $2, $3, $4)
            RETURNING *
            "#
        )
            .bind(user_id)
            .bind(license_id)
            .bind(Utc::now())
            .bind(assigned_by)
            .fetch_one(&mut *tx)
            .await?;

        // Increment current_users
        sqlx::query("UPDATE licenses SET current_users = current_users + 1 WHERE id = $1")
            .bind(license_id)
            .execute(&mut *tx)
            .await?;

        tx.commit().await?;

        Ok(user_license)
    }

    /// Revoke user license (decrement current_users)
    pub async fn revoke_user_license(pool: &PgPool, user_license_id: i64) -> AppResult<UserLicense> {
        let mut tx = pool.begin().await?;

        // Get user_license and mark as revoked
        let user_license = sqlx::query_as::<_, UserLicense>(
            "UPDATE user_licenses SET revoked_at = NOW() WHERE id = $1 RETURNING *"
        )
            .bind(user_license_id)
            .fetch_one(&mut *tx)
            .await?;

        // Decrement current_users
        sqlx::query("UPDATE licenses SET current_users = current_users - 1 WHERE id = $1")
            .bind(user_license.license_id)
            .execute(&mut *tx)
            .await?;

        tx.commit().await?;

        Ok(user_license)
    }

    /// Get user licenses (only active ones)
    pub async fn get_user_licenses(pool: &PgPool, user_id: i64) -> AppResult<Vec<(UserLicense, License)>> {
        let results = sqlx::query(
            r#"
            SELECT ul.id, ul.user_id, ul.license_id, ul.assigned_at, ul.assigned_by, 
                   ul.revoked_at, ul.created_at,
                   l.id, l.upid, l.org_id, l.issued_at, l.expires_at, l.max_users, 
                   l.current_users, l.revoked, l.created_by, l.created_at, l.updated_at
            FROM user_licenses ul
            JOIN licenses l ON ul.license_id = l.id
            WHERE ul.user_id = $1 AND ul.revoked_at IS NULL AND l.expires_at > NOW()
            "#
        )
            .bind(user_id)
            .fetch_all(pool)
            .await?;

        let mut licenses = Vec::new();
        for row in results {
            let user_license = UserLicense {
                id: row.get(0),
                user_id: row.get(1),
                license_id: row.get(2),
                assigned_at: row.get(3),
                assigned_by: row.get(4),
                revoked_at: row.get(5),
                created_at: row.get(6),
            };

            let license = License {
                id: row.get(7),
                upid: row.get(8),
                org_id: row.get(9),
                issued_at: row.get(10),
                expires_at: row.get(11),
                max_users: row.get(12),
                current_users: row.get(13),
                revoked: row.get(14),
                created_by: row.get(15),
                created_at: row.get(16),
                updated_at: row.get(17),
            };

            licenses.push((user_license, license));
        }

        Ok(licenses)
    }

    // ============= License Approval Workflow =============

    /// Request license (create approval request)
    pub async fn request_license(
        pool: &PgPool,
        user_id: i64,
        license_id: i64,
    ) -> AppResult<LicenseApproval> {
        let approval = sqlx::query_as::<_, LicenseApproval>(
            r#"
            INSERT INTO license_approvals (user_id, license_id, status, requested_at)
            VALUES ($1, $2, 'pending', NOW())
            RETURNING *
            "#
        )
            .bind(user_id)
            .bind(license_id)
            .fetch_one(pool)
            .await?;

        Ok(approval)
    }

    /// Get pending approvals for team leader
    pub async fn get_pending_approvals_for_team(
        pool: &PgPool,
        team_id: i64,
    ) -> AppResult<Vec<LicenseApproval>> {
        // TODO: Implement team-based filtering once team structure is finalized
        let approvals = sqlx::query_as::<_, LicenseApproval>(
            "SELECT * FROM license_approvals WHERE status = 'pending' ORDER BY requested_at ASC"
        )
            .fetch_all(pool)
            .await?;

        Ok(approvals)
    }

    /// Approve or reject license request
    pub async fn review_license_request(
        pool: &PgPool,
        approval_id: i64,
        status: &str,
        approver_id: i64,
        remarks: Option<String>,
    ) -> AppResult<LicenseApproval> {
        if !["approved", "rejected"].contains(&status) {
            return Err(AppError::BadRequest("Invalid status".to_string()));
        }

        let mut tx = pool.begin().await?;

        // Update approval record
        let approval = sqlx::query_as::<_, LicenseApproval>(
            r#"
            UPDATE license_approvals 
            SET status = $1, approver_id = $2, approved_at = NOW(), remarks = $3, updated_at = NOW()
            WHERE id = $4
            RETURNING *
            "#
        )
            .bind(status)
            .bind(approver_id)
            .bind(&remarks)
            .bind(approval_id)
            .fetch_one(&mut *tx)
            .await?;

        // If approved, assign license to user
        if status == "approved" {
            let license = Self::get_license_by_id(&mut *tx, approval.license_id).await?;
            
            if license.current_users >= license.max_users {
                return Err(AppError::BadRequest("License is full".to_string()));
            }

            sqlx::query(
                r#"
                INSERT INTO user_licenses (user_id, license_id, assigned_at, assigned_by)
                VALUES ($1, $2, NOW(), $3)
                ON CONFLICT (user_id, license_id) DO UPDATE SET revoked_at = NULL
                "#
            )
                .bind(approval.user_id)
                .bind(approval.license_id)
                .bind(approver_id)
                .execute(&mut *tx)
                .await?;

            sqlx::query("UPDATE licenses SET current_users = current_users + 1 WHERE id = $1")
                .bind(approval.license_id)
                .execute(&mut *tx)
                .await?;
        }

        tx.commit().await?;

        Ok(approval)
    }
}
