use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use chrono::{DateTime, Utc};

// ============= Models =============

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Product {
    pub id: i64,
    pub upid: String,
    pub product_slug: String,
    pub name: String,
    pub description: Option<String>,
    pub owner_id: Option<i64>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct License {
    pub id: i64,
    pub upid: String,
    pub org_id: i64,
    pub issued_at: DateTime<Utc>,
    pub expires_at: DateTime<Utc>,
    pub max_users: i32,
    pub current_users: i32,
    pub revoked: bool,
    pub created_by: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct UserLicense {
    pub id: i64,
    pub user_id: i64,
    pub license_id: i64,
    pub assigned_at: DateTime<Utc>,
    pub assigned_by: i64,
    pub revoked_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct LicenseApproval {
    pub id: i64,
    pub user_id: i64,
    pub license_id: i64,
    pub status: String,
    pub requested_at: DateTime<Utc>,
    pub approver_id: Option<i64>,
    pub approved_at: Option<DateTime<Utc>>,
    pub remarks: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// ============= Response DTOs =============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductResponse {
    pub id: i64,
    pub upid: String,
    pub product_slug: String,
    pub name: String,
    pub description: Option<String>,
}

impl From<Product> for ProductResponse {
    fn from(product: Product) -> Self {
        ProductResponse {
            id: product.id,
            upid: product.upid,
            product_slug: product.product_slug,
            name: product.name,
            description: product.description,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LicenseResponse {
    pub id: i64,
    pub upid: String,
    pub expires_at: DateTime<Utc>,
    pub max_users: i32,
    pub current_users: i32,
    pub revoked: bool,
}

impl From<License> for LicenseResponse {
    fn from(license: License) -> Self {
        LicenseResponse {
            id: license.id,
            upid: license.upid,
            expires_at: license.expires_at,
            max_users: license.max_users,
            current_users: license.current_users,
            revoked: license.revoked,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LicenseApprovalResponse {
    pub id: i64,
    pub user_id: i64,
    pub license_id: i64,
    pub status: String,
    pub requested_at: DateTime<Utc>,
    pub approved_at: Option<DateTime<Utc>>,
}

impl From<LicenseApproval> for LicenseApprovalResponse {
    fn from(approval: LicenseApproval) -> Self {
        LicenseApprovalResponse {
            id: approval.id,
            user_id: approval.user_id,
            license_id: approval.license_id,
            status: approval.status,
            requested_at: approval.requested_at,
            approved_at: approval.approved_at,
        }
    }
}

// ============= Request DTOs =============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateProductRequest {
    pub product_slug: String,
    pub tier: String,
    pub name: String,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateLicenseRequest {
    pub upid: String,
    pub org_id: i64,
    pub issued_at: DateTime<Utc>,
    pub expires_at: DateTime<Utc>,
    pub max_users: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssignLicenseRequest {
    pub user_id: i64,
    pub license_id: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RequestLicenseRequest {
    pub license_id: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApproveLicenseRequest {
    pub status: String,
    pub remarks: Option<String>,
}

// ============= Legacy License Claims (for backward compatibility) =============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LicenseClaims {
    pub user_id: i64,
    pub product_id: String,
    pub version_name: String,
    pub tier: String,
    pub expires_at: i64,
    pub daily_limit: Option<i32>,
    pub monthly_limit: Option<i32>,
    pub iat: i64,
    pub exp: i64,
}
