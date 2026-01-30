use sqlx::PgPool;

use crate::models::{Product, ProductVersion, License, OrgProductLicense, TeamMemberLicenseAssignment};
use crate::utils::errors::{AppError, AppResult};

pub struct ProductService;

impl ProductService {
    // ============= Product Management =============

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

    // ============= Product Version Management =============

    /// Get product versions by product ID
    pub async fn get_product_versions(pool: &PgPool, product_id: i64) -> AppResult<Vec<ProductVersion>> {
        let versions = sqlx::query_as::<_, ProductVersion>(
            "SELECT * FROM product_versions WHERE product_id = $1 ORDER BY created_at DESC"
        )
            .bind(product_id)
            .fetch_all(pool)
            .await?;

        Ok(versions)
    }

    /// Get product version by ID
    pub async fn get_product_version_by_id(pool: &PgPool, id: i64) -> AppResult<ProductVersion> {
        sqlx::query_as::<_, ProductVersion>("SELECT * FROM product_versions WHERE id = $1")
            .bind(id)
            .fetch_optional(pool)
            .await?
            .ok_or(AppError::NotFound("Product version not found".to_string()))
    }

    // ============= User License Management =============

    /// Get user licenses (free user licenses in the new three-tier architecture)
    pub async fn get_user_licenses(pool: &PgPool, user_id: i64) -> AppResult<Vec<License>> {
        eprintln!("[ProductService::get_user_licenses] Fetching licenses for user_id: {}", user_id);
        
        // Query free user licenses and join with product versions to get limits
        let licenses = sqlx::query_as::<_, License>(
            r#"
            SELECT 
                ful.id,
                ful.user_id,
                pv.id as product_version_id,
                ful.license_key,
                ful.created_at as starts_at,
                ful.created_at + INTERVAL '1 year' as expires_at,
                COALESCE(pv.daily_limit, 0) as daily_usage,
                COALESCE(pv.monthly_limit, 0) as monthly_usage,
                NULL as last_used_at,
                NULL as revoked_at,
                NULL as metadata,
                ful.created_at,
                ful.created_at as updated_at,
                ful.upid
            FROM free_user_licenses ful
            JOIN products p ON ful.product_id = p.id
            JOIN product_versions pv ON p.id = pv.product_id AND pv.version_name = 'basic'
            WHERE ful.user_id = $1
            ORDER BY ful.created_at DESC
            "#,
        )
            .bind(user_id)
            .fetch_all(pool)
            .await?;

        eprintln!("[ProductService::get_user_licenses] Found {} licenses", licenses.len());
        Ok(licenses)
    }

    /// Get license by ID
    pub async fn get_license_by_id(pool: &PgPool, id: i64) -> AppResult<License> {
        // For now, only check free user licenses
        let license = sqlx::query_as::<_, License>(
            r#"
            SELECT 
                ful.id,
                ful.user_id,
                pv.id as product_version_id,
                ful.license_key,
                ful.created_at as starts_at,
                ful.created_at + INTERVAL '1 year' as expires_at,
                COALESCE(pv.daily_limit, 0) as daily_usage,
                COALESCE(pv.monthly_limit, 0) as monthly_usage,
                NULL as last_used_at,
                NULL as revoked_at,
                NULL as metadata,
                ful.created_at,
                ful.created_at as updated_at,
                ful.upid
            FROM free_user_licenses ful
            JOIN products p ON ful.product_id = p.id
            JOIN product_versions pv ON p.id = pv.product_id AND pv.version_name = 'basic'
            WHERE ful.id = $1
            "#,
        )
            .bind(id)
            .fetch_optional(pool)
            .await?
            .ok_or(AppError::NotFound("License not found".to_string()))?;
        
        Ok(license)
    }

    /// Get license by key
    pub async fn get_license_by_key(pool: &PgPool, license_key: &str) -> AppResult<License> {
        // For now, only check free user licenses
        let license = sqlx::query_as::<_, License>(
            r#"
            SELECT 
                ful.id,
                ful.user_id,
                pv.id as product_version_id,
                ful.license_key,
                ful.created_at as starts_at,
                ful.created_at + INTERVAL '1 year' as expires_at,
                COALESCE(pv.daily_limit, 0) as daily_usage,
                COALESCE(pv.monthly_limit, 0) as monthly_usage,
                NULL as last_used_at,
                NULL as revoked_at,
                NULL as metadata,
                ful.created_at,
                ful.created_at as updated_at,
                ful.upid
            FROM free_user_licenses ful
            JOIN products p ON ful.product_id = p.id
            JOIN product_versions pv ON p.id = pv.product_id AND pv.version_name = 'basic'
            WHERE ful.license_key = $1
            "#,
        )
            .bind(license_key)
            .fetch_optional(pool)
            .await?
            .ok_or(AppError::NotFound("License not found".to_string()))?;
        
        Ok(license)
    }

    // ============= Admin Product Creation =============

