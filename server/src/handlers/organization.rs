use std::sync::Arc;
use axum::{
    extract::{State, Json, Path, Query},
    http::HeaderMap,
};
use serde::Deserialize;

use crate::models::Organization;
use crate::services::OrganizationService;
use crate::utils::{AppResult, AppError};
use crate::handlers::auth::AuthHandler;

#[derive(Deserialize)]
pub struct CreateOrganizationRequest {
    pub name: String,
    pub description: Option<String>,
}

#[derive(Deserialize)]
pub struct UpdateOrganizationRequest {
    pub name: Option<String>,
    pub description: Option<String>,
}

#[derive(Deserialize)]
pub struct SearchOrganizationQuery {
    pub q: String,
}

#[derive(Deserialize)]
pub struct PaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
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

/// Create new organization
pub async fn create_organization(
    State(state): State<Arc<AuthHandler>>,
    headers: HeaderMap,
    Json(req): Json<CreateOrganizationRequest>,
) -> AppResult<Json<Organization>> {
    let user_id = extract_user_from_header(&state, &headers)?;

    let org = OrganizationService::create_organization(
        &state.pool,
        user_id,
        &req.name,
        req.description.as_deref(),
    )
    .await?;

    Ok(Json(org))
}

/// Get organization by ID
pub async fn get_organization(
    State(state): State<Arc<AuthHandler>>,
    Path(org_id): Path<i64>,
) -> AppResult<Json<Organization>> {
    let org = OrganizationService::get_organization(&state.pool, org_id).await?;
    Ok(Json(org))
}

/// List all organizations
pub async fn list_organizations(
    State(state): State<Arc<AuthHandler>>,
    Query(params): Query<PaginationParams>,
) -> AppResult<Json<serde_json::Value>> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(20);

    let (orgs, total) = OrganizationService::list_organizations(&state.pool, page, page_size).await?;

    Ok(Json(serde_json::json!({
        "organizations": orgs,
        "total": total,
        "page": page,
        "page_size": page_size
    })))
}

/// Search organizations
pub async fn search_organizations(
    State(state): State<Arc<AuthHandler>>,
    Query(params): Query<SearchOrganizationQuery>,
) -> AppResult<Json<Vec<Organization>>> {
    let orgs = OrganizationService::search_organizations(&state.pool, &params.q).await?;
    Ok(Json(orgs))
}

/// Get user's organizations
pub async fn get_user_organizations(
    State(state): State<Arc<AuthHandler>>,
    headers: HeaderMap,
) -> AppResult<Json<Vec<Organization>>> {
    let user_id = extract_user_from_header(&state, &headers)?;

    let orgs = OrganizationService::get_user_organizations(&state.pool, user_id).await?;
    Ok(Json(orgs))
}

/// Update organization
pub async fn update_organization(
    State(state): State<Arc<AuthHandler>>,
    headers: HeaderMap,
    Path(org_id): Path<i64>,
    Json(req): Json<UpdateOrganizationRequest>,
) -> AppResult<Json<Organization>> {
    let user_id = extract_user_from_header(&state, &headers)?;

    // Verify ownership
    let org = OrganizationService::get_organization(&state.pool, org_id).await?;
    if org.created_by != user_id {
        return Err(AppError::Forbidden);
    }

    let updated_org = OrganizationService::update_organization(
        &state.pool,
        org_id,
        req.name.as_deref(),
        req.description.as_deref(),
    )
    .await?;

    Ok(Json(updated_org))
}

/// Delete organization
pub async fn delete_organization(
    State(state): State<Arc<AuthHandler>>,
    headers: HeaderMap,
    Path(org_id): Path<i64>,
) -> AppResult<Json<serde_json::Value>> {
    let user_id = extract_user_from_header(&state, &headers)?;

    OrganizationService::delete_organization(&state.pool, org_id, user_id).await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "message": "Organization deleted successfully"
    })))
}
