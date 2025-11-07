use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Product {
    pub id: i64,
    pub product_id: String,
    pub name: String,
    pub description: Option<String>,
    pub owner_id: Option<i64>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ProductVersion {
    pub id: i64,
    pub product_id: i64,
    pub version_name: String,
    pub description: Option<String>,
    pub features: Option<serde_json::Value>,
    pub tier_required: String,
    pub daily_limit: Option<i32>,
    pub monthly_limit: Option<i32>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ProductWithVersions {
    pub product: Product,
    pub versions: Vec<ProductVersion>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerateLicenseRequest {
    pub product_id: String,
    pub version_name: String,
    pub days_valid: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LicenseResponse {
    pub license_key: String,
    pub product_id: String,
    pub version_name: String,
    pub expires_at: DateTime<Utc>,
    pub features: Option<serde_json::Value>,
    pub daily_limit: Option<i32>,
}

// License claims for JWT verification
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LicenseClaims {
    pub user_id: i64,
    pub product_id: String,
    pub version_name: String,
    pub tier: String,
    pub expires_at: i64,  // Unix timestamp
    pub daily_limit: Option<i32>,
    pub monthly_limit: Option<i32>,
    pub iat: i64,
    pub exp: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct UserLicense {
    pub id: i64,
    pub user_id: i64,
    pub product_version_id: i64,
    pub license_key: String,
    pub starts_at: DateTime<Utc>,
    pub expires_at: DateTime<Utc>,
    pub daily_usage: i32,
    pub monthly_usage: i32,
    pub last_used_at: Option<DateTime<Utc>>,
    pub revoked_at: Option<DateTime<Utc>>,
    pub metadata: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
