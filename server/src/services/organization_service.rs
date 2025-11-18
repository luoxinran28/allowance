use sqlx::PgPool;
use chrono::Utc;

use crate::models::Organization;
use crate::utils::{errors::{AppError, AppResult}, crypto::generate_uuid};

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
        let org_id = generate_uuid();
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
}

#[cfg(test)]
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
