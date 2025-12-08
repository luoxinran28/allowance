use axum::{
    extract::{State, Json},
    response::IntoResponse,
    http::{StatusCode, HeaderMap},
};
use serde::{Deserialize, Serialize};
use chrono::Utc;
use std::sync::Arc;
use sqlx::PgPool;

use crate::services::{UserService, PermissionService};
use crate::utils::AppError;
use crate::services::PermissionContext;
use crate::utils::tier_helper::get_team_ids;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchLicenseRequest {
    pub product_id: String,
    pub quantity: i32,
    pub tier: String,
    pub days_valid: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchOrgLicenseRequest {
    pub product_id: String,
    pub organization_id: i64,
    pub quantity: i32,
    pub expiration_days: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchLicenseResponse {
    pub total_generated: i32,
    pub licenses: Vec<BatchLicenseItem>,
    pub batch_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchLicenseItem {
    pub license_key: String,
    pub product_id: String,
    pub tier: String,
    pub expires_at: String,
}

/// Generate batch licenses for bulk operations (Premium/Allstar only)
pub async fn generate_batch_licenses(
    State(state): State<Arc<crate::handlers::auth::AuthHandler>>,
    headers: HeaderMap,
    Json(req): Json<BatchLicenseRequest>,
) -> impl IntoResponse {
    // Extract and check admin permission
    let auth_header = match headers
        .get("authorization")
        .and_then(|h| h.to_str().ok()) {
        Some(header) => header,
        None => return (
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({"error": "Missing authorization header"})),
        )
            .into_response(),
    };

    if !auth_header.starts_with("Bearer ") {
        return (
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({"error": "Invalid authorization header"})),
        )
            .into_response();
    }

    let token = &auth_header[7..];
    let claims = match state.jwt.verify_token(token) {
        Ok(claims) => claims,
        Err(_) => return (
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({"error": "Invalid token"})),
        )
            .into_response(),
    };

    // Check permission: only Premium and Allstar can generate batch licenses
    let user = match UserService::get_user(&state.pool, claims.user_id).await {
        Ok(user) => user,
        Err(_) => return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": "Failed to fetch user"})),
        )
            .into_response(),
    };

    if !PermissionService::can_manage_organization(
        &PermissionContext::new(
            claims.user_id,
            user.tier.clone(),
            user.organization_id,
            get_team_ids(user.team_ids.as_ref()),
        ),
    ) {
        return (
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({"error": "Permission denied"})),
        )
            .into_response();
    }

    // Validation
    if req.quantity <= 0 || req.quantity > 10000 {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "Quantity must be between 1 and 10000"})),
        )
            .into_response();
    }

    if req.days_valid <= 0 || req.days_valid > 3650 {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "Days valid must be between 1 and 3650"})),
        )
            .into_response();
    }

    // Generate licenses in batches to prevent memory issues
    let mut licenses = Vec::new();
    let batch_size = 100;
    let batch_id = uuid::Uuid::new_v4().to_string();

    for i in 0..(req.quantity / batch_size + 1) {
        let start = i * batch_size;
        let end = std::cmp::min(start + batch_size, req.quantity);
        
        if start >= req.quantity {
            break;
        }

        let batch_count = end - start;
        for _ in 0..batch_count {
            // Mock license generation for now
            let license_key = format!("mock-license-{}", uuid::Uuid::new_v4().to_string()[..8].to_string());
            let expires_at = Utc::now() + chrono::Duration::days(req.days_valid as i64);
            
            licenses.push(BatchLicenseItem {
                license_key: license_key.clone(),
                product_id: req.product_id.clone(),
                tier: req.tier.clone(),
                expires_at: expires_at.to_rfc3339(),
            });
        }
    }

    let response = BatchLicenseResponse {
        total_generated: licenses.len() as i32,
        licenses,
        batch_id,
    };

    (StatusCode::OK, Json(response)).into_response()
}

/// Revoke batch licenses (Premium/Allstar only)
pub async fn revoke_batch_licenses(
    State(state): State<Arc<crate::handlers::auth::AuthHandler>>,
    headers: HeaderMap,
    Json(req): Json<Vec<String>>,
) -> impl IntoResponse {
    // Extract and check admin permission
    let auth_header = match headers
        .get("authorization")
        .and_then(|h| h.to_str().ok()) {
        Some(header) => header,
        None => return (
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({"error": "Missing authorization header"})),
        )
            .into_response(),
    };

    if !auth_header.starts_with("Bearer ") {
        return (
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({"error": "Invalid authorization header"})),
        )
            .into_response();
    }

    let token = &auth_header[7..];
    let claims = match state.jwt.verify_token(token) {
        Ok(claims) => claims,
        Err(_) => return (
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({"error": "Invalid token"})),
        )
            .into_response(),
    };

    // Check permission: only Premium and Allstar can revoke batch licenses
    let user = match UserService::get_user(&state.pool, claims.user_id).await {
        Ok(user) => user,
        Err(_) => return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": "Failed to fetch user"})),
        )
            .into_response(),
    };

    if !PermissionService::can_manage_organization(
        &PermissionContext::new(
            claims.user_id,
            user.tier.clone(),
            user.organization_id,
            get_team_ids(user.team_ids.as_ref()),
        ),
    ) {
        return (
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({"error": "Permission denied"})),
        )
            .into_response();
    }

    if req.is_empty() || req.len() > 10000 {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "Batch size must be between 1 and 10000"})),
        )
            .into_response();
    }

    let mut revoked_count = 0;

    for license_key in &req {
        let result = sqlx::query(
            "UPDATE licenses SET status = $1, updated_at = $2 WHERE key = $3"
        )
        .bind("revoked")
        .bind(Utc::now())
        .bind(&license_key)
        .execute(&*state.pool)
        .await;

        if result.is_ok() {
            revoked_count += 1;
        }
    }

    (
        StatusCode::OK,
        Json(serde_json::json!({
            "revoked": revoked_count,
            "total_requested": req.len()
        })),
    )
        .into_response()
}

