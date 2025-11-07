use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ApprovalRequest {
    pub id: i64,
    pub request_type: String,  // 'org_binding', 'team_join', etc.
    pub requester_id: i64,
    pub target_id: Option<i64>,
    pub target_data: Option<serde_json::Value>,
    pub status: String,  // 'pending', 'approved', 'rejected'
    pub approved_by: Option<i64>,
    pub rejection_reason: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub expires_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ApprovalResponse {
    pub id: i64,
    pub request_type: String,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
