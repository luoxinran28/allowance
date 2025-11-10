use axum::{
    extract::{State, Json},
    response::IntoResponse,
    http::StatusCode,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use chrono::Utc;
use crate::utils::{AppResult, AppError};
use crate::services::LicenseService;
use std::sync::Arc;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchLicenseRequest {
    pub product_id: String,
    pub quantity: i32,
    pub tier: String,
    pub days_valid: i32,
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

/// Generate batch licenses for bulk operations
pub async fn generate_batch_licenses(
    State(pool): State<Arc<PgPool>>,
    Json(req): Json<BatchLicenseRequest>,
) -> impl IntoResponse {
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
            let license_result = LicenseService::generate_license(
                &pool,
                req.product_id.clone(),
                req.tier.clone(),
                req.days_valid,
            )
            .await;

            match license_result {
                Ok(license) => {
                    licenses.push(BatchLicenseItem {
                        license_key: license.key.clone(),
                        product_id: license.product_id.clone(),
                        tier: req.tier.clone(),
                        expires_at: license.expires_at.to_rfc3339(),
                    });
                }
                Err(e) => {
                    tracing::error!("Failed to generate license in batch: {}", e);
                    return (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        Json(serde_json::json!({"error": "Failed to generate all licenses"})),
                    )
                        .into_response();
                }
            }
        }
    }

    let response = BatchLicenseResponse {
        total_generated: licenses.len() as i32,
        licenses,
        batch_id,
    };

    (StatusCode::OK, Json(response)).into_response()
}

/// Revoke batch licenses
pub async fn revoke_batch_licenses(
    State(pool): State<Arc<PgPool>>,
    Json(req): Json<Vec<String>>,
) -> impl IntoResponse {
    if req.is_empty() || req.len() > 10000 {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "Batch size must be between 1 and 10000"})),
        )
            .into_response();
    }

    let mut revoked_count = 0;

    for license_key in req {
        let result = sqlx::query(
            "UPDATE licenses SET status = $1, updated_at = $2 WHERE key = $3"
        )
        .bind("revoked")
        .bind(Utc::now())
        .bind(&license_key)
        .execute(&**pool)
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
    State(pool): State<Arc<PgPool>>,
    Json(req): Json<LicenseExportRequest>,
) -> impl IntoResponse {
    let query = build_export_query(&req);

    match sqlx::query_as::<_, (String, String, String)>(&query)
        .fetch_all(&**pool)
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
