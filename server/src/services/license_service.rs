use sqlx::PgPool;
use chrono::Utc;

use crate::utils::{
    license::generate_license_token,
    errors::{AppError, AppResult},
};

/// License service for product authorization (Legacy - deprecated)
/// 
/// Use ProductService for new UPID-based license management instead.
/// This file is kept for backward compatibility during migration.
pub struct LicenseService;

impl LicenseService {
    /// Generate product license for user (Legacy - deprecated)
    /// 
    /// New code should use ProductService::create_license and ::assign_license instead.
    #[deprecated(since = "0.2.0", note = "Use ProductService::create_license instead")]
    pub async fn generate_license(
        _pool: &PgPool,
        _user_id: i64,
        _product_version_id: i64,
        _days_valid: i32,
        _jwt_secret: &str,
    ) -> AppResult<String> {
        Err(AppError::NotFound("Legacy license generation not implemented. Use new UPID-based license system.".to_string()))
    }
}
