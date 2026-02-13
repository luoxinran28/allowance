use std::sync::Arc;
use axum::{
    extract::{State, Path},
    http::HeaderMap,
};
use sqlx::PgPool;
use serde::Serialize;

use crate::models::ProductResponse;
use crate::services::ProductService;
use crate::utils::{AppResult, AppError};
use axum::Json;

pub struct ProductHandler {
    pub pool: Arc<PgPool>,
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

// ============= Auth Key Endpoint (Service-to-Service) =============

#[derive(Debug, Serialize)]
pub struct AuthKeyResponse {
    pub product_slug: String,
    pub jwt_signing_key: String,
    pub key_version: i32,
}

/// Get product JWT signing key by product slug.
/// 
/// Used by consumer products (e.g., KwongFu) to fetch their signing key at startup
/// so they can verify JWT tokens issued by Allowance.
///
/// **Authentication**: Requires a valid admin-level Bearer token.
///
/// GET /products/:slug/auth-key
pub async fn get_product_auth_key(
    State(state): State<Arc<ProductHandler>>,
    headers: HeaderMap,
    Path(slug): Path<String>,
) -> AppResult<Json<AuthKeyResponse>> {
    // Simple auth check: require a valid Authorization header with API_SECRET
    // This is a service-to-service call, so we use API_SECRET as a shared secret
    let auth_header = headers
        .get("authorization")
        .and_then(|h| h.to_str().ok())
        .ok_or(AppError::Unauthorized)?;

    if !auth_header.starts_with("Bearer ") {
        return Err(AppError::Unauthorized);
    }

    let provided_secret = &auth_header[7..];
    let expected_secret = std::env::var("API_SECRET")
        .unwrap_or_default();

    if provided_secret != expected_secret {
        return Err(AppError::PermissionDenied);
    }

    // Fetch the product's signing key
    let row: Option<(String, String, i32)> = sqlx::query_as(
        "SELECT product_slug, jwt_signing_key, key_version FROM products WHERE product_slug = $1"
    )
        .bind(&slug)
        .fetch_optional(state.pool.as_ref())
        .await
        .map_err(|_| AppError::InternalServerError)?;

    match row {
        Some((product_slug, jwt_signing_key, key_version)) => {
            Ok(Json(AuthKeyResponse {
                product_slug,
                jwt_signing_key,
                key_version,
            }))
        }
        None => Err(AppError::NotFound(format!("Product '{}' not found", slug))),
    }
}
