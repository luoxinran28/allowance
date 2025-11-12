use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;
use crate::utils::AppResult;

/// Initialize database connection pool
pub async fn init_pool(database_url: &str) -> AppResult<PgPool> {
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(database_url)
        .await?;

    // Run migrations
    sqlx::migrate!()
        .run(&pool)
        .await
        .map_err(|e| {
            tracing::error!("Migration failed: {}", e);
            crate::utils::AppError::DatabaseError(e.into())
        })?;

    Ok(pool)
}

/// Verify database connection
pub async fn verify_connection(pool: &PgPool) -> AppResult<()> {
    pool.acquire().await?;
    Ok(())
}
