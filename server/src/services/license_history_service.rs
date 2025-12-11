use crate::utils::AppResult;

pub struct LicenseHistoryService;

impl LicenseHistoryService {
    pub async fn record_change(
        pool: impl sqlx::Executor<'_, Database = sqlx::Postgres>,
        user_id: i64,
        action: &str,
        old_tier: Option<&str>,
        new_tier: Option<&str>,
        reason: &str,
        changed_by: i64,
        metadata: Option<serde_json::Value>,
    ) -> AppResult<()> {
        sqlx::query(
            r#"
            INSERT INTO user_license_history 
            (user_id, action, old_tier, new_tier, reason, changed_by, metadata)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            "#
        )
        .bind(user_id)
        .bind(action)
        .bind(old_tier)
        .bind(new_tier)
        .bind(reason)
        .bind(changed_by)
        .bind(metadata)
        .execute(pool)
        .await?;

        Ok(())
    }
}