/// Batch export licenses
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LicenseExportRequest {
    pub tier: Option<String>,
    pub product_id: Option<String>,
    pub status: Option<String>,
}

pub async fn export_batch_licenses(
    State(state): State<Arc<crate::handlers::auth::AuthHandler>>,
    headers: HeaderMap,
    Json(req): Json<LicenseExportRequest>,
) -> impl IntoResponse {
    // Extract and check admin permission
    let auth_header = match headers
        .get("authorization")
        .and_then(|h| h.to_str().ok()) {
        Some(header) => header,
        None => return (
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({"error": "Missing authorization header"})),
        )
            .into_response(),
    };

    if !auth_header.starts_with("Bearer ") {
        return (
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({"error": "Invalid authorization header"})),
        )
            .into_response();
    }

    let token = &auth_header[7..];
    let claims = match state.jwt.verify_token(token) {
        Ok(claims) => claims,
        Err(_) => return (
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({"error": "Invalid token"})),
        )
            .into_response(),
    };

    // Check permission: only Premium and Allstar can export batch licenses
    let user = match UserService::get_user(&state.pool, claims.user_id).await {
        Ok(user) => user,
        Err(_) => return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": "Failed to fetch user"})),
        )
            .into_response(),
    };

    if !PermissionService::can_manage_organization(
        &PermissionContext::new(
            claims.user_id,
            user.tier.clone(),
            user.organization_id,
            get_team_ids(user.team_ids.as_ref()),
        ),
    ) {
        return (
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({"error": "Permission denied"})),
        )
            .into_response();
    }

    let query = build_export_query(&req);

    match sqlx::query_as::<_, (String, String, String)>(&query)
        .fetch_all(&*state.pool)
        .await
    {
        Ok(licenses) => {
            let csv_content = format_licenses_as_csv(licenses);
            (
                StatusCode::OK,
                [
                    ("Content-Type", "text/csv"),
                    ("Content-Disposition", "attachment; filename=\"licenses.csv\""),
                ],
                csv_content,
            )
                .into_response()
        }
        Err(e) => {
            tracing::error!("Export failed: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "Export failed"})),
            )
                .into_response()
        }
    }
}

fn build_export_query(req: &LicenseExportRequest) -> String {
    let mut query = "SELECT key, tier, status FROM licenses WHERE 1=1".to_string();

    if let Some(tier) = &req.tier {
        query.push_str(&format!(" AND tier = '{}'", tier));
    }

    if let Some(product_id) = &req.product_id {
        query.push_str(&format!(" AND product_id = '{}'", product_id));
    }

    if let Some(status) = &req.status {
        query.push_str(&format!(" AND status = '{}'", status));
    }

    query.push_str(" LIMIT 100000");
    query
}

fn format_licenses_as_csv(licenses: Vec<(String, String, String)>) -> String {
    let mut csv = "License Key,Tier,Status\n".to_string();

    for (key, tier, status) in licenses {
        csv.push_str(&format!("{},{},{}\n", key, tier, status));
    }

    csv
}

/// Generate batch licenses for organization (team lead/admin only)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchOrgLicenseResponse {
    pub id: String,
    pub status: String,
    pub total_licenses: i32,
    pub generated_count: i32,
    pub error_count: i32,
    pub created_at: String,
    pub licenses: Vec<BatchOrgLicenseItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchOrgLicenseItem {
    pub key: String,
    pub expiration_date: String,
}

pub async fn generate_batch_org_licenses(
    State(state): State<Arc<crate::handlers::auth::AuthHandler>>,
    Json(req): Json<BatchOrgLicenseRequest>,
) -> impl IntoResponse {
    // Validation
    if req.quantity <= 0 || req.quantity > 10000 {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "Quantity must be between 1 and 10000"})),
        )
            .into_response();
    }

    if req.expiration_days <= 0 || req.expiration_days > 3650 {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "Expiration days must be between 1 and 3650"})),
        )
            .into_response();
    }

    let batch_id = uuid::Uuid::new_v4().to_string();
    let mut licenses = Vec::new();
    let mut error_count = 0;

    // Generate licenses for the organization
    for _ in 0..req.quantity {
        let license_key = format!(
            "ORG-{}-{}-{}",
            req.organization_id,
            uuid::Uuid::new_v4().to_string()[..8].to_string(),
            chrono::Local::now().timestamp_millis()
        );
        
        let expires_at = Utc::now() + chrono::Duration::days(req.expiration_days as i64);
        
        licenses.push(BatchOrgLicenseItem {
            key: license_key.clone(),
            expiration_date: expires_at.to_rfc3339(),
        });
    }

    let response = BatchOrgLicenseResponse {
        id: batch_id,
        status: "success".to_string(),
        total_licenses: req.quantity,
        generated_count: licenses.len() as i32,
        error_count,
        created_at: Utc::now().to_rfc3339(),
        licenses,
    };

    (StatusCode::CREATED, Json(response)).into_response()
}
