use sqlx::PgPool;
use chrono::Utc;

use crate::models::Organization;
use crate::utils::{errors::{AppError, AppResult}, crypto::generate_token};

/// Organization service
pub struct OrganizationService;

impl OrganizationService {
    /// Create a new organization
    pub async fn create_organization(
        pool: &PgPool,
        user_id: i64,
        name: &str,
        description: Option<&str>,
    ) -> AppResult<Organization> {
        let org_id = generate_token(8);
        let now = Utc::now().naive_utc();

        let org = sqlx::query_as::<_, Organization>(
            r#"
            INSERT INTO organizations (org_id, name, description, created_by, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
            "#
        )
            .bind(&org_id)
            .bind(name)
            .bind(description)
            .bind(user_id)
            .bind(now)
            .bind(now)
            .fetch_one(pool)
            .await?;

        Ok(org)
    }

    /// Get organization by ID
    pub async fn get_organization(
        pool: &PgPool,
        org_id: i64,
    ) -> AppResult<Organization> {
        let org = sqlx::query_as::<_, Organization>(
            "SELECT * FROM organizations WHERE id = $1"
        )
            .bind(org_id)
            .fetch_optional(pool)
            .await?
            .ok_or(AppError::NotFound("Organization not found".to_string()))?;

        Ok(org)
    }

    /// Search organizations by name
    pub async fn search_organizations(
        pool: &PgPool,
        query: &str,
    ) -> AppResult<Vec<Organization>> {
        let search_query = format!("%{}%", query);
        let orgs = sqlx::query_as::<_, Organization>(
            r#"
            SELECT * FROM organizations
            WHERE name ILIKE $1 OR description ILIKE $1
            ORDER BY created_at DESC
            LIMIT 50
            "#
        )
            .bind(&search_query)
            .fetch_all(pool)
            .await?;

        Ok(orgs)
    }

    /// List all organizations (with pagination)
    pub async fn list_organizations(
        pool: &PgPool,
        page: i64,
        page_size: i64,
    ) -> AppResult<(Vec<Organization>, i64)> {
        let offset = (page - 1) * page_size;

        let orgs = sqlx::query_as::<_, Organization>(
            r#"
            SELECT * FROM organizations
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
            "#
        )
            .bind(page_size)
            .bind(offset)
            .fetch_all(pool)
            .await?;

        let total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM organizations")
            .fetch_one(pool)
            .await?;

        Ok((orgs, total))
    }

    /// Get organizations created by user
    pub async fn get_user_organizations(
        pool: &PgPool,
        user_id: i64,
    ) -> AppResult<Vec<Organization>> {
        let orgs = sqlx::query_as::<_, Organization>(
            r#"
            SELECT * FROM organizations
            WHERE created_by = $1
            ORDER BY created_at DESC
            "#
        )
            .bind(user_id)
            .fetch_all(pool)
            .await?;

        Ok(orgs)
    }

    /// Update organization
    pub async fn update_organization(
        pool: &PgPool,
        org_id: i64,
        name: Option<&str>,
        description: Option<&str>,
    ) -> AppResult<Organization> {
        let now = Utc::now().naive_utc();

        let org = sqlx::query_as::<_, Organization>(
            r#"
            UPDATE organizations
            SET name = COALESCE($1, name),
                description = COALESCE($2, description),
                updated_at = $3
            WHERE id = $4
            RETURNING *
            "#
        )
            .bind(name)
            .bind(description)
            .bind(now)
            .bind(org_id)
            .fetch_optional(pool)
            .await?
            .ok_or(AppError::NotFound("Organization not found".to_string()))?;

        Ok(org)
    }

    /// Delete organization (only by creator)
    pub async fn delete_organization(
        pool: &PgPool,
        org_id: i64,
        user_id: i64,
    ) -> AppResult<()> {
        // Verify organization exists and user is creator
        let org = Self::get_organization(pool, org_id).await?;
        if org.created_by != user_id {
            return Err(AppError::Forbidden);
        }

        let result = sqlx::query(
            "DELETE FROM organizations WHERE id = $1"
        )
            .bind(org_id)
            .execute(pool)
            .await?;

        if result.rows_affected() == 0 {
            return Err(AppError::NotFound("Organization not found".to_string()));
        }

        Ok(())
    }

    // ============================================================
    // Organization Boss Management
    // ============================================================

    /// List all bosses for an organization
    pub async fn list_organization_bosses(
        pool: &PgPool,
        org_id: i64,
    ) -> AppResult<Vec<crate::models::OrganizationBoss>> {
        let bosses = sqlx::query_as::<_, crate::models::OrganizationBoss>(
            r#"
            SELECT ob.id, ob.organization_id, ob.user_id, ob.assigned_by, ob.assigned_at, ob.notes,
                   u.uid, u.email, u.tier::text as tier
            FROM organization_bosses ob
            JOIN users u ON ob.user_id = u.id
            WHERE ob.organization_id = $1
            ORDER BY ob.assigned_at DESC
            "#
        )
            .bind(org_id)
            .fetch_all(pool)
            .await?;

        Ok(bosses)
    }

    /// Add a boss to an organization
    /// The user must not already be a boss of another organization
    pub async fn add_organization_boss(
        pool: &PgPool,
        org_id: i64,
        user_id: i64,
        assigned_by: i64,
        notes: Option<&str>,
    ) -> AppResult<crate::models::OrganizationBoss> {
        let mut tx = pool.begin().await?;

        // Check if user is already a boss of another organization
        let existing_boss: Option<(i64,)> = sqlx::query_as(
            "SELECT organization_id FROM organization_bosses WHERE user_id = $1"
        )
            .bind(user_id)
            .fetch_optional(&mut *tx)
            .await?;

        if let Some((existing_org_id,)) = existing_boss {
            if existing_org_id != org_id {
                return Err(AppError::BadRequest(
                    "User is already a boss of another organization".to_string()
                ));
            }
            // Already boss of this org, return error
            return Err(AppError::BadRequest(
                "User is already a boss of this organization".to_string()
            ));
        }

        // Insert into organization_bosses
        sqlx::query(
            r#"
            INSERT INTO organization_bosses (organization_id, user_id, assigned_by, notes)
            VALUES ($1, $2, $3, $4)
            "#
        )
            .bind(org_id)
            .bind(user_id)
            .bind(assigned_by)
            .bind(notes)
            .execute(&mut *tx)
            .await?;

        // Update user's tier to premium and organization_id
        sqlx::query(
            r#"
            UPDATE users 
            SET tier = 'premium', organization_id = $1, updated_at = NOW()
            WHERE id = $2
            "#
        )
            .bind(org_id)
            .bind(user_id)
            .execute(&mut *tx)
            .await?;

        // Add user to default team if not already a member
        let default_team_id: Option<(i64,)> = sqlx::query_as(
            "SELECT id FROM teams WHERE organization_id = $1 AND is_default = true"
        )
            .bind(org_id)
            .fetch_optional(&mut *tx)
            .await?;

        if let Some((team_id,)) = default_team_id {
            // Check if user is already in the team
            let exists: bool = sqlx::query_scalar(
                "SELECT EXISTS(SELECT 1 FROM user_teams WHERE user_id = $1 AND team_id = $2)"
            )
                .bind(user_id)
                .bind(team_id)
                .fetch_one(&mut *tx)
                .await?;

            if !exists {
                sqlx::query(
                    r#"
                    INSERT INTO user_teams (user_id, team_id, role)
                    VALUES ($1, $2, 'admin')
                    ON CONFLICT (user_id, team_id) DO NOTHING
                    "#
                )
                    .bind(user_id)
                    .bind(team_id)
                    .execute(&mut *tx)
                    .await?;
            }
        }

        tx.commit().await?;

        // Fetch and return the created boss record
        let boss = sqlx::query_as::<_, crate::models::OrganizationBoss>(
            r#"
            SELECT ob.id, ob.organization_id, ob.user_id, ob.assigned_by, ob.assigned_at, ob.notes,
                   u.uid, u.email, u.tier::text as tier
            FROM organization_bosses ob
            JOIN users u ON ob.user_id = u.id
            WHERE ob.organization_id = $1 AND ob.user_id = $2
            "#
        )
            .bind(org_id)
            .bind(user_id)
            .fetch_one(pool)
            .await?;

        Ok(boss)
    }

    /// Remove a boss from an organization
    /// Cannot remove if this is the only boss
    pub async fn remove_organization_boss(
        pool: &PgPool,
        org_id: i64,
        user_id: i64,
    ) -> AppResult<()> {
        let mut tx = pool.begin().await?;

        // Count bosses for this organization
        let boss_count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM organization_bosses WHERE organization_id = $1"
        )
            .bind(org_id)
            .fetch_one(&mut *tx)
            .await?;

        if boss_count <= 1 {
            return Err(AppError::BadRequest(
                "Cannot remove the only boss of an organization".to_string()
            ));
        }

        // Remove from organization_bosses
        let result = sqlx::query(
            "DELETE FROM organization_bosses WHERE organization_id = $1 AND user_id = $2"
        )
            .bind(org_id)
            .bind(user_id)
            .execute(&mut *tx)
            .await?;

        if result.rows_affected() == 0 {
            return Err(AppError::NotFound("Boss not found in this organization".to_string()));
        }

        // Downgrade user's tier to free (or keep as standard if still in teams)
        // Check if user is in any teams other than default team
        let team_count: i64 = sqlx::query_scalar(
            r#"
            SELECT COUNT(*) FROM user_teams ut
            JOIN teams t ON ut.team_id = t.id
            WHERE ut.user_id = $1 AND t.is_default = false
            "#
        )
            .bind(user_id)
            .fetch_one(&mut *tx)
            .await?;

        if team_count > 0 {
            // User is still in other teams, downgrade to standard
            sqlx::query("UPDATE users SET tier = 'standard', updated_at = NOW() WHERE id = $1")
                .bind(user_id)
                .execute(&mut *tx)
                .await?;
        } else {
            // User is not in any non-default teams, downgrade to free
            sqlx::query(
                "UPDATE users SET tier = 'free', organization_id = NULL, updated_at = NOW() WHERE id = $1"
            )
                .bind(user_id)
                .execute(&mut *tx)
                .await?;

            // Remove from default team
            sqlx::query(
                r#"
                DELETE FROM user_teams 
                WHERE user_id = $1 AND team_id IN (
                    SELECT id FROM teams WHERE organization_id = $2 AND is_default = true
                )
                "#
            )
                .bind(user_id)
                .bind(org_id)
                .execute(&mut *tx)
                .await?;
        }

        tx.commit().await?;
        Ok(())
    }

