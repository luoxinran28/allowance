use sqlx::PgPool;

use crate::models::Product;
use crate::utils::errors::{AppError, AppResult};

/// Product service
pub struct ProductService;

impl ProductService {
    /// List all available products
    pub async fn list_products(pool: &PgPool) -> AppResult<Vec<Product>> {
        let products = sqlx::query_as::<_, Product>(
            "SELECT * FROM products ORDER BY created_at DESC"
        )
            .fetch_all(pool)
            .await?;

        Ok(products)
    }

    /// Get product by product_id
    pub async fn get_product_by_id(
        pool: &PgPool,
        product_id: &str,
    ) -> AppResult<Product> {
        sqlx::query_as::<_, Product>(
            "SELECT * FROM products WHERE product_id = $1"
        )
            .bind(product_id)
            .fetch_optional(pool)
            .await?
            .ok_or(AppError::ProductNotFound)
    }

    /// Get product version
    pub async fn get_product_version(
        pool: &PgPool,
        product_id: &str,
        version_name: &str,
    ) -> AppResult<sqlx::types::JsonValue> {
        let version = sqlx::query_scalar::<_, (i64, serde_json::Value, String, Option<i32>, Option<i32>)>(
            r#"
            SELECT pv.id, pv.features, pv.version_name, pv.daily_limit, pv.monthly_limit
            FROM product_versions pv
            JOIN products p ON pv.product_id = p.id
            WHERE p.product_id = $1 AND pv.version_name = $2
            "#
        )
            .bind(product_id)
            .bind(version_name)
            .fetch_optional(pool)
            .await?
            .ok_or(AppError::ProductNotFound)?;

        Ok(version.1)
    }
}
