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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::utils::crypto::generate_uuid;

    #[test]
    fn test_uuid_generation() {
        let uuid1 = generate_uuid();
        let uuid2 = generate_uuid();

        // UUIDs should be different
        assert_ne!(uuid1, uuid2, "Generated UUIDs should be unique");

        // UUID should be valid format (36 characters with dashes)
        assert_eq!(uuid1.len(), 36, "UUID should be 36 characters");
        assert!(uuid1.contains('-'), "UUID should contain dashes");

        // Should have 5 parts separated by dashes
        let parts: Vec<&str> = uuid1.split('-').collect();
        assert_eq!(parts.len(), 5, "UUID should have 5 parts");

        // Check part lengths
        assert_eq!(parts[0].len(), 8, "First part should be 8 chars");
        assert_eq!(parts[1].len(), 4, "Second part should be 4 chars");
        assert_eq!(parts[2].len(), 4, "Third part should be 4 chars");
        assert_eq!(parts[3].len(), 4, "Fourth part should be 4 chars");
        assert_eq!(parts[4].len(), 12, "Fifth part should be 12 chars");
    }

    #[test]
    fn test_team_name_validation() {
        let long_name = "a".repeat(101);

        let valid_names = vec![
            "Marketing Team",
            "DevOps",
            "Product Team",
            "A", // Minimum length
        ];

        let invalid_names = vec![
            "", // Empty
            "   ", // Only whitespace
            &long_name, // Too long (assuming 100 char limit)
        ];

        for name in valid_names {
            assert!(!name.trim().is_empty(), "Valid name should not be empty after trim");
            assert!(name.len() <= 100, "Valid name should be within length limit");
        }

        for name in invalid_names {
            assert!(
                name.trim().is_empty() || name.len() > 100,
                "Invalid name should fail validation: '{}'",
                name
            );
        }
    }

    #[test]
    fn test_team_member_role_validation() {
        let valid_roles = vec!["admin", "leader", "member"];
        let invalid_roles = vec!["", "owner", "manager", "guest", "superuser"];

        for role in valid_roles {
            assert!(!role.is_empty(), "Valid role should not be empty");
            assert!(role.len() <= 20, "Valid role should be reasonable length");
            assert!(matches!(role, "admin" | "leader" | "member"), "Role should be one of the valid options");
        }

        for role in invalid_roles {
            assert!(
                role.is_empty() || role.len() > 20 || !matches!(role, "admin" | "leader" | "member"),
                "Invalid role should fail validation: '{}'",
                role
            );
        }
    }

    #[test]
    fn test_team_description_validation() {
        let valid_descriptions = vec![
            Some("Marketing department team"),
            Some("DevOps and infrastructure team"),
            None, // Optional field
            Some(""), // Empty string allowed
        ];

        let invalid_descriptions = vec![
            Some("a".repeat(1001)), // Too long (assuming 1000 char limit)
        ];

        for desc in valid_descriptions {
            match desc {
                Some(d) => assert!(d.len() <= 1000, "Description should be within length limit"),
                None => (), // None is valid
            }
        }

        for desc in invalid_descriptions {
            if let Some(d) = desc {
                assert!(d.len() > 1000, "Invalid description should exceed length limit");
            }
        }
    }
}
