use std::sync::Arc;
use axum::{
    extract::{State, Query},
    Json,
};
use sqlx::PgPool;

use crate::middleware::auth::AuthClaims;
use crate::models::LicenseResponse;
use crate::services::ProductService;
use crate::utils::AppResult;

#[derive(serde::Deserialize)]
pub struct PaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

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

/// List all licenses with pagination (admin functionality)
pub async fn list_licenses(
    State(state): State<Arc<LicenseHandler>>,
    Query(params): Query<PaginationParams>,
) -> AppResult<Json<serde_json::Value>> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(50);
    let offset = (page - 1) * page_size;

    // Query free user licenses with pagination
    let licenses = sqlx::query_as::<_, crate::models::License>(
        r#"
        SELECT 
            ful.id,
            ful.user_id,
            pv.id as product_version_id,
            ful.license_key,
            ful.created_at as starts_at,
            ful.created_at + INTERVAL '1 year' as expires_at,
            COALESCE(pv.daily_limit, 0) as daily_usage,
            COALESCE(pv.monthly_limit, 0) as monthly_usage,
            NULL as last_used_at,
            NULL as revoked_at,
            NULL as metadata,
            ful.created_at,
            ful.created_at as updated_at,
            ful.upid
        FROM free_user_licenses ful
        JOIN products p ON ful.product_id = p.id
        JOIN product_versions pv ON p.id = pv.product_id AND pv.version_name = 'basic'
        ORDER BY ful.created_at DESC
        LIMIT $1 OFFSET $2
        "#,
    )
        .bind(page_size)
        .bind(offset)
        .fetch_all(&*state.pool)
        .await?;

    let total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM free_user_licenses")
        .fetch_one(&*state.pool)
        .await?;

    let responses: Vec<LicenseResponse> = licenses
        .into_iter()
        .map(LicenseResponse::from)
        .collect();

    Ok(Json(serde_json::json!({
        "licenses": responses,
        "total": total,
        "page": page,
        "page_size": page_size
    })))
}
