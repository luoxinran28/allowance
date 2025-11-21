use std::sync::Arc;
use axum::{
    extract::State,
    Json,
};
use sqlx::PgPool;

use crate::middleware::auth::AuthClaims;
use crate::models::LicenseResponse;
use crate::services::ProductService;
use crate::utils::AppResult;

pub struct LicenseHandler {
    pub pool: Arc<PgPool>,
}

/// Get user's licenses
pub async fn get_user_licenses(
    State(state): State<Arc<LicenseHandler>>,
    AuthClaims(claims): AuthClaims,
) -> AppResult<Json<Vec<LicenseResponse>>> {
    let licenses = ProductService::get_user_licenses(&state.pool, claims.user_id).await?;
    let responses = licenses.into_iter().map(LicenseResponse::from).collect();
    Ok(Json(responses))
}
