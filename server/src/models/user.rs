use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use chrono::NaiveDateTime;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, sqlx::Type)]
#[sqlx(type_name = "user_status")]
pub enum UserStatus {
    #[serde(rename = "active")]
    #[sqlx(rename = "active")]
    Active,
    #[serde(rename = "inactive")]
    #[sqlx(rename = "inactive")]
    Inactive,
    #[serde(rename = "suspended")]
    #[sqlx(rename = "suspended")]
    Suspended,
}

impl std::str::FromStr for UserStatus {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "active" => Ok(UserStatus::Active),
            "inactive" => Ok(UserStatus::Inactive),
            "suspended" => Ok(UserStatus::Suspended),
            _ => Err(format!("Unknown user status: {}", s)),
        }
    }
}

impl std::fmt::Display for UserStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            UserStatus::Active => write!(f, "active"),
            UserStatus::Inactive => write!(f, "inactive"),
            UserStatus::Suspended => write!(f, "suspended"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, sqlx::Type)]
#[sqlx(type_name = "user_tier")]
pub enum UserTier {
    #[serde(rename = "free")]
    #[sqlx(rename = "free")]
    Free,
    #[serde(rename = "standard")]
    #[sqlx(rename = "standard")]
    Standard,
    #[serde(rename = "premium")]
    #[sqlx(rename = "premium")]
    Premium,
    #[serde(rename = "allstar")]
    #[sqlx(rename = "allstar")]
    Allstar,
}

impl std::str::FromStr for UserTier {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "free" => Ok(UserTier::Free),
            "standard" => Ok(UserTier::Standard),
            "premium" => Ok(UserTier::Premium),
            "allstar" => Ok(UserTier::Allstar),
            _ => Err(format!("Unknown user tier: {}", s)),
        }
    }
}

impl std::fmt::Display for UserTier {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            UserTier::Free => write!(f, "free"),
            UserTier::Standard => write!(f, "standard"),
            UserTier::Premium => write!(f, "premium"),
            UserTier::Allstar => write!(f, "allstar"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct User {
    pub id: i64,
    pub uid: String,
    pub email: String,
    #[serde(skip)]
    pub password_hash: String,
    pub tier: UserTier,
    pub status: UserStatus,
    pub organization_id: Option<i64>,
    pub team_ids: Option<serde_json::Value>,  // JSON array: [1, 2, 3]
    pub license_status: Option<String>,       // valid, expired, not_assigned
    pub source_upid: Option<String>,
    pub profile_data: Option<serde_json::Value>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
    pub last_login: Option<NaiveDateTime>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserResponse {
    pub id: i64,
    pub uid: String,
    pub email: String,
    pub tier: UserTier,
    pub status: UserStatus,
    pub created_at: NaiveDateTime,
    pub roles: Option<Vec<String>>,
}

impl From<User> for UserResponse {
    fn from(user: User) -> Self {
        UserResponse {
            id: user.id,
            uid: user.uid,
            email: user.email,
            tier: user.tier,
            status: user.status,
            created_at: user.created_at,
            roles: None,
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RegisterRequest {
    pub email: String,
    pub password: String,
    pub source_upid: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
    pub upid: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AuthResponse {
    pub user: UserResponse,
    pub token: String,
    pub refresh_token: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ActivateRequest {
    pub token: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RequestPasswordResetRequest {
    pub email: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ResetPasswordRequest {
    pub token: String,
    pub new_password: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct EmailToken {
    pub id: i64,
    pub user_id: Option<i64>,
    pub token: String,
    pub token_type: String,
    pub email: Option<String>,
    pub expires_at: NaiveDateTime,
    pub used_at: Option<NaiveDateTime>,
    pub created_at: NaiveDateTime,
}
