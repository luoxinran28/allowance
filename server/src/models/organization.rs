use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use chrono::NaiveDateTime;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Organization {
    pub id: i64,
    pub org_id: String,
    pub name: String,
    pub description: Option<String>,
    pub created_by: i64,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Group {
    pub id: i64,
    pub group_id: String,
    pub organization_id: i64,
    pub name: String,
    pub description: Option<String>,
    pub created_by: i64,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct UserGroup {
    pub id: i64,
    pub user_id: i64,
    pub group_id: i64,
    pub role: String,  // 'member', 'leader', 'admin'
    pub created_at: NaiveDateTime,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateTeamRequest {
    pub name: String,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchOrganizationRequest {
    pub query: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchOrganizationResponse {
    pub organization: Organization,
    pub group_count: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ApplyOrganizationRequest {
    pub organization_id: i64,
}
