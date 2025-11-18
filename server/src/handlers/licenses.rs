use std::sync::Arc;
use axum::{
    extract::{State, Query},
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;

use crate::middleware::auth::AuthClaims;
use crate::utils::{AppError, AppResult};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActiveLicenseResponse {
    pub id: i64,
    pub upid: String,
    pub org_id: i64,
    pub max_users: i32,
    pub current_users: i32,
    pub issued_at: String,
    pub expires_at: String,
    pub seats_available: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExpiringLicenseResponse {
    pub id: i64,
    pub upid: String,
    pub org_id: i64,
    pub expires_at: String,
    pub days_until_expiration: i64,
    pub max_users: i32,
    pub current_users: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrgLicensesResponse {
    pub id: i64,
    pub upid: String,
    pub status: String,
    pub issued_at: String,
    pub expires_at: String,
    pub max_users: i32,
    pub current_users: i32,
    pub assigned_users: i32,
}

#[derive(Debug, Clone, Deserialize)]
pub struct LicenseQueryParams {
    pub org_id: Option<i64>,
    pub limit: Option<i32>,
    pub offset: Option<i32>,
}

pub struct LicenseQueryHandler {
    pub pool: Arc<PgPool>,
}

/// Get all active licenses (non-expired, not revoked)
/// Optional filters: org_id
pub async fn get_active_licenses(
    State(state): State<Arc<LicenseQueryHandler>>,
    AuthClaims(_claims): AuthClaims,
    Query(params): Query<LicenseQueryParams>,
) -> AppResult<Json<Vec<ActiveLicenseResponse>>> {
    let limit = params.limit.unwrap_or(50).min(500);
    let offset = params.offset.unwrap_or(0).max(0);

    let query = if let Some(org_id) = params.org_id {
        // Org admin can only see their org's licenses
        sqlx::query_as::<_, (i64, String, i64, i32, i32, String, String)>(
            r#"
            SELECT l.id, l.upid, l.org_id, l.max_users, l.current_users, 
                   TO_ISO8601(l.issued_at::timestamp), TO_ISO8601(l.expires_at::timestamp)
            FROM licenses l
            WHERE l.org_id = $1 
              AND l.revoked IS NULL 
              AND l.expires_at > NOW()
            LIMIT $2 OFFSET $3
            "#,
        )
        .bind(org_id)
        .bind(limit)
        .bind(offset)
    } else {
        // Admin sees all active licenses
        sqlx::query_as::<_, (i64, String, i64, i32, i32, String, String)>(
            r#"
            SELECT l.id, l.upid, l.org_id, l.max_users, l.current_users,
                   TO_ISO8601(l.issued_at::timestamp), TO_ISO8601(l.expires_at::timestamp)
            FROM licenses l
            WHERE l.revoked IS NULL 
              AND l.expires_at > NOW()
            LIMIT $1 OFFSET $2
            "#,
        )
        .bind(limit)
        .bind(offset)
    };

    let licenses = query.fetch_all(state.pool.as_ref()).await?;

    let responses = licenses
        .into_iter()
        .map(|(id, upid, org_id, max_users, current_users, issued_at, expires_at)| {
            ActiveLicenseResponse {
                id,
                upid,
                org_id,
                max_users,
                current_users,
                issued_at,
                expires_at,
                seats_available: max_users - current_users,
            }
        })
        .collect();

    Ok(Json(responses))
}

/// Get licenses expiring soon (within 30 days)
pub async fn get_expiring_licenses(
    State(state): State<Arc<LicenseQueryHandler>>,
    AuthClaims(_claims): AuthClaims,
    Query(params): Query<LicenseQueryParams>,
) -> AppResult<Json<Vec<ExpiringLicenseResponse>>> {
    let limit = params.limit.unwrap_or(50).min(500);
    let offset = params.offset.unwrap_or(0).max(0);

    let query = if let Some(org_id) = params.org_id {
        sqlx::query_as::<_, (i64, String, i64, String, i64, i32, i32)>(
            r#"
            SELECT l.id, l.upid, l.org_id, TO_ISO8601(l.expires_at::timestamp),
                   EXTRACT(DAY FROM (l.expires_at - NOW()))::bigint,
                   l.max_users, l.current_users
            FROM licenses l
            WHERE l.org_id = $1 
              AND l.revoked IS NULL 
              AND l.expires_at > NOW()
              AND l.expires_at <= NOW() + interval '30 days'
            ORDER BY l.expires_at ASC
            LIMIT $2 OFFSET $3
            "#,
        )
        .bind(org_id)
        .bind(limit)
        .bind(offset)
    } else {
        sqlx::query_as::<_, (i64, String, i64, String, i64, i32, i32)>(
            r#"
            SELECT l.id, l.upid, l.org_id, TO_ISO8601(l.expires_at::timestamp),
                   EXTRACT(DAY FROM (l.expires_at - NOW()))::bigint,
                   l.max_users, l.current_users
            FROM licenses l
            WHERE l.revoked IS NULL 
              AND l.expires_at > NOW()
              AND l.expires_at <= NOW() + interval '30 days'
            ORDER BY l.expires_at ASC
            LIMIT $1 OFFSET $2
            "#,
        )
        .bind(limit)
        .bind(offset)
    };

    let licenses = query.fetch_all(state.pool.as_ref()).await?;

    let responses = licenses
        .into_iter()
        .map(|(id, upid, org_id, expires_at, days, max_users, current_users)| {
            ExpiringLicenseResponse {
                id,
                upid,
                org_id,
                expires_at,
                days_until_expiration: days,
                max_users,
                current_users,
            }
        })
        .collect();

    Ok(Json(responses))
}

/// Get all licenses for an organization (admin/org_admin only)
pub async fn get_org_licenses(
    State(state): State<Arc<LicenseQueryHandler>>,
    AuthClaims(_claims): AuthClaims,
    Query(params): Query<LicenseQueryParams>,
) -> AppResult<Json<Vec<OrgLicensesResponse>>> {
    let org_id = params.org_id.ok_or_else(|| {
        AppError::BadRequest("org_id parameter is required".to_string())
    })?;

    let limit = params.limit.unwrap_or(50).min(500);
    let offset = params.offset.unwrap_or(0).max(0);

    let licenses = sqlx::query_as::<_, (i64, String, String, String, String, i32, i32)>(
        r#"
        SELECT l.id, l.upid, 
               CASE 
                   WHEN l.revoked IS NOT NULL THEN 'revoked'
                   WHEN l.expires_at < NOW() THEN 'expired'
                   ELSE 'active'
               END as status,
               TO_ISO8601(l.issued_at::timestamp),
               TO_ISO8601(l.expires_at::timestamp),
               l.max_users, l.current_users
        FROM licenses l
        WHERE l.org_id = $1
        ORDER BY l.issued_at DESC
        LIMIT $2 OFFSET $3
        "#,
    )
    .bind(org_id)
    .bind(limit)
    .bind(offset)
    .fetch_all(state.pool.as_ref())
    .await?;

    // Get count of users assigned to each license
    let mut responses = Vec::new();
    for (id, upid, status, issued_at, expires_at, max_users, current_users) in licenses {
        let assigned_count: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM user_licenses WHERE license_id = $1 AND revoked_at IS NULL",
        )
        .bind(id)
        .fetch_one(state.pool.as_ref())
        .await?;

        responses.push(OrgLicensesResponse {
            id,
            upid,
            status,
            issued_at,
            expires_at,
            max_users,
            current_users,
            assigned_users: assigned_count.0 as i32,
        });
    }

    Ok(Json(responses))
}

/// Get license summary for a user
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserLicenseSummary {
    pub total_licenses: i32,
    pub active_licenses: i32,
    pub expiring_soon: i32,
}

pub async fn get_user_license_summary(
    State(state): State<Arc<LicenseQueryHandler>>,
    AuthClaims(claims): AuthClaims,
) -> AppResult<Json<UserLicenseSummary>> {
    let total: (i64,) = sqlx::query_as(
        "SELECT COUNT(DISTINCT license_id) FROM user_licenses WHERE user_id = $1 AND revoked_at IS NULL",
    )
    .bind(claims.user_id)
    .fetch_one(state.pool.as_ref())
    .await?;

    let active: (i64,) = sqlx::query_as(
        r#"
        SELECT COUNT(DISTINCT ul.license_id) 
        FROM user_licenses ul
        JOIN licenses l ON ul.license_id = l.id
        WHERE ul.user_id = $1 
          AND ul.revoked_at IS NULL 
          AND l.revoked IS NULL
          AND l.expires_at > NOW()
        "#,
    )
    .bind(claims.user_id)
    .fetch_one(state.pool.as_ref())
    .await?;

    let expiring: (i64,) = sqlx::query_as(
        r#"
        SELECT COUNT(DISTINCT ul.license_id)
        FROM user_licenses ul
        JOIN licenses l ON ul.license_id = l.id
        WHERE ul.user_id = $1 
          AND ul.revoked_at IS NULL 
          AND l.revoked IS NULL
          AND l.expires_at > NOW()
          AND l.expires_at <= NOW() + interval '30 days'
        "#,
    )
    .bind(claims.user_id)
    .fetch_one(state.pool.as_ref())
    .await?;

    Ok(Json(UserLicenseSummary {
        total_licenses: total.0 as i32,
        active_licenses: active.0 as i32,
        expiring_soon: expiring.0 as i32,
    }))
}
