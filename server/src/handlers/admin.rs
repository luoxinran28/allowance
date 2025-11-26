use std::sync::Arc;
use axum::{
    extract::{State, Json, Path, Query},
    http::HeaderMap,
};
use serde::{Deserialize, Serialize};

use crate::models::{UserResponse, User, ApprovalRequest, CreateProductAdminRequest, GenerateLicensesRequest, OrgProductLicenseResponse};
use crate::services::{AuthService, RbacService, ProductService};
use crate::utils::{AppResult, AppError};
use crate::handlers::auth::AuthHandler;

#[derive(Deserialize)]
pub struct PaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Deserialize)]
pub struct AssignRoleRequest {
    pub role_code: String,
}

#[derive(Deserialize)]
pub struct ApprovalActionRequest {
    pub reason: Option<String>,
}

#[derive(Serialize)]
pub struct AdminResponse {
    pub success: bool,
    pub message: String,
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

/// Check if user is admin
async fn check_admin_permission(
    state: &AuthHandler,
    user_id: i64,
) -> AppResult<()> {
    let is_admin = RbacService::has_permission(
        &state.pool,
        user_id,
        "admin:manage_users",
    ).await?;

    if !is_admin {
        return Err(AppError::Forbidden);
    }

    Ok(())
}

/// List all users (admin only)
pub async fn list_users(
    State(state): State<Arc<AuthHandler>>,
    headers: HeaderMap,
    Query(params): Query<PaginationParams>,
) -> AppResult<Json<serde_json::Value>> {
    let user_id = extract_user_from_header(&state, &headers)?;
    check_admin_permission(&state, user_id).await?;

    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(20);
    let offset = (page - 1) * page_size;

    let users = sqlx::query_as::<_, User>(
        r#"
        SELECT * FROM users
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
        "#
    )
        .bind(page_size)
        .bind(offset)
        .fetch_all(&*state.pool)
        .await?;

    let total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM users")
        .fetch_one(&*state.pool)
        .await?;

    let user_responses: Vec<UserResponse> = users.into_iter()
        .map(|u| UserResponse::from(u))
        .collect();

    Ok(Json(serde_json::json!({
        "users": user_responses,
        "total": total,
        "page": page,
        "page_size": page_size
    })))
}

/// Get user details by ID (admin only)
pub async fn get_user(
    State(state): State<Arc<AuthHandler>>,
    headers: HeaderMap,
    Path(user_id): Path<i64>,
) -> AppResult<Json<UserResponse>> {
    let requester_id = extract_user_from_header(&state, &headers)?;
    check_admin_permission(&state, requester_id).await?;

    let user = AuthService::get_user_by_id(&state.pool, user_id).await?;
    Ok(Json(UserResponse::from(user)))
}

/// Assign role to user (admin only)
pub async fn assign_role(
    State(state): State<Arc<AuthHandler>>,
    headers: HeaderMap,
    Path(user_id): Path<i64>,
    Json(req): Json<AssignRoleRequest>,
) -> AppResult<Json<AdminResponse>> {
    let requester_id = extract_user_from_header(&state, &headers)?;
    check_admin_permission(&state, requester_id).await?;

    RbacService::assign_role(&state.pool, user_id, &req.role_code).await?;

    Ok(Json(AdminResponse {
        success: true,
        message: format!("Role '{}' assigned to user {}", req.role_code, user_id),
    }))
}

/// Remove role from user (admin only)
pub async fn remove_role(
    State(state): State<Arc<AuthHandler>>,
    headers: HeaderMap,
    Path((user_id, role_code)): Path<(i64, String)>,
) -> AppResult<Json<AdminResponse>> {
    let requester_id = extract_user_from_header(&state, &headers)?;
    check_admin_permission(&state, requester_id).await?;

    RbacService::remove_role(&state.pool, user_id, &role_code).await?;

    Ok(Json(AdminResponse {
        success: true,
        message: format!("Role '{}' removed from user {}", role_code, user_id),
    }))
}

/// List pending approval requests (admin only)
pub async fn list_approvals(
    State(state): State<Arc<AuthHandler>>,
    headers: HeaderMap,
) -> AppResult<Json<Vec<ApprovalRequest>>> {
    let user_id = extract_user_from_header(&state, &headers)?;
    check_admin_permission(&state, user_id).await?;

    let approvals = sqlx::query_as::<_, ApprovalRequest>(
        r#"
        SELECT * FROM approval_requests
        WHERE status = 'pending'
        ORDER BY created_at ASC
        "#
    )
        .fetch_all(&*state.pool)
        .await?;

    Ok(Json(approvals))
}

/// Get approval request details (admin only)
pub async fn get_approval(
    State(state): State<Arc<AuthHandler>>,
    headers: HeaderMap,
    Path(approval_id): Path<i64>,
) -> AppResult<Json<ApprovalRequest>> {
    let user_id = extract_user_from_header(&state, &headers)?;
    check_admin_permission(&state, user_id).await?;

    let approval = sqlx::query_as::<_, ApprovalRequest>(
        "SELECT * FROM approval_requests WHERE id = $1"
    )
        .bind(approval_id)
        .fetch_optional(&*state.pool)
        .await?
        .ok_or(AppError::NotFound("Approval request not found".to_string()))?;

    Ok(Json(approval))
}

/// Approve request (admin only)
pub async fn approve_request(
    State(state): State<Arc<AuthHandler>>,
    headers: HeaderMap,
    Path(approval_id): Path<i64>,
) -> AppResult<Json<AdminResponse>> {
    let user_id = extract_user_from_header(&state, &headers)?;
    check_admin_permission(&state, user_id).await?;

    let result = sqlx::query(
        r#"
        UPDATE approval_requests
        SET status = 'approved', approved_by = $1, updated_at = NOW()
        WHERE id = $2
        "#
    )
        .bind(user_id)
        .bind(approval_id)
        .execute(&*state.pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Approval request not found".to_string()));
    }

    Ok(Json(AdminResponse {
        success: true,
        message: format!("Approval request {} approved", approval_id),
    }))
}

/// Reject request (admin only)
pub async fn reject_request(
    State(state): State<Arc<AuthHandler>>,
    headers: HeaderMap,
    Path(approval_id): Path<i64>,
    Json(req): Json<ApprovalActionRequest>,
) -> AppResult<Json<AdminResponse>> {
    let user_id = extract_user_from_header(&state, &headers)?;
    check_admin_permission(&state, user_id).await?;

    let result = sqlx::query(
        r#"
        UPDATE approval_requests
        SET status = 'rejected', approved_by = $1, rejection_reason = $2, updated_at = NOW()
        WHERE id = $3
        "#
    )
        .bind(user_id)
        .bind(req.reason.as_deref().unwrap_or("No reason provided"))
        .bind(approval_id)
        .execute(&*state.pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Approval request not found".to_string()));
    }

    Ok(Json(AdminResponse {
        success: true,
        message: format!("Approval request {} rejected", approval_id),
    }))
}

// ============= PRODUCT & LICENSE ADMIN ENDPOINTS =============

/// Create new product (admin only)
pub async fn create_product(
    State(state): State<Arc<AuthHandler>>,
    headers: HeaderMap,
    Json(req): Json<CreateProductAdminRequest>,
) -> AppResult<(axum::http::StatusCode, Json<serde_json::Value>)> {
    let user_id = extract_user_from_header(&state, &headers)?;
    check_admin_permission(&state, user_id).await?;

    let product = ProductService::create_product_admin(
        &state.pool,
        &req.name,
        &req.product_slug,
        req.description.as_deref(),
        user_id,
    ).await?;

    Ok((
        axum::http::StatusCode::CREATED,
        Json(serde_json::json!({
            "id": product.id,
            "upid": product.upid,
            "product_slug": product.product_slug,
            "name": product.name,
            "description": product.description,
        })),
    ))
}

/// Generate licenses for organization (admin only)
pub async fn create_license(
    State(state): State<Arc<AuthHandler>>,
    headers: HeaderMap,
    Json(req): Json<GenerateLicensesRequest>,
) -> AppResult<(axum::http::StatusCode, Json<serde_json::Value>)> {
    let user_id = extract_user_from_header(&state, &headers)?;
    check_admin_permission(&state, user_id).await?;

    let org_license = ProductService::generate_org_licenses(
        &state.pool,
        req.product_id,
        req.organization_id,
        req.count,
        req.expires_in_days,
        user_id,
    ).await?;

    Ok((
        axum::http::StatusCode::CREATED,
        Json(serde_json::to_value(OrgProductLicenseResponse::from(org_license)).unwrap()),
    ))
}

/// Update organization license usage (admin only)
#[derive(Deserialize)]
pub struct UpdateOrgLicenseRequest {
    pub total_count: Option<i32>,
    pub available_count: Option<i32>,
}

pub async fn update_org_license(
    State(state): State<Arc<AuthHandler>>,
    headers: HeaderMap,
    Path(license_id): Path<i64>,
    Json(req): Json<UpdateOrgLicenseRequest>,
) -> AppResult<Json<OrgProductLicenseResponse>> {
    let user_id = extract_user_from_header(&state, &headers)?;
    check_admin_permission(&state, user_id).await?;

    // Get current license
    let current = ProductService::get_org_license_by_id(&state.pool, license_id).await?;

    let new_total = req.total_count.unwrap_or(current.total_count);
    let new_available = req.available_count.unwrap_or(current.available_count);

    // Update license
    let updated = sqlx::query_as::<_, crate::models::OrgProductLicense>(
        r#"
        UPDATE org_product_licenses
        SET total_count = $1, available_count = $2, updated_at = NOW()
        WHERE id = $3
        RETURNING *
        "#
    )
        .bind(new_total)
        .bind(new_available)
        .bind(license_id)
        .fetch_one(&*state.pool)
        .await?;

    Ok(Json(OrgProductLicenseResponse::from(updated)))
}

/// Get organization licenses (admin only)
pub async fn get_org_licenses(
    State(state): State<Arc<AuthHandler>>,
    headers: HeaderMap,
    Query(params): Query<PaginationParams>,
) -> AppResult<Json<serde_json::Value>> {
    let user_id = extract_user_from_header(&state, &headers)?;
    check_admin_permission(&state, user_id).await?;

    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(20);
    let offset = (page - 1) * page_size;

    let licenses = sqlx::query_as::<_, crate::models::OrgProductLicense>(
        r#"
        SELECT * FROM org_product_licenses
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
        "#
    )
        .bind(page_size)
        .bind(offset)
        .fetch_all(&*state.pool)
        .await?;

    let total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM org_product_licenses")
        .fetch_one(&*state.pool)
        .await?;

    let responses: Vec<OrgProductLicenseResponse> = licenses
        .into_iter()
        .map(OrgProductLicenseResponse::from)
        .collect();

    Ok(Json(serde_json::json!({
        "licenses": responses,
        "total": total,
        "page": page,
        "page_size": page_size
    })))
}
