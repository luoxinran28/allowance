use sqlx::PgPool;
use uuid::Uuid;
use crate::models::FreeUserLicense;
use crate::utils::AppResult;

pub struct FreeUserService;

impl FreeUserService {
    pub async fn create_free_license(
        pool: impl sqlx::Executor<'_, Database = sqlx::Postgres>,
        user_id: i64,
        product_id: i64,
        upid: &str,
    ) -> AppResult<FreeUserLicense> {
        let license_key = format!("free-{}-{}", Uuid::new_v4().simple(), upid);
        
        let license = sqlx::query_as::<_, FreeUserLicense>(
            r#"
            INSERT INTO free_user_licenses (user_id, product_id, upid, license_key)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (user_id, product_id) DO NOTHING
            RETURNING *
            "#
        )
        .bind(user_id)
        .bind(product_id)
        .bind(upid)
        .bind(&license_key)
        .fetch_one(pool)
        .await?;

        Ok(license)
    }

    pub async fn revoke_free_license(pool: impl sqlx::Executor<'_, Database = sqlx::Postgres>, user_id: i64) -> AppResult<()> {
        sqlx::query("DELETE FROM free_user_licenses WHERE user_id = $1")
            .bind(user_id)
            .execute(pool)
            .await?;

        Ok(())
    }

    pub async fn restore_free_license(
        pool: &PgPool,
        user_id: i64,
        upid: &str,
    ) -> AppResult<FreeUserLicense> {
        let product_id: i64 = sqlx::query_scalar("SELECT id FROM products WHERE upid = $1")
            .bind(upid)
            .fetch_one(pool)
            .await?;

        Self::create_free_license(pool, user_id, product_id, upid).await
    }

    pub async fn delete_free_users(pool: &PgPool, user_ids: Vec<i64>) -> AppResult<i64> {
        let result = sqlx::query("DELETE FROM users WHERE id = ANY($1) AND tier = 'free'")
            .bind(&user_ids)
            .execute(pool)
            .await?;

        Ok(result.rows_affected() as i64)
    }
}
