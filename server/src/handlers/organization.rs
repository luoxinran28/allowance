use std::sync::Arc;
use axum::{
    extract::{State, Json, Path, Query},
    http::HeaderMap,
};
use serde::Deserialize;
use sqlx::Row;

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
) -> AppResult<(axum::http::StatusCode, Json<Organization>)> {
    let user_id = extract_user_from_header(&state, &headers)?;

    let org = OrganizationService::create_organization(
        &state.pool,
        user_id,
        &req.name,
        req.description.as_deref(),
    )
    .await?;

    Ok((axum::http::StatusCode::CREATED, Json(org)))
}

/// Get organization by ID with product licenses
pub async fn get_organization(
    State(state): State<Arc<AuthHandler>>,
    Path(org_id): Path<i64>,
) -> AppResult<Json<serde_json::Value>> {
    let org = OrganizationService::get_organization(&state.pool, org_id).await?;

    // Get product licenses for this organization
    let licenses = sqlx::query(
        r#"
        SELECT 
            opl.id,
            opl.organization_id,
            opl.product_id,
            opl.total_count,
            opl.available_count,
            opl.assigned_count,
            opl.expires_at,
            p.upid,
            p.name as product_name,
            p.description as product_description
        FROM org_product_licenses opl
        INNER JOIN products p ON opl.product_id = p.id
        WHERE opl.organization_id = $1
        ORDER BY opl.created_at DESC
        "#
    )
        .bind(org_id)
        .fetch_all(&*state.pool)
        .await?;

    let licenses_json: Vec<serde_json::Value> = licenses
        .iter()
        .map(|row| {
            serde_json::json!({
                "id": row.get::<i64, _>("id"),
                "product_id": row.get::<i64, _>("product_id"),
                "upid": row.get::<String, _>("upid"),
                "product_name": row.get::<String, _>("product_name"),
                "product_description": row.get::<Option<String>, _>("product_description"),
                "total_count": row.get::<i32, _>("total_count"),
                "available_count": row.get::<i32, _>("available_count"),
                "assigned_count": row.get::<i32, _>("assigned_count"),
                "expires_at": row.get::<chrono::NaiveDateTime, _>("expires_at").to_string(),
            })
        })
        .collect();

    Ok(Json(serde_json::json!({
        "id": org.id,
        "org_id": org.org_id,
        "name": org.name,
        "description": org.description,
        "created_by": org.created_by,
        "created_at": org.created_at,
        "updated_at": org.updated_at,
        "licenses": licenses_json,
        "license_count": licenses_json.len()
    })))
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
