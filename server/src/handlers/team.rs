use std::sync::Arc;
use axum::{
    extract::{State, Json, Path},
    http::{HeaderMap, StatusCode},
};
use serde::Serialize;

use crate::models::{Team, UserTeam, AssignLicenseToTeamRequest};
use crate::services::{TeamService, ProductService, UserGroupService};
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
    pub product_upids: Vec<String>,
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
) -> AppResult<(StatusCode, Json<Team>)> {
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

    Ok((StatusCode::CREATED, Json(team)))
}

/// List user's teams
pub async fn list_teams(
    State(state): State<Arc<AuthHandler>>,
    headers: HeaderMap,
) -> AppResult<Json<Vec<Team>>> {
    let user_id = extract_user_from_header(&state, &headers)?;

    let teams = TeamService::list_user_teams(&state.pool, user_id).await?;
    Ok(Json(teams))
}

/// Get team details
pub async fn get_team(
    State(state): State<Arc<AuthHandler>>,
    Path(team_id): Path<i64>,
) -> AppResult<Json<Team>> {
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
    let user_id = extract_user_from_header(&state, &headers)?;

    let role = req.role.as_deref().unwrap_or("member");
    TeamService::add_member(&state.pool, req.user_id, team_id, role, req.product_upids, user_id).await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Member added successfully"
    })))
}

/// List team members
pub async fn list_members(
    State(state): State<Arc<AuthHandler>>,
    Path(team_id): Path<i64>,
) -> AppResult<Json<Vec<crate::models::TeamMemberResponse>>> {
    let members = UserGroupService::list_team_members(&state.pool, team_id).await?;
    Ok(Json(members))
}

/// Remove member from team
pub async fn remove_member(
    State(state): State<Arc<AuthHandler>>,
    headers: HeaderMap,
    Path((team_id, user_id)): Path<(i64, i64)>,
) -> AppResult<Json<serde_json::Value>> {
    let requester_id = extract_user_from_header(&state, &headers)?;

    TeamService::remove_member(&state.pool, user_id, team_id, requester_id).await?;

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

// ============= TEAM LEAD LICENSE MANAGEMENT =============

#[derive(Serialize)]
pub struct TeamMemberLicenseResponse {
    pub id: i64,
    pub user_id: i64,
    pub license_key: String,
    pub assigned_at: String,
    pub revoked_at: Option<String>,
}

/// Get licenses assigned to team (team lead only)
pub async fn get_team_licenses(
    State(state): State<Arc<AuthHandler>>,
    headers: HeaderMap,
    Path(team_id): Path<i64>,
) -> AppResult<Json<serde_json::Value>> {
    let user_id = extract_user_from_header(&state, &headers)?;

    // Check if user is team lead
    let is_lead: bool = sqlx::query_scalar(
        "SELECT COUNT(*) > 0 FROM user_teams WHERE team_id = $1 AND user_id = $2 AND role IN ('leader', 'admin')"
    )
        .bind(team_id)
        .bind(user_id)
        .fetch_one(state.pool.as_ref())
        .await?;

    if !is_lead {
        return Err(AppError::PermissionDenied);
    }

    // Get all org licenses available to this team's organization
    let org_licenses = sqlx::query_as::<_, (i64, i64, i64, i32, i32, i32)>(
        r#"
        SELECT opl.id, opl.organization_id, opl.product_id, opl.total_count, opl.assigned_count, opl.available_count
        FROM org_product_licenses opl
        JOIN teams t ON t.organization_id = opl.organization_id
        WHERE t.id = $1 AND opl.expires_at > NOW()
        "#
    )
        .bind(team_id)
        .fetch_all(state.pool.as_ref())
        .await?;

    // Get team member assignments
    let assignments = ProductService::get_team_member_licenses(&state.pool, team_id).await?;

    Ok(Json(serde_json::json!({
        "org_licenses": org_licenses.into_iter().map(|(id, org_id, prod_id, total, assigned, available)| {
            serde_json::json!({
                "id": id,
                "organization_id": org_id,
                "product_id": prod_id,
                "total_count": total,
                "assigned_count": assigned,
                "available_count": available,
            })
        }).collect::<Vec<_>>(),
        "team_member_assignments": assignments.into_iter().map(|a| {
            serde_json::json!({
                "id": a.id,
                "user_id": a.user_id,
                "license_key": a.license_key,
                "assigned_at": a.assigned_at.to_string(),
                "revoked_at": a.revoked_at.map(|dt| dt.to_string()),
            })
        }).collect::<Vec<_>>(),
    })))
}

/// Assign license to team member (team lead only)
pub async fn assign_license_to_member(
    State(state): State<Arc<AuthHandler>>,
    headers: HeaderMap,
    Path(team_id): Path<i64>,
    Json(req): Json<AssignLicenseToTeamRequest>,
) -> AppResult<Json<serde_json::Value>> {
    let user_id = extract_user_from_header(&state, &headers)?;

    // Check if user is team lead
    let is_lead: bool = sqlx::query_scalar(
        "SELECT COUNT(*) > 0 FROM user_teams WHERE team_id = $1 AND user_id = $2 AND role IN ('leader', 'admin')"
    )
        .bind(team_id)
        .bind(user_id)
        .fetch_one(state.pool.as_ref())
        .await?;

    if !is_lead {
        return Err(AppError::PermissionDenied);
    }

    // Assign license
    let assignment = ProductService::assign_license_to_team_member(
        &state.pool,
        req.org_license_id,
        team_id,
        req.user_id,
    ).await?;

    Ok(Json(serde_json::json!({
        "id": assignment.id,
        "user_id": assignment.user_id,
        "license_key": assignment.license_key,
        "assigned_at": assignment.assigned_at.to_string(),
    })))
}

/// Revoke license from team member (team lead only)
pub async fn revoke_license_from_member(
    State(state): State<Arc<AuthHandler>>,
    headers: HeaderMap,
    Path((team_id, assignment_id)): Path<(i64, i64)>,
) -> AppResult<Json<serde_json::Value>> {
    let user_id = extract_user_from_header(&state, &headers)?;

    // Check if user is team lead
    let is_lead: bool = sqlx::query_scalar(
        "SELECT COUNT(*) > 0 FROM user_teams WHERE team_id = $1 AND user_id = $2 AND role IN ('leader', 'admin')"
    )
        .bind(team_id)
        .bind(user_id)
        .fetch_one(state.pool.as_ref())
        .await?;

    if !is_lead {
        return Err(AppError::PermissionDenied);
    }

    // Revoke license
    ProductService::revoke_team_member_license(&state.pool, assignment_id).await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "message": "License revoked successfully"
    })))
}

