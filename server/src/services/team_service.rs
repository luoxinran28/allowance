use sqlx::PgPool;
use chrono::Utc;

use crate::models::{Group, UserGroup};
use crate::utils::{errors::{AppError, AppResult}, crypto::generate_uuid};

/// Team/Group service
pub struct TeamService;

impl TeamService {
    /// Create a new team (group)
    pub async fn create_team(
        pool: &PgPool,
        user_id: i64,
        org_id: i64,
        name: &str,
        description: Option<&str>,
    ) -> AppResult<Group> {
        let group_id = generate_uuid();
        let now = Utc::now().naive_utc();

        let group = sqlx::query_as::<_, Group>(
            r#"
            INSERT INTO groups (group_id, organization_id, name, description, created_by, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
            "#
        )
            .bind(&group_id)
            .bind(org_id)
            .bind(name)
            .bind(description)
            .bind(user_id)
            .bind(now)
            .bind(now)
            .fetch_one(pool)
            .await?;

        // Add creator as team admin
        sqlx::query(
            r#"
            INSERT INTO user_groups (user_id, group_id, role, created_at)
            VALUES ($1, $2, 'admin', $3)
            "#
        )
            .bind(user_id)
            .bind(group.id)
            .bind(now)
            .execute(pool)
            .await?;

        Ok(group)
    }

    /// List teams for a user
    pub async fn list_user_teams(
        pool: &PgPool,
        user_id: i64,
    ) -> AppResult<Vec<Group>> {
        let teams = sqlx::query_as::<_, Group>(
            r#"
            SELECT g.* FROM groups g
            JOIN user_groups ug ON g.id = ug.group_id
            WHERE ug.user_id = $1
            ORDER BY g.created_at DESC
            "#
        )
            .bind(user_id)
            .fetch_all(pool)
            .await?;

        Ok(teams)
    }

    /// Get a specific team by ID
    pub async fn get_team(
        pool: &PgPool,
        team_id: i64,
    ) -> AppResult<Group> {
        let team = sqlx::query_as::<_, Group>(
            "SELECT * FROM groups WHERE id = $1"
        )
            .bind(team_id)
            .fetch_optional(pool)
            .await?
            .ok_or(AppError::NotFound("Team not found".to_string()))?;

        Ok(team)
    }

    /// Add member to team
    pub async fn add_member(
        pool: &PgPool,
        user_id: i64,
        team_id: i64,
        role: &str,
    ) -> AppResult<()> {
        // Verify team exists
        let _team = Self::get_team(pool, team_id).await?;

        // Check if user is already a member
        let existing = sqlx::query(
            "SELECT 1 FROM user_groups WHERE user_id = $1 AND group_id = $2"
        )
            .bind(user_id)
            .bind(team_id)
            .fetch_optional(pool)
            .await?;

        if existing.is_some() {
            return Err(AppError::InvalidRequest("User is already a member of this team".to_string()));
        }

        let now = Utc::now().naive_utc();
        sqlx::query(
            r#"
            INSERT INTO user_groups (user_id, group_id, role, created_at)
            VALUES ($1, $2, $3, $4)
            "#
        )
            .bind(user_id)
            .bind(team_id)
            .bind(role)
            .bind(now)
            .execute(pool)
            .await?;

        Ok(())
    }

    /// List team members
    pub async fn list_team_members(
        pool: &PgPool,
        team_id: i64,
    ) -> AppResult<Vec<UserGroup>> {
        let members = sqlx::query_as::<_, UserGroup>(
            r#"
            SELECT * FROM user_groups
            WHERE group_id = $1
            ORDER BY created_at ASC
            "#
        )
            .bind(team_id)
            .fetch_all(pool)
            .await?;

        Ok(members)
    }

    /// Remove member from team
    pub async fn remove_member(
        pool: &PgPool,
        user_id: i64,
        team_id: i64,
    ) -> AppResult<()> {
        let result = sqlx::query(
            "DELETE FROM user_groups WHERE user_id = $1 AND group_id = $2"
        )
            .bind(user_id)
            .bind(team_id)
            .execute(pool)
            .await?;

        if result.rows_affected() == 0 {
            return Err(AppError::NotFound("User not found in team".to_string()));
        }

        Ok(())
    }

    /// Update member role
    pub async fn update_member_role(
        pool: &PgPool,
        user_id: i64,
        team_id: i64,
        new_role: &str,
    ) -> AppResult<()> {
        let result = sqlx::query(
            "UPDATE user_groups SET role = $1 WHERE user_id = $2 AND group_id = $3"
        )
            .bind(new_role)
            .bind(user_id)
            .bind(team_id)
            .execute(pool)
            .await?;

        if result.rows_affected() == 0 {
            return Err(AppError::NotFound("User not found in team".to_string()));
        }

        Ok(())
    }
}
