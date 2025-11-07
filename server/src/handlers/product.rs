use std::sync::Arc;
use axum::{
    extract::{State, Json, Path},
};

use crate::models::{Product, GenerateLicenseRequest, LicenseResponse};
use crate::services::{ProductService, RbacService};
use crate::utils::{AppError, AppResult};
use crate::handlers::auth::AuthHandler;

/// List all available products
pub async fn list_products(
    State(state): State<Arc<AuthHandler>>,
) -> AppResult<Json<Vec<Product>>> {
    let products = ProductService::list_products(&state.pool).await?;
    Ok(Json(products))
}

/// Get product by ID
pub async fn get_product(
    State(state): State<Arc<AuthHandler>>,
    Path(product_id): Path<String>,
) -> AppResult<Json<Product>> {
    let product = ProductService::get_product_by_id(&state.pool, &product_id).await?;
    Ok(Json(product))
}

/// Generate license for user
pub async fn generate_license(
    State(state): State<Arc<AuthHandler>>,
    Json(req): Json<GenerateLicenseRequest>,
) -> AppResult<Json<LicenseResponse>> {
    // TODO: Extract user_id from JWT token in request
    let user_id = 1i64; // Placeholder - will be extracted from auth middleware
    
    // Check if user has permission
    let has_permission = RbacService::has_permission(
        &state.pool,
        user_id,
        "product:license_generate",
    ).await?;

    if !has_permission {
        return Err(AppError::Unauthorized);
    }

    // Get product version ID
    let pv_id: i64 = sqlx::query_scalar(
        r#"
        SELECT pv.id FROM product_versions pv
        JOIN products p ON pv.product_id = p.id
        WHERE p.product_id = $1 AND pv.version_name = $2
        "#
    )
        .bind(&req.product_id)
        .bind(&req.version_name)
        .fetch_optional(&*state.pool)
        .await?
        .ok_or(AppError::ProductNotFound)?;

    // Generate license
    let license_token = crate::services::LicenseService::generate_license(
        &state.pool,
        user_id,
        pv_id,
        req.days_valid,
        &state.jwt.get_secret(),
    ).await?;

    // Get product info for response
    let features = ProductService::get_product_version(
        &state.pool,
        &req.product_id,
        &req.version_name,
    ).await.ok();

    Ok(Json(LicenseResponse {
        license_key: license_token,
        product_id: req.product_id,
        version_name: req.version_name,
        expires_at: (chrono::Local::now() + chrono::Duration::days(req.days_valid as i64)).naive_local(),
        features,
        daily_limit: None,
    }))
}