/// Promote team member to lead (team admin only)
pub async fn promote_member_to_lead(
    State(state): State<Arc<AuthHandler>>,
    headers: HeaderMap,
    Path((team_id, user_id)): Path<(i64, i64)>,
) -> AppResult<Json<serde_json::Value>> {
    let requester_id = extract_user_from_header(&state, &headers)?;

    // Check if requester is team admin
    let is_admin: bool = sqlx::query_scalar(
        "SELECT COUNT(*) > 0 FROM user_teams WHERE team_id = $1 AND user_id = $2 AND role = 'admin'"
    )
        .bind(team_id)
        .bind(requester_id)
        .fetch_one(state.pool.as_ref())
        .await?;

    if !is_admin {
        return Err(AppError::PermissionDenied);
    }

    // Check if user is already in team
    let exists: bool = sqlx::query_scalar(
        "SELECT COUNT(*) > 0 FROM user_teams WHERE team_id = $1 AND user_id = $2"
    )
        .bind(team_id)
        .bind(user_id)
        .fetch_one(state.pool.as_ref())
        .await?;

    if !exists {
        return Err(AppError::BadRequest("User is not a member of this team".to_string()));
    }

    // Update user role to leader
    sqlx::query("UPDATE user_teams SET role = 'leader' WHERE team_id = $1 AND user_id = $2")
        .bind(team_id)
        .bind(user_id)
        .execute(state.pool.as_ref())
        .await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Team member promoted to lead successfully"
    })))
}

/// Demote team lead to member (team admin only)
pub async fn demote_lead_to_member(
    State(state): State<Arc<AuthHandler>>,
    headers: HeaderMap,
    Path((team_id, user_id)): Path<(i64, i64)>,
) -> AppResult<Json<serde_json::Value>> {
    let requester_id = extract_user_from_header(&state, &headers)?;

    // Check if requester is team admin
    let is_admin: bool = sqlx::query_scalar(
        "SELECT COUNT(*) > 0 FROM user_teams WHERE team_id = $1 AND user_id = $2 AND role = 'admin'"
    )
        .bind(team_id)
        .bind(requester_id)
        .fetch_one(state.pool.as_ref())
        .await?;

    if !is_admin {
        return Err(AppError::PermissionDenied);
    }

    // Check if user is a lead
    let is_lead: bool = sqlx::query_scalar(
        "SELECT COUNT(*) > 0 FROM user_teams WHERE team_id = $1 AND user_id = $2 AND role = 'leader'"
    )
        .bind(team_id)
        .bind(user_id)
        .fetch_one(state.pool.as_ref())
        .await?;

    if !is_lead {
        return Err(AppError::BadRequest("User is not a team lead".to_string()));
    }

    // Update user role to member
    sqlx::query("UPDATE user_teams SET role = 'member' WHERE team_id = $1 AND user_id = $2")
        .bind(team_id)
        .bind(user_id)
        .execute(state.pool.as_ref())
        .await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Team lead demoted to member successfully"
    })))
}
