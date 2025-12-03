use sqlx::{PgPool, Row};
use crate::models::TeamMemberResponse;
use crate::services::{TeamQuotaService, FreeUserService, LicenseHistoryService};
use crate::utils::{AppResult, AppError};

pub struct UserGroupService;

impl UserGroupService {
    pub async fn add_member(
        pool: &PgPool,
        team_id: i64,
        user_id: i64,
        selected_upids: Vec<String>,
        role: &str,
        changed_by: i64,
    ) -> AppResult<()> {
        if selected_upids.is_empty() {
            return Err(AppError::BadRequest("At least one product required".to_string()));
        }

        let mut tx = pool.begin().await?;

        let user: (String, String) = sqlx::query_as("SELECT tier, source_upid FROM users WHERE id = $1")
            .bind(user_id)
            .fetch_one(&mut *tx)
            .await?;
        let (tier, source_upid) = (user.0, user.1);

        if !source_upid.is_empty() && !selected_upids.contains(&source_upid) {
            let has_quota: bool = sqlx::query_scalar(
                "SELECT EXISTS(SELECT 1 FROM team_product_quotas WHERE team_id = $1 AND upid = $2 AND used_count < allocated_count)"
            )
            .bind(team_id)
            .bind(&source_upid)
            .fetch_one(&mut *tx)
            .await?;

            if !has_quota {
                return Err(AppError::BadRequest(format!("Team does not have quota for source product {}", source_upid)));
            }
        }

        for upid in &selected_upids {
            let product_id: i64 = sqlx::query_scalar("SELECT id FROM products WHERE upid = $1")
                .bind(upid)
                .fetch_one(&mut *tx)
                .await?;

            if !TeamQuotaService::check_quota_available(&mut *tx, team_id, product_id).await? {
                return Err(AppError::BadRequest(format!("Insufficient quota for product {}", upid)));
            }

            TeamQuotaService::consume_quota(&mut *tx, team_id, product_id).await?;
        }

        sqlx::query("INSERT INTO user_groups (user_id, group_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING")
            .bind(user_id)
            .bind(team_id)
            .bind(role)
            .execute(&mut *tx)
            .await?;

        if tier == "free" {
            sqlx::query("UPDATE users SET tier = 'standard' WHERE id = $1")
                .bind(user_id)
                .execute(&mut *tx)
                .await?;

            FreeUserService::revoke_free_license(&mut *tx, user_id).await?;

            LicenseHistoryService::record_change(
                &mut *tx, user_id, "tier_upgraded", Some("free"), Some("standard"),
                "Added to team", changed_by, None
            ).await?;
        }

        tx.commit().await?;
        Ok(())
    }

    pub async fn remove_member(pool: &PgPool, team_id: i64, user_id: i64, changed_by: i64) -> AppResult<()> {
        let mut tx = pool.begin().await?;

        let product_ids: Vec<i64> = sqlx::query_scalar(
            "SELECT product_id FROM team_product_quotas WHERE team_id = $1"
        )
        .bind(team_id)
        .fetch_all(&mut *tx)
        .await?;

        for product_id in product_ids {
            TeamQuotaService::release_quota(&mut *tx, team_id, product_id).await?;
        }

        sqlx::query("DELETE FROM user_groups WHERE user_id = $1 AND group_id = $2")
            .bind(user_id)
            .bind(team_id)
            .execute(&mut *tx)
            .await?;

        let other_teams: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM user_groups WHERE user_id = $1")
            .bind(user_id)
            .fetch_one(&mut *tx)
            .await?;

        if other_teams == 0 {
            let source_upid: Option<String> = sqlx::query_scalar("SELECT source_upid FROM users WHERE id = $1")
                .bind(user_id)
                .fetch_one(&mut *tx)
                .await?;

            sqlx::query("UPDATE users SET tier = 'free' WHERE id = $1")
                .bind(user_id)
                .execute(&mut *tx)
                .await?;

            if let Some(upid) = source_upid {
                let product_id: i64 = sqlx::query_scalar("SELECT id FROM products WHERE upid = $1")
                    .bind(&upid)
                    .fetch_one(&mut *tx)
                    .await?;
                FreeUserService::create_free_license(&mut *tx, user_id, product_id, &upid).await?;
            }

            LicenseHistoryService::record_change(
                &mut *tx, user_id, "tier_downgraded", Some("standard"), Some("free"),
                "Removed from last team", changed_by, None
            ).await?;
        }

        tx.commit().await?;
        Ok(())
    }

    pub async fn list_team_members(pool: &PgPool, team_id: i64) -> AppResult<Vec<TeamMemberResponse>> {
        let mut members = sqlx::query_as::<_, (i64, String, String)>(
            r#"
            SELECT u.id, u.uid, u.email
            FROM users u
            JOIN user_groups ug ON u.id = ug.user_id
            WHERE ug.group_id = $1
            ORDER BY u.email
            "#
        )
        .bind(team_id)
        .fetch_all(pool)
        .await?;

        let mut result = Vec::new();
        for (user_id, uid, email) in members {
            let products: Vec<String> = sqlx::query_scalar(
                "SELECT upid FROM team_product_quotas WHERE team_id = $1"
            )
            .bind(team_id)
            .fetch_all(pool)
            .await?;

            result.push(TeamMemberResponse {
                user_id,
                uid,
                email,
                tier: "unknown".to_string(),  // TODO: Fix
                role: "unknown".to_string(),  // TODO: Fix
                products,
            });
        }

        Ok(result)
    }
}
