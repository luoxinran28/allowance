use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use chrono::NaiveDateTime;

// ============= Models =============

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Product {
    pub id: i64,
    pub upid: String,
    pub product_slug: String,
    pub name: String,
    pub description: Option<String>,
    pub owner_id: Option<i64>,
    /// Per-product JWT signing key (HS256, 64 hex chars)
    /// Used by Allowance to sign tokens, fetched by consumer products to verify
    #[serde(skip_serializing)]
    pub jwt_signing_key: String,
    /// Key rotation version (monotonically increasing)
    #[serde(skip_serializing)]
    pub key_version: i32,
    /// When the key was last rotated
    pub key_rotated_at: Option<NaiveDateTime>,
    #[sqlx(default)]
    pub created_at: NaiveDateTime,
    #[sqlx(default)]
    pub updated_at: NaiveDateTime,
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
    #[sqlx(default)]
    pub created_at: NaiveDateTime,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct License {
    pub id: i64,
    pub user_id: i64,
    pub product_version_id: i64,
    pub license_key: String,
    #[sqlx(default)]
    pub starts_at: NaiveDateTime,
    #[sqlx(default)]
    pub expires_at: NaiveDateTime,
    pub daily_usage: i32,
    pub monthly_usage: i32,
    pub last_used_at: Option<NaiveDateTime>,
    pub revoked_at: Option<NaiveDateTime>,
    pub metadata: Option<serde_json::Value>,
    #[sqlx(default)]
    pub created_at: NaiveDateTime,
    #[sqlx(default)]
    pub updated_at: NaiveDateTime,
    pub upid: Option<String>,
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
    pub user_id: i64,
    pub product_version_id: i64,
    pub license_key: String,
    #[serde(serialize_with = "serialize_naive_datetime")]
    pub starts_at: NaiveDateTime,
    #[serde(serialize_with = "serialize_naive_datetime")]
    pub expires_at: NaiveDateTime,
    pub daily_usage: i32,
    pub monthly_usage: i32,
    pub revoked_at: Option<NaiveDateTime>,
}

fn serialize_naive_datetime<S>(dt: &NaiveDateTime, serializer: S) -> Result<S::Ok, S::Error>
where
    S: serde::Serializer,
{
    serializer.serialize_str(&dt.to_string())
}

impl From<License> for LicenseResponse {
    fn from(license: License) -> Self {
        LicenseResponse {
            id: license.id,
            user_id: license.user_id,
            product_version_id: license.product_version_id,
            license_key: license.license_key,
            starts_at: license.starts_at,
            expires_at: license.expires_at,
            daily_usage: license.daily_usage,
            monthly_usage: license.monthly_usage,
            revoked_at: license.revoked_at,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateProductRequest;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateLicenseRequest;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssignLicenseRequest;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RequestLicenseRequest;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApproveLicenseRequest;

// ============= Organization Product Licenses =============

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct OrgProductLicense {
    pub id: i64,
    pub organization_id: i64,
    pub product_id: i64,
    pub total_count: i32,
    pub assigned_count: i32,
    pub available_count: i32,
    pub expires_at: NaiveDateTime,
    pub created_by: i64,
    #[sqlx(default)]
    pub created_at: NaiveDateTime,
    #[sqlx(default)]
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct TeamMemberLicenseAssignment {
    pub id: i64,
    pub org_license_id: i64,
    pub team_id: i64,
    pub user_id: i64,
    pub license_key: String,
    pub assigned_at: NaiveDateTime,
    pub revoked_at: Option<NaiveDateTime>,
    #[sqlx(default)]
    pub created_at: NaiveDateTime,
}

// ============= Request DTOs =============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateProductAdminRequest {
    pub name: String,
    pub product_slug: String,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerateLicensesRequest {
    pub product_id: i64,
    pub organization_id: i64,
    pub count: i32,
    pub expires_in_days: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssignLicenseToTeamRequest {
    pub org_license_id: i64,
    pub user_id: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrgProductLicenseResponse {
    pub id: i64,
    pub organization_id: i64,
    pub product_id: i64,
    pub total_count: i32,
    pub assigned_count: i32,
    pub available_count: i32,
    #[serde(serialize_with = "serialize_naive_datetime")]
    pub expires_at: NaiveDateTime,
    pub created_by: i64,
}

impl From<OrgProductLicense> for OrgProductLicenseResponse {
    fn from(license: OrgProductLicense) -> Self {
        OrgProductLicenseResponse {
            id: license.id,
            organization_id: license.organization_id,
            product_id: license.product_id,
            total_count: license.total_count,
            assigned_count: license.assigned_count,
            available_count: license.available_count,
            expires_at: license.expires_at,
            created_by: license.created_by,
        }
    }
}

// ============= License JWT Claims =============
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