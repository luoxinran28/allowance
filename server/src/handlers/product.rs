use std::sync::Arc;
use axum::{
    extract::{State, Json, Path},
    http::StatusCode,
};
use sqlx::PgPool;

use crate::models::{
    CreateProductRequest, CreateLicenseRequest, AssignLicenseRequest,
    RequestLicenseRequest, ApproveLicenseRequest, ProductResponse, LicenseResponse,
    LicenseApprovalResponse,
};
use crate::services::ProductService;
use crate::utils::AppResult;
use crate::middleware::auth::AuthClaims;

pub struct ProductHandler {
    pub pool: Arc<PgPool>,
}

// ============= Product Management =============

/// Create a new product (Admin only)
pub async fn create_product(
    State(state): State<Arc<ProductHandler>>,
    AuthClaims(claims): AuthClaims,
    Json(req): Json<CreateProductRequest>,
) -> AppResult<(StatusCode, Json<ProductResponse>)> {
    let product = ProductService::create_product(&state.pool, req, claims.user_id).await?;
    Ok((StatusCode::CREATED, Json(ProductResponse::from(product))))
}

/// List all products
pub async fn list_products(
    State(state): State<Arc<ProductHandler>>,
) -> AppResult<Json<Vec<ProductResponse>>> {
    let products = ProductService::list_products(&state.pool).await?;
    let responses = products.into_iter().map(ProductResponse::from).collect();
    Ok(Json(responses))
}

/// Get product by UPID
pub async fn get_product_by_upid(
    State(state): State<Arc<ProductHandler>>,
    Path(upid): Path<String>,
) -> AppResult<Json<ProductResponse>> {
    let product = ProductService::get_product_by_upid(&state.pool, &upid).await?;
    Ok(Json(ProductResponse::from(product)))
}

// ============= License Management =============

/// Create a new license (Admin only)
pub async fn create_license(
    State(state): State<Arc<ProductHandler>>,
    AuthClaims(claims): AuthClaims,
    Json(req): Json<CreateLicenseRequest>,
) -> AppResult<(StatusCode, Json<LicenseResponse>)> {
    let license = ProductService::create_license(&state.pool, req, claims.user_id).await?;
    Ok((StatusCode::CREATED, Json(LicenseResponse::from(license))))
}

/// Get licenses by organization (Team Leader / Admin)
pub async fn get_org_licenses(
    State(state): State<Arc<ProductHandler>>,
    AuthClaims(_claims): AuthClaims,
    Path(org_id): Path<i64>,
) -> AppResult<Json<Vec<LicenseResponse>>> {
    let licenses = ProductService::get_licenses_by_org(&state.pool, org_id).await?;
    let responses = licenses.into_iter().map(LicenseResponse::from).collect();
    Ok(Json(responses))
}

/// Revoke a license (Admin only)
pub async fn revoke_license(
    State(state): State<Arc<ProductHandler>>,
    AuthClaims(_claims): AuthClaims,
    Path(license_id): Path<i64>,
) -> AppResult<StatusCode> {
    ProductService::revoke_license(&state.pool, license_id).await?;
    Ok(StatusCode::OK)
}

// ============= License Assignment (Team Leader) =============

/// Assign license to employee (Team Leader only)
pub async fn assign_license(
    State(state): State<Arc<ProductHandler>>,
    AuthClaims(claims): AuthClaims,
    Json(req): Json<AssignLicenseRequest>,
) -> AppResult<StatusCode> {
    ProductService::assign_license(&state.pool, req.user_id, req.license_id, claims.user_id).await?;
    Ok(StatusCode::OK)
}

/// Revoke license from employee (Team Leader only)
pub async fn revoke_user_license(
    State(state): State<Arc<ProductHandler>>,
    AuthClaims(_claims): AuthClaims,
    Path(user_license_id): Path<i64>,
) -> AppResult<StatusCode> {
    ProductService::revoke_user_license(&state.pool, user_license_id).await?;
    Ok(StatusCode::OK)
}

// ============= License Request & Approval =============

/// Employee requests license access
pub async fn request_license(
    State(state): State<Arc<ProductHandler>>,
    AuthClaims(claims): AuthClaims,
    Json(req): Json<RequestLicenseRequest>,
) -> AppResult<(StatusCode, Json<LicenseApprovalResponse>)> {
    let approval = ProductService::request_license(&state.pool, claims.user_id, req.license_id).await?;
    Ok((StatusCode::CREATED, Json(LicenseApprovalResponse::from(approval))))
}

/// Get pending approvals for team leader
pub async fn get_pending_approvals(
    State(state): State<Arc<ProductHandler>>,
    AuthClaims(_claims): AuthClaims,
    Path(team_id): Path<i64>,
) -> AppResult<Json<Vec<LicenseApprovalResponse>>> {
    let approvals = ProductService::get_pending_approvals_for_team(&state.pool, team_id).await?;
    let responses = approvals.into_iter().map(LicenseApprovalResponse::from).collect();
    Ok(Json(responses))
}

/// Approve or reject license request (Team Leader)
pub async fn review_license_request(
    State(state): State<Arc<ProductHandler>>,
    AuthClaims(claims): AuthClaims,
    Path(approval_id): Path<i64>,
    Json(req): Json<ApproveLicenseRequest>,
) -> AppResult<Json<LicenseApprovalResponse>> {
    let approval = ProductService::review_license_request(
        &state.pool,
        approval_id,
        &req.status,
        claims.user_id,
        req.remarks,
    ).await?;
    Ok(Json(LicenseApprovalResponse::from(approval)))
}

// ============= License Query (Employee) =============

/// Get user's assigned licenses
pub async fn get_user_licenses(
    State(state): State<Arc<ProductHandler>>,
    AuthClaims(claims): AuthClaims,
) -> AppResult<Json<Vec<LicenseResponse>>> {
    let licenses = ProductService::get_user_licenses(&state.pool, claims.user_id).await?;
    let responses = licenses
        .into_iter()
        .map(|(_, license)| LicenseResponse::from(license))
        .collect();
    Ok(Json(responses))
}
