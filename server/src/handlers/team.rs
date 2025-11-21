use std::sync::Arc;
use axum::{
    extract::{State, Json, Path},
    http::HeaderMap,
};
use sqlx::Row;

use crate::models::{Group, UserGroup};
use crate::services::TeamService;
use crate::utils::{AppResult, AppError};
use crate::handlers::auth::AuthHandler;

#[derive(serde::Deserialize)]
pub struct CreateTeamRequest {
    pub name: String,
    pub description: Option<String>,
    pub organization_id: Option<i64>,
}

#[derive(serde::Deserialize)]
pub struct AddMemberRequest {
    pub user_id: i64,
    pub role: Option<String>,
}

#[derive(serde::Deserialize)]
pub struct UpdateMemberRoleRequest {
    pub role: String,
}

/// Helper to extract user_id from Authorization header
fn extract_user_from_header(state: &AuthHandler, headers: &HeaderMap) -> AppResult<i64> {
    let auth_header = headers
        .get("authorization")
        .and_then(|h| h.to_str().ok())
        .ok_or(AppError::Unauthorized)?;

    if !auth_header.starts_with("Bearer ") {
        return Err(AppError::Unauthorized);
    }

    let token = &auth_header[7..];
    let claims = state.jwt.verify_token(token)?;
    Ok(claims.user_id)
}

/// Create a new team
pub async fn create_team(
    State(state): State<Arc<AuthHandler>>,
    headers: HeaderMap,
    Json(req): Json<CreateTeamRequest>,
) -> AppResult<Json<Group>> {
    let user_id = extract_user_from_header(&state, &headers)?;

    // If organization_id not provided, create a default organization for the user
    let org_id = if let Some(org_id) = req.organization_id {
        org_id
    } else {
        // Get or create default organization
        let org: (i64,) = sqlx::query_as(
            "SELECT id FROM organizations WHERE created_by = $1 LIMIT 1"
        )
            .bind(user_id)
            .fetch_optional(state.pool.as_ref())
            .await?
            .map(|(id,)| (id,))
            .ok_or_else(|| AppError::BadRequest("No organization found. Please create one first.".to_string()))?;
        org.0
    };

    let team = TeamService::create_team(
        &state.pool,
        user_id,
        org_id,
        &req.name,
        req.description.as_deref(),
    )
    .await?;

    Ok(Json(team))
}

/// List user's teams
pub async fn list_teams(
    State(state): State<Arc<AuthHandler>>,
    headers: HeaderMap,
) -> AppResult<Json<Vec<Group>>> {
    let user_id = extract_user_from_header(&state, &headers)?;

    let teams = TeamService::list_user_teams(&state.pool, user_id).await?;
    Ok(Json(teams))
}

/// Get team details
pub async fn get_team(
    State(state): State<Arc<AuthHandler>>,
    Path(team_id): Path<i64>,
) -> AppResult<Json<Group>> {
    let team = TeamService::get_team(&state.pool, team_id).await?;
    Ok(Json(team))
}

/// Add member to team
pub async fn add_member(
    State(state): State<Arc<AuthHandler>>,
    headers: HeaderMap,
    Path(team_id): Path<i64>,
    Json(req): Json<AddMemberRequest>,
) -> AppResult<Json<serde_json::Value>> {
    let _user_id = extract_user_from_header(&state, &headers)?;

    let role = req.role.as_deref().unwrap_or("member");
    TeamService::add_member(&state.pool, req.user_id, team_id, role).await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Member added successfully"
    })))
}

/// List team members
pub async fn list_members(
    State(state): State<Arc<AuthHandler>>,
    Path(team_id): Path<i64>,
) -> AppResult<Json<Vec<UserGroup>>> {
    let members = TeamService::list_team_members(&state.pool, team_id).await?;
    Ok(Json(members))
}

/// Remove member from team
pub async fn remove_member(
    State(state): State<Arc<AuthHandler>>,
    headers: HeaderMap,
    Path((team_id, user_id)): Path<(i64, i64)>,
) -> AppResult<Json<serde_json::Value>> {
    let _requester_id = extract_user_from_header(&state, &headers)?;

    TeamService::remove_member(&state.pool, user_id, team_id).await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Member removed successfully"
    })))
}

/// Update member role
pub async fn update_member_role(
    State(state): State<Arc<AuthHandler>>,
    headers: HeaderMap,
    Path((team_id, user_id)): Path<(i64, i64)>,
    Json(req): Json<UpdateMemberRoleRequest>,
) -> AppResult<Json<serde_json::Value>> {
    let _requester_id = extract_user_from_header(&state, &headers)?;

    TeamService::update_member_role(&state.pool, user_id, team_id, &req.role).await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Member role updated successfully"
    })))
}
