use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use chrono::NaiveDateTime;

fn serialize_naive_datetime<S>(dt: &NaiveDateTime, serializer: S) -> Result<S::Ok, S::Error>
where
    S: serde::Serializer,
{
    serializer.serialize_str(&dt.to_string())
}

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
    #[sqlx(default)]
    pub created_at: NaiveDateTime,
    #[sqlx(default)]
    pub updated_at: NaiveDateTime,
    pub expires_at: Option<NaiveDateTime>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ApprovalResponse {
    pub id: i64,
    pub request_type: String,
    pub status: String,
    #[serde(serialize_with = "serialize_naive_datetime")]
    pub created_at: NaiveDateTime,
    #[serde(serialize_with = "serialize_naive_datetime")]
    pub updated_at: NaiveDateTime,
}