    /// Create a new product (admin only)
    pub async fn create_product_admin(
        pool: &PgPool,
        name: &str,
        product_slug: &str,
        description: Option<&str>,
        owner_id: i64,
    ) -> AppResult<Product> {
        // Generate UPID: UPID-{slug}-{tier} format, but ensure total length <= 16
        // Take first 8 chars of slug to fit within 16 char limit: UPID-{8chars}-b = 16 chars
        let slug_prefix = if product_slug.len() > 8 {
            &product_slug[..8]
        } else {
            product_slug
        };
        let upid = format!("UPID-{}-b", slug_prefix);

        let product = sqlx::query_as::<_, Product>(
            r#"
            INSERT INTO products (upid, product_slug, name, description, owner_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
            "#
        )
            .bind(&upid)
            .bind(product_slug)
            .bind(name)
            .bind(description)
            .bind(owner_id)
            .fetch_one(pool)
            .await?;

        Ok(product)
    }

    // ============= Organization Product Licenses =============

    /// Generate licenses for an organization (UPSERT for idempotency)
    pub async fn generate_org_licenses(
        pool: &PgPool,
        product_id: i64,
        organization_id: i64,
        count: i32,
        expires_in_days: i32,
        created_by: i64,
    ) -> AppResult<OrgProductLicense> {
        let expires_at = chrono::Utc::now().naive_utc() + chrono::Duration::days(expires_in_days as i64);

        let license = sqlx::query_as::<_, OrgProductLicense>(
            r#"
            INSERT INTO org_product_licenses 
            (organization_id, product_id, total_count, assigned_count, expires_at, created_by)
            VALUES ($1, $2, $3, 0, $4, $5)
            ON CONFLICT (organization_id, product_id)
            DO UPDATE SET
                total_count = org_product_licenses.total_count + EXCLUDED.total_count,
                expires_at = CASE 
                    WHEN EXCLUDED.expires_at > org_product_licenses.expires_at 
                    THEN EXCLUDED.expires_at 
                    ELSE org_product_licenses.expires_at 
                END,
                updated_at = NOW()
            RETURNING *
            "#
        )
            .bind(organization_id)
            .bind(product_id)
            .bind(count)
            .bind(expires_at)
            .bind(created_by)
            .fetch_one(pool)
            .await?;

        Ok(license)
    }

    /// Get organization licenses
    pub async fn get_org_licenses(pool: &PgPool, organization_id: i64) -> AppResult<Vec<OrgProductLicense>> {
        let licenses = sqlx::query_as::<_, OrgProductLicense>(
            r#"
            SELECT * FROM org_product_licenses
            WHERE organization_id = $1 AND expires_at > NOW()
            ORDER BY created_at DESC
            "#
        )
            .bind(organization_id)
            .fetch_all(pool)
            .await?;

        Ok(licenses)
    }

    /// Get org license by ID
    pub async fn get_org_license_by_id(pool: &PgPool, id: i64) -> AppResult<OrgProductLicense> {
        sqlx::query_as::<_, OrgProductLicense>(
            "SELECT * FROM org_product_licenses WHERE id = $1"
        )
            .bind(id)
            .fetch_optional(pool)
            .await?
            .ok_or(AppError::NotFound("Organization license not found".to_string()))
    }

    /// Assign license to team member
    pub async fn assign_license_to_team_member(
        pool: &PgPool,
        org_license_id: i64,
        team_id: i64,
        user_id: i64,
    ) -> AppResult<TeamMemberLicenseAssignment> {
        let mut tx = pool.begin().await?;

        // Check available licenses
        let org_license = sqlx::query_as::<_, OrgProductLicense>(
            "SELECT * FROM org_product_licenses WHERE id = $1"
        )
            .bind(org_license_id)
            .fetch_one(&mut *tx)
            .await?;

        if org_license.available_count <= 0 {
            return Err(AppError::Conflict("No available licenses".to_string()));
        }

        // Generate license key
        let license_key = format!("LIC-{}-{}", org_license_id, uuid::Uuid::new_v4().to_string()[..8].to_uppercase());

        // Create assignment
        let assignment = sqlx::query_as::<_, TeamMemberLicenseAssignment>(
            r#"
            INSERT INTO team_member_license_assignments 
            (org_license_id, team_id, user_id, license_key)
            VALUES ($1, $2, $3, $4)
            RETURNING *
            "#
        )
            .bind(org_license_id)
            .bind(team_id)
            .bind(user_id)
            .bind(&license_key)
            .fetch_one(&mut *tx)
            .await?;

        // Update org license counts
        sqlx::query(
            r#"
            UPDATE org_product_licenses
            SET assigned_count = assigned_count + 1,
                available_count = available_count - 1,
                updated_at = NOW()
            WHERE id = $1
            "#
        )
            .bind(org_license_id)
            .execute(&mut *tx)
            .await?;

        tx.commit().await?;
        Ok(assignment)
    }

    /// Get team member license assignments for a team
    pub async fn get_team_member_licenses(pool: &PgPool, team_id: i64) -> AppResult<Vec<TeamMemberLicenseAssignment>> {
        let assignments = sqlx::query_as::<_, TeamMemberLicenseAssignment>(
            r#"
            SELECT * FROM team_member_license_assignments
            WHERE team_id = $1 AND revoked_at IS NULL
            ORDER BY assigned_at DESC
            "#
        )
            .bind(team_id)
            .fetch_all(pool)
            .await?;

        Ok(assignments)
    }

    /// Revoke license from team member
    pub async fn revoke_team_member_license(pool: &PgPool, assignment_id: i64) -> AppResult<()> {
        let mut tx = pool.begin().await?;

        // Get assignment
        let assignment = sqlx::query_as::<_, TeamMemberLicenseAssignment>(
            "SELECT * FROM team_member_license_assignments WHERE id = $1"
        )
            .bind(assignment_id)
            .fetch_one(&mut *tx)
            .await?;

        // Update assignment
        sqlx::query(
            r#"
            UPDATE team_member_license_assignments
            SET revoked_at = NOW()
            WHERE id = $1
            "#
        )
            .bind(assignment_id)
            .execute(&mut *tx)
            .await?;

        // Update org license counts
        sqlx::query(
            r#"
            UPDATE org_product_licenses
            SET assigned_count = assigned_count - 1,
                available_count = available_count + 1,
                updated_at = NOW()
            WHERE id = $1
            "#
        )
            .bind(assignment.org_license_id)
            .execute(&mut *tx)
            .await?;

        tx.commit().await?;
        Ok(())
    }
}
