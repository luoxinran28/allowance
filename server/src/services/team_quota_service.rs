use sqlx::PgPool;
use crate::models::{TeamProductQuota, TeamQuotaResponse};
use crate::utils::{AppResult, AppError};

pub struct TeamQuotaService;

impl TeamQuotaService {
    pub async fn allocate_quota(
        pool: &PgPool,
        team_id: i64,
        product_id: i64,
        upid: &str,
        allocated_count: i32,
    ) -> AppResult<TeamProductQuota> {
        let org_id: i64 = sqlx::query_scalar("SELECT organization_id FROM groups WHERE id = $1")
            .bind(team_id)
            .fetch_one(pool)
            .await?;

        let quota = sqlx::query_as::<_, TeamProductQuota>(
            r#"
            INSERT INTO team_product_quotas (team_id, org_id, product_id, upid, allocated_count, used_count)
            VALUES ($1, $2, $3, $4, $5, 0)
            ON CONFLICT (team_id, product_id) 
            DO UPDATE SET allocated_count = $5, updated_at = NOW()
            RETURNING *
            "#
        )
        .bind(team_id)
        .bind(org_id)
        .bind(product_id)
        .bind(upid)
        .bind(allocated_count)
        .fetch_one(pool)
        .await?;

        Ok(quota)
    }

    pub async fn check_quota_available(
        pool: impl sqlx::Executor<'_, Database = sqlx::Postgres>,
        team_id: i64,
        product_id: i64,
    ) -> AppResult<bool> {
        let quota = sqlx::query_as::<_, TeamProductQuota>(
            "SELECT * FROM team_product_quotas WHERE team_id = $1 AND product_id = $2"
        )
        .bind(team_id)
        .bind(product_id)
        .fetch_optional(pool)
        .await?;

        Ok(quota.map(|q| q.used_count < q.allocated_count).unwrap_or(false))
    }

    pub async fn consume_quota(pool: impl sqlx::Executor<'_, Database = sqlx::Postgres>, team_id: i64, product_id: i64) -> AppResult<()> {
        let result = sqlx::query(
            "UPDATE team_product_quotas SET used_count = used_count + 1, updated_at = NOW() WHERE team_id = $1 AND product_id = $2 AND used_count < allocated_count"
        )
        .bind(team_id)
        .bind(product_id)
        .execute(pool)
        .await?;

        if result.rows_affected() == 0 {
            return Err(AppError::BadRequest("Quota exceeded".to_string()));
        }

        Ok(())
    }

    pub async fn release_quota(pool: impl sqlx::Executor<'_, Database = sqlx::Postgres>, team_id: i64, product_id: i64) -> AppResult<()> {
        sqlx::query(
            "UPDATE team_product_quotas SET used_count = used_count - 1, updated_at = NOW() WHERE team_id = $1 AND product_id = $2"
        )
        .bind(team_id)
        .bind(product_id)
        .execute(pool)
        .await?;

        Ok(())
    }

    pub async fn get_all_team_quotas(pool: &PgPool) -> AppResult<Vec<TeamQuotaResponse>> {
        let quotas = sqlx::query_as::<_, (i64, i64, String, i64, i64, String, String, i32, i32)>(
            r#"
            SELECT tpq.id, tpq.team_id, g.name as team_name, tpq.org_id, tpq.product_id, p.name as product_name, 
                   tpq.upid, tpq.allocated_count, tpq.used_count
            FROM team_product_quotas tpq
            JOIN groups g ON tpq.team_id = g.id
            JOIN products p ON tpq.product_id = p.id
            ORDER BY tpq.team_id, p.name
            "#
        )
        .fetch_all(pool)
        .await?;

        Ok(quotas.into_iter().map(|(id, team_id, team_name, org_id, product_id, product_name, upid, allocated, used)| {
            TeamQuotaResponse {
                id,
                team_id,
                team_name,
                org_id,
                product_id,
                product_name,
                upid,
                allocated_count: allocated,
                used_count: used,
                available_count: allocated - used,
            }
        }).collect())
    }

    pub async fn get_team_quota_summary(pool: &PgPool, team_id: i64) -> AppResult<Vec<TeamQuotaResponse>> {
        let quotas = sqlx::query_as::<_, (i64, i64, String, i64, i64, String, String, i32, i32)>(
            r#"
            SELECT tpq.id, tpq.team_id, g.name as team_name, tpq.org_id, tpq.product_id, p.name as product_name, 
                   tpq.upid, tpq.allocated_count, tpq.used_count
            FROM team_product_quotas tpq
            JOIN groups g ON tpq.team_id = g.id
            JOIN products p ON tpq.product_id = p.id
            WHERE tpq.team_id = $1
            "#
        )
        .bind(team_id)
        .fetch_all(pool)
        .await?;

        Ok(quotas.into_iter().map(|(id, team_id, team_name, org_id, product_id, product_name, upid, allocated, used)| {
            TeamQuotaResponse {
                id,
                team_id,
                team_name,
                org_id,
                product_id,
                product_name,
                upid,
                allocated_count: allocated,
                used_count: used,
                available_count: allocated - used,
            }
        }).collect())
    }
}
