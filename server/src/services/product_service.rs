use sqlx::PgPool;

use crate::models::{Product, ProductVersion, License};
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

    /// Get user licenses (only active ones)
    pub async fn get_user_licenses(pool: &PgPool, user_id: i64) -> AppResult<Vec<License>> {
        eprintln!("[ProductService::get_user_licenses] Fetching licenses for user_id: {}", user_id);
        let licenses = sqlx::query_as::<_, License>(
            r#"
            SELECT * FROM user_licenses
            WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > NOW()
            ORDER BY created_at DESC
            "#
        )
            .bind(user_id)
            .fetch_all(pool)
            .await?;

        eprintln!("[ProductService::get_user_licenses] Found {} licenses", licenses.len());
        Ok(licenses)
    }

    /// Get license by ID
    pub async fn get_license_by_id(pool: &PgPool, id: i64) -> AppResult<License> {
        sqlx::query_as::<_, License>("SELECT * FROM user_licenses WHERE id = $1")
            .bind(id)
            .fetch_optional(pool)
            .await?
            .ok_or(AppError::NotFound("License not found".to_string()))
    }

    /// Get license by key
    pub async fn get_license_by_key(pool: &PgPool, license_key: &str) -> AppResult<License> {
        sqlx::query_as::<_, License>("SELECT * FROM user_licenses WHERE license_key = $1")
            .bind(license_key)
            .fetch_optional(pool)
            .await?
            .ok_or(AppError::NotFound("License not found".to_string()))
    }
}
