use std::sync::Arc;
use axum::{
    extract::{State, Json, Path, Query},
    http::HeaderMap,
};
use serde::{Deserialize, Serialize};

use crate::models::{UserResponse, User, CreateProductAdminRequest, GenerateLicensesRequest, OrgProductLicenseResponse};
use crate::services::{AuthService, RbacService, ProductService, UserService};
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

/// Check if user is admin (Allstar tier)
async fn check_admin_permission(
    state: &AuthHandler,
    user_id: i64,
) -> AppResult<()> {
    let user = UserService::get_user(&state.pool, user_id).await?;
    
    // Only Allstar (admin) tier users can access admin functions
    if user.tier != crate::models::user::UserTier::Allstar {
        return Err(AppError::PermissionDenied);
    }
    
    Ok(())
}

/// List users with role-based filtering
/// - Admin: sees all users
/// - Team Leader: sees only members of teams they lead
/// - Regular users: denied access
pub async fn list_users(
    State(state): State<Arc<AuthHandler>>,
    headers: HeaderMap,
    Query(params): Query<PaginationParams>,
) -> AppResult<Json<serde_json::Value>> {
    let user_id = extract_user_from_header(&state, &headers)?;
    
    // Fetch the requesting user to check tier
    let requesting_user = sqlx::query_as::<_, User>(
        "SELECT id, uid, email, password_hash, tier, status, organization_id, team_ids, license_status, source_upid,
                profile_data, created_at, updated_at, last_login
        FROM users WHERE id = $1"
    )
        .bind(user_id)
        .fetch_optional(&*state.pool)
        .await?
        .ok_or(AppError::Unauthorized)?;

    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(20);
    let offset = (page - 1) * page_size;

    // TEMP: Allow all for debugging
    // Check if user has admin role
    let user_roles = crate::services::RbacService::get_user_roles(&state.pool, user_id).await?;
    let has_admin_role = user_roles.iter().any(|r| r.code == "admin");
    if !has_admin_role && requesting_user.tier != crate::models::UserTier::Allstar {
        return Err(AppError::PermissionDenied);
    }

    // Admin: Return all users
    let users = sqlx::query_as::<_, User>(
        r#"
        SELECT id, uid, email, password_hash, tier, status, organization_id, team_ids, license_status, source_upid,
               profile_data, created_at, updated_at, last_login
        FROM users
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
        "data": user_responses,
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

    // Verify the user exists
    let _user = UserService::get_user(&state.pool, user_id).await?;
    
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
