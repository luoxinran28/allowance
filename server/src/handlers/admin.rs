use std::sync::Arc;
use axum::{
    extract::{State, Json, Path, Query},
    http::HeaderMap,
};
use serde::{Deserialize, Serialize};

use crate::models::{UserResponse, User, UserStatus, UserTier, CreateProductAdminRequest, GenerateLicensesRequest, OrgProductLicenseResponse};
use crate::services::{AuthService, ProductService, UserService};
use crate::utils::{AppResult, AppError};
use crate::handlers::auth::AuthHandler;

#[derive(Deserialize)]
pub struct PaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Deserialize)]
pub struct ApprovalActionRequest {
    pub reason: Option<String>,
}

#[derive(Deserialize)]
pub struct AdminCreateUserRequest {
    pub email: String,
    pub password: String,
    pub tier: Option<String>,
    pub organization_id: Option<i64>,
    pub activate: Option<bool>,
}

#[derive(Deserialize)]
pub struct UpdateUserStatusRequest {
    pub status: String,
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

/// Extended user response with organization and team info for admin list
#[derive(Serialize)]
pub struct AdminUserResponse {
    pub id: i64,
    pub uid: String,
    pub email: String,
    pub tier: String,
    pub status: String,
    pub created_at: chrono::NaiveDateTime,
    pub last_login: Option<chrono::NaiveDateTime>,
    pub organization_id: Option<i64>,
    pub organization_name: Option<String>,
    pub team_ids: Option<Vec<i64>>,
    pub team_names: Option<Vec<String>>,
}

/// List users with tier-based filtering
/// - Admin (Allstar): sees all users
/// - Regular users: denied access
pub async fn list_users(
    State(state): State<Arc<AuthHandler>>,
    headers: HeaderMap,
    Query(params): Query<PaginationParams>,
) -> AppResult<Json<serde_json::Value>> {
    let user_id = extract_user_from_header(&state, &headers)?;
    
    // Fetch the requesting user to check tier
    let requesting_user = sqlx::query_as::<_, User>(
        "SELECT id, uid, email, password_hash, tier, status, organization_id, team_ids, license_status, source_product_slug,
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

    // Only Allstar tier users can access admin functions
    if requesting_user.tier != crate::models::UserTier::Allstar {
        return Err(AppError::PermissionDenied);
    }

    // Admin: Return all users with organization and team info
    let users = sqlx::query_as::<_, User>(
        r#"
        SELECT id, uid, email, password_hash, tier, status, organization_id, team_ids, license_status, source_product_slug,
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

    // Pre-fetch all organizations and teams for efficient lookup
    let all_orgs: Vec<(i64, String)> = sqlx::query_as(
        "SELECT id, name FROM organizations"
    )
        .fetch_all(&*state.pool)
        .await?;
    
    let all_teams: Vec<(i64, String)> = sqlx::query_as(
        "SELECT id, name FROM teams"
    )
        .fetch_all(&*state.pool)
        .await?;
    
    let org_map: std::collections::HashMap<i64, String> = all_orgs.into_iter().collect();
    let team_map: std::collections::HashMap<i64, String> = all_teams.into_iter().collect();

    let mut user_responses: Vec<AdminUserResponse> = Vec::new();
    for user in users {
        // Get organization name
        let org_name = user.organization_id.and_then(|oid| org_map.get(&oid).cloned());
        
        // Parse team_ids from JSON value to Vec<i64>
        let team_ids_vec: Option<Vec<i64>> = user.team_ids.as_ref().and_then(|json_val| {
            json_val.as_array().map(|arr| {
                arr.iter().filter_map(|v| v.as_i64()).collect()
            })
        });
        
        // Get team names
        let team_names: Option<Vec<String>> = team_ids_vec.as_ref().map(|ids| {
            ids.iter()
                .filter_map(|tid| team_map.get(tid).cloned())
                .collect()
        });
        
        user_responses.push(AdminUserResponse {
            id: user.id,
            uid: user.uid,
            email: user.email,
            tier: format!("{:?}", user.tier).to_lowercase(),
            status: format!("{:?}", user.status).to_lowercase(),
            created_at: user.created_at,
            last_login: user.last_login,
            organization_id: user.organization_id,
            organization_name: org_name,
            team_ids: team_ids_vec,
            team_names,
        });
    }

    Ok(Json(serde_json::json!({
        "data": user_responses,
        "total": total,
        "page": page,
        "page_size": page_size
    })))
}

/// Create user (admin only)
/// Admin can create users directly without requiring email activation
pub async fn create_user(
    State(state): State<Arc<AuthHandler>>,
    headers: HeaderMap,
    Json(req): Json<AdminCreateUserRequest>,
) -> AppResult<(axum::http::StatusCode, Json<UserResponse>)> {
    let requester_id = extract_user_from_header(&state, &headers)?;
    check_admin_permission(&state, requester_id).await?;

    // Validate email format
    if !req.email.contains('@') {
        return Err(AppError::BadRequest("Invalid email format".to_string()));
    }

    // Check if email already exists
    let existing = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM users WHERE email = $1"
    )
        .bind(&req.email)
        .fetch_one(&*state.pool)
        .await?;

    if existing > 0 {
        return Err(AppError::EmailAlreadyRegistered);
    }

    // Generate uid and hash password
    let uid = format!("U{}", uuid::Uuid::new_v4().simple().to_string()[..15].to_uppercase());
    let password_hash = crate::utils::crypto::hash_password(&req.password)?;

    // Determine tier (default to free)
    let tier = req.tier.as_deref().unwrap_or("free");
    
    // Determine status (admin can directly activate)
    let status = if req.activate.unwrap_or(true) { "active" } else { "inactive" };

    // Create user
    let user = sqlx::query_as::<_, User>(
        r#"
        INSERT INTO users (uid, email, password_hash, status, tier, organization_id, source_product_slug)
        VALUES ($1, $2, $3, $4::user_status, $5::user_tier, $6, 'allowance')
        RETURNING id, uid, email, password_hash, tier, status, organization_id, team_ids, license_status, source_product_slug, profile_data, created_at, updated_at, last_login
        "#
    )
        .bind(&uid)
        .bind(&req.email)
        .bind(&password_hash)
        .bind(status)
        .bind(tier)
        .bind(req.organization_id)
        .fetch_one(&*state.pool)
        .await?;

    let response = UserResponse::from(user);

    Ok((axum::http::StatusCode::CREATED, Json(response)))
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
    let response = UserResponse::from(user);
    Ok(Json(response))
}

pub async fn update_user_status(
    State(state): State<Arc<AuthHandler>>,
    headers: HeaderMap,
    Path(user_id): Path<i64>,
    Json(req): Json<UpdateUserStatusRequest>,
) -> AppResult<Json<serde_json::Value>> {
    let admin_id = extract_user_from_header(&state, &headers)?;
    check_admin_permission(&state, admin_id).await?;

    if admin_id == user_id {
        return Err(AppError::BadRequest("Cannot change your own status".to_string()));
    }

    let target_user = UserService::get_user(&state.pool, user_id).await?;
    if target_user.tier == UserTier::Allstar {
        return Err(AppError::BadRequest("Cannot change status of admin users".to_string()));
    }

    let new_status: UserStatus = req.status.parse()
        .map_err(|_| AppError::BadRequest("Invalid status value".to_string()))?;

    if target_user.status == new_status {
        let response_user = UserResponse::from(target_user);
        return Ok(Json(serde_json::json!({
            "success": true,
            "message": format!("User status already {}", req.status),
            "user": response_user,
        })));
    }

    let updated_user = sqlx::query_as::<_, User>(
        r#"
        UPDATE users
        SET status = $1::user_status, updated_at = NOW()
        WHERE id = $2
        RETURNING id, uid, email, password_hash, tier, status, organization_id, team_ids, license_status, source_product_slug,
               profile_data, created_at, updated_at, last_login
        "#
    )
        .bind(&req.status)
        .bind(user_id)
        .fetch_one(&*state.pool)
        .await?;

    let reason_text = req.reason.unwrap_or_else(|| "status updated by admin".to_string());
    let old_value = serde_json::json!({
        "status": target_user.status.to_string(),
    })
    .to_string();
    let new_value = serde_json::json!({
        "status": updated_user.status.to_string(),
        "reason": reason_text,
    })
    .to_string();

    sqlx::query(
        r#"
        INSERT INTO admin_audit_log (admin_user_id, action, target_type, target_id, old_value, new_value, created_at)
        VALUES ($1, $2, 'user', $3, $4, $5, NOW())
        "#
    )
        .bind(admin_id)
        .bind("user_status_change")
        .bind(user_id)
        .bind(old_value)
        .bind(new_value)
        .execute(&*state.pool)
        .await?;

    Ok(Json(serde_json::json!({
        "success": true,
        "message": format!("User status updated to {}", updated_user.status),
        "user": UserResponse::from(updated_user),
    })))
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
