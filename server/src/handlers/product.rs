use std::sync::Arc;
use axum::{
    extract::{State, Path},
};
use sqlx::PgPool;

use crate::models::ProductResponse;
use crate::services::ProductService;
use crate::utils::AppResult;
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