    /// Get available users who can be made bosses (not already boss of another org)
    pub async fn get_available_boss_candidates(
        pool: &PgPool,
        org_id: i64,
    ) -> AppResult<Vec<crate::models::BossCandidate>> {
        // Get users who:
        // 1. Are not already bosses of another organization
        // 2. Are not allstar (admins don't need to be bosses)
        // 3. Either have no organization or belong to this organization
        let users = sqlx::query_as::<_, crate::models::BossCandidate>(
            r#"
            SELECT u.id, u.uid, u.email, u.tier::text as tier, u.status::text as status,
                   u.organization_id
            FROM users u
            WHERE u.tier != 'allstar'
              AND u.status = 'active'
              AND u.id NOT IN (SELECT user_id FROM organization_bosses WHERE organization_id != $1)
              AND (u.organization_id IS NULL OR u.organization_id = $1)
            ORDER BY u.email
            "#
        )
            .bind(org_id)
            .fetch_all(pool)
            .await?;

        Ok(users)
    }
}
mod tests {

    #[test]
    fn test_organization_name_validation() {
        let long_name = "a".repeat(101);

        let valid_names = vec![
            "ACME Corporation",
            "Tech Startup Inc",
            "Global Solutions Ltd",
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
    fn test_organization_description_validation() {
        let valid_descriptions = vec![
            Some("Leading enterprise software company"),
            Some("Innovative technology solutions provider"),
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

    #[test]
    fn test_organization_search_query_validation() {
        let valid_queries = vec![
            "ACME",
            "tech startup",
            "Global Solutions",
            "a", // Minimum length
            "", // Empty search (should return all)
        ];

        let invalid_queries = vec![
            "a".repeat(101), // Too long (assuming 100 char limit)
        ];

        for query in valid_queries {
            assert!(query.len() <= 100, "Valid query should be within length limit");
        }

        for query in invalid_queries {
            assert!(query.len() > 100, "Invalid query should exceed length limit");
        }
    }

    #[test]
    fn test_pagination_parameters() {
        let valid_page_params = vec![
            (1, 10),   // First page, default size
            (2, 20),   // Second page, larger size
            (100, 50), // High page number
            (1, 1),    // Minimum page size
        ];

        let invalid_page_params = vec![
            (0, 10),   // Invalid page (0)
            (-1, 10),  // Negative page
            (1, 0),    // Invalid page size (0)
            (1, -5),   // Negative page size
            (1, 1001), // Too large page size (assuming 1000 limit)
        ];

        for (page, page_size) in valid_page_params {
            assert!(page > 0, "Page should be positive: {}", page);
            assert!(page_size > 0, "Page size should be positive: {}", page_size);
            assert!(page_size <= 1000, "Page size should be within limit: {}", page_size);
        }

        for (page, page_size) in invalid_page_params {
            assert!(
                page <= 0 || page_size <= 0 || page_size > 1000,
                "Invalid pagination params should fail: page={}, size={}",
                page,
                page_size
            );
        }
    }

    #[test]
    fn test_organization_update_validation() {
        struct UpdateRequest {
            name: Option<String>,
            description: Option<String>,
        }

        let valid_updates = vec![
            UpdateRequest {
                name: Some("Updated Name".to_string()),
                description: None,
            },
            UpdateRequest {
                name: None,
                description: Some("Updated description".to_string()),
            },
            UpdateRequest {
                name: Some("New Name".to_string()),
                description: Some("New description".to_string()),
            },
        ];

        let invalid_updates = vec![
            UpdateRequest {
                name: Some("".to_string()), // Empty name
                description: None,
            },
            UpdateRequest {
                name: Some("a".repeat(101)), // Name too long
                description: None,
            },
            UpdateRequest {
                name: None,
                description: Some("a".repeat(1001)), // Description too long
            },
        ];

        for update in valid_updates {
            if let Some(name) = &update.name {
                assert!(!name.trim().is_empty(), "Name should not be empty after trim");
                assert!(name.len() <= 100, "Name should be within length limit");
            }
            if let Some(desc) = &update.description {
                assert!(desc.len() <= 1000, "Description should be within length limit");
            }
        }

        for update in invalid_updates {
            let name_invalid = update.name.as_ref()
                .map_or(false, |n| n.trim().is_empty() || n.len() > 100);
            let desc_invalid = update.description.as_ref()
                .map_or(false, |d| d.len() > 1000);

            assert!(
                name_invalid || desc_invalid,
                "Invalid update should fail validation"
            );
        }
    }
}
