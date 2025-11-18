use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;
use crate::utils::AppResult;

/// Initialize database connection pool
pub async fn init_pool(database_url: &str) -> AppResult<PgPool> {
    eprintln!("Initializing database pool...");
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(database_url)
        .await
        .map_err(|e| {
            eprintln!("Failed to connect to database: {:?}", e);
            crate::utils::AppError::DatabaseError(e.into())
        })?;

    eprintln!("Database pool created successfully");
    eprintln!("Skipping migrations - using pre-created schema");
    
    eprintln!("Database initialization complete");
    Ok(pool)
}

/// Verify database connection
pub async fn verify_connection(pool: &PgPool) -> AppResult<()> {
    pool.acquire().await?;
    Ok(())
}
