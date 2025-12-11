use axum::{
    extract::{Path, State},
    http::{StatusCode, HeaderMap},
    Json,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use crate::models::TeamQuotaResponse;
use crate::services::{team_quota_service::TeamQuotaService, UserService};
use crate::utils::errors::AppResult;
use crate::utils::tier_helper::get_team_ids;
use crate::utils::AppError;
use crate::handlers::auth::AuthHandler;

#[derive(Debug, Serialize, Deserialize)]
pub struct AllocateQuotaRequest {
    pub team_id: i64,
    pub product_upid: String,
    pub quota: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateQuotaRequest {
    pub quota: i32,
}

/// List all team quotas
pub async fn list_team_quotas(
    State(state): State<Arc<AuthHandler>>,
) -> AppResult<Json<Vec<TeamQuotaResponse>>> {
    let quotas = TeamQuotaService::get_all_team_quotas(&state.pool).await?;
    Ok(Json(quotas))
}

/// Allocate quota to a team for a product (Premium/Allstar only)
pub async fn allocate_quota(
    State(state): State<Arc<AuthHandler>>,
    headers: HeaderMap,
    Json(req): Json<AllocateQuotaRequest>,
) -> AppResult<(StatusCode, Json<TeamQuotaResponse>)> {
    // Extract and check admin permission (Premium+ can manage quotas)
    let auth_header = headers
        .get("authorization")
        .and_then(|h| h.to_str().ok())
        .ok_or(AppError::Unauthorized)?;

    if !auth_header.starts_with("Bearer ") {
        return Err(AppError::Unauthorized);
    }

    let token = &auth_header[7..];
    let claims = state.jwt.verify_token(token)?;
    let user_id = claims.user_id;

    // Check permission: only Premium and Allstar can allocate quotas
    let user = UserService::get_user(&state.pool, user_id).await?;
    if !crate::services::PermissionService::can_manage_organization(
        &crate::services::PermissionContext::new(
            user_id,
            user.tier.clone(),
            user.organization_id,
            get_team_ids(user.team_ids.as_ref()),
        ),
    ) {
        return Err(AppError::PermissionDenied);
    }

    // Get product_id from upid
    let product_id: i64 = sqlx::query_scalar("SELECT id FROM products WHERE upid = $1")
        .bind(&req.product_upid)
        .fetch_one(&*state.pool)
        .await?;

    TeamQuotaService::allocate_quota(
        &state.pool,
        req.team_id,
        product_id,
        &req.product_upid,
        req.quota,
    ).await?;

    // Get updated quota info
    let quotas = TeamQuotaService::get_team_quota_summary(&state.pool, req.team_id).await?;
    let quota_info = quotas.into_iter()
        .find(|q| q.team_id == req.team_id && q.upid == req.product_upid)
        .ok_or_else(|| crate::utils::errors::AppError::NotFound("Quota not found".to_string()))?;

    Ok((StatusCode::CREATED, Json(quota_info)))
}

/// Update team quota (Premium/Allstar only)
pub async fn update_quota(
    State(state): State<Arc<AuthHandler>>,
    headers: HeaderMap,
    Path((team_id, product_upid)): Path<(i64, String)>,
    Json(req): Json<UpdateQuotaRequest>,
) -> AppResult<Json<TeamQuotaResponse>> {
    // Extract and check admin permission
    let auth_header = headers
        .get("authorization")
        .and_then(|h| h.to_str().ok())
        .ok_or(AppError::Unauthorized)?;

    if !auth_header.starts_with("Bearer ") {
        return Err(AppError::Unauthorized);
    }

    let token = &auth_header[7..];
    let claims = state.jwt.verify_token(token)?;
    let user_id = claims.user_id;

    // Check permission: only Premium and Allstar can update quotas
    let user = UserService::get_user(&state.pool, user_id).await?;
    if !crate::services::PermissionService::can_manage_organization(
        &crate::services::PermissionContext::new(
            user_id,
            user.tier.clone(),
            user.organization_id,
            get_team_ids(user.team_ids.as_ref()),
        ),
    ) {
        return Err(AppError::PermissionDenied);
    }

    // Get product_id from upid
    let product_id: i64 = sqlx::query_scalar("SELECT id FROM products WHERE upid = $1")
        .bind(&product_upid)
        .fetch_one(&*state.pool)
        .await?;

    // Update by re-allocating
    TeamQuotaService::allocate_quota(
        &state.pool,
        team_id,
        product_id,
        &product_upid,
        req.quota,
    ).await?;

    // Get updated quota info
    let quotas = TeamQuotaService::get_team_quota_summary(&state.pool, team_id).await?;
    let quota_info = quotas.into_iter()
        .find(|q| q.team_id == team_id && q.upid == product_upid)
        .ok_or_else(|| crate::utils::errors::AppError::NotFound("Quota not found".to_string()))?;

    Ok(Json(quota_info))
}

/// Get team quotas for specific team
pub async fn get_team_quotas(
    State(state): State<Arc<AuthHandler>>,
    Path(team_id): Path<i64>,
) -> AppResult<Json<Vec<TeamQuotaResponse>>> {
    let team_quotas = TeamQuotaService::get_team_quota_summary(&state.pool, team_id).await?;
    
    Ok(Json(team_quotas))
}
