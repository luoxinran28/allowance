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
pub struct Team {
    pub id: i64,
    pub team_id: String,
    pub organization_id: i64,
    pub name: String,
    pub description: Option<String>,
    pub created_by: i64,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

// Backward compatibility alias
pub type Group = Team;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct UserTeam {
    pub id: i64,
    pub user_id: i64,
    pub team_id: i64,
    pub role: String,  // 'member', 'leader', 'admin'
    pub created_at: NaiveDateTime,
}

// Backward compatibility alias
pub type UserGroup = UserTeam;

/// Organization boss relationship (premium tier users who manage an organization)
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct OrganizationBoss {
    pub id: i64,
    pub organization_id: i64,
    pub user_id: i64,
    pub assigned_by: Option<i64>,
    pub assigned_at: NaiveDateTime,
    pub notes: Option<String>,
    // Joined user fields
    pub user_uid: String,
    pub user_email: String,
    pub user_tier: String,
}

/// Simplified user info for boss candidate selection
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct BossCandidate {
    pub id: i64,
    pub uid: String,
    pub email: String,
    pub tier: String,
    pub status: String,
    pub organization_id: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AddOrganizationBossRequest {
    pub user_id: i64,
    pub notes: Option<String>,
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
    pub team_count: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ApplyOrganizationRequest {
    pub organization_id: i64,
}
