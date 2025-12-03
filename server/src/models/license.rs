use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use chrono::NaiveDateTime;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct FreeUserLicense {
    pub id: i64,
    pub user_id: i64,
    pub product_id: i64,
    pub upid: String,
    pub license_key: String,
    pub created_at: NaiveDateTime,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct TeamProductQuota {
    pub id: i64,
    pub team_id: i64,
    pub org_id: i64,
    pub product_id: i64,
    pub upid: String,
    pub allocated_count: i32,
    pub used_count: i32,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct UserLicenseHistory {
    pub id: i64,
    pub user_id: i64,
    pub product_id: Option<i64>,
    pub team_id: Option<i64>,
    pub action: String,
    pub old_tier: Option<String>,
    pub new_tier: Option<String>,
    pub old_count: Option<i32>,
    pub new_count: Option<i32>,
    pub reason: Option<String>,
    pub changed_by: Option<i64>,
    pub changed_at: NaiveDateTime,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TeamQuotaResponse {
    pub id: i64,
    pub team_id: i64,
    pub team_name: String,
    pub org_id: i64,
    pub product_id: i64,
    pub product_name: String,
    pub upid: String,
    pub allocated_count: i32,
    pub used_count: i32,
    pub available_count: i32,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct TeamMemberResponse {
    pub user_id: i64,
    pub uid: String,
    pub email: String,
    pub tier: String,
    pub role: String,
    #[sqlx(skip)]
    pub products: Vec<String>,
}

