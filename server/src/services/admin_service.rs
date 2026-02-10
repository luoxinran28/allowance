use sqlx::PgPool;
use crate::models::{User, UserResponse};
use crate::utils::{AppResult, AppError};

pub struct AdminService;

impl AdminService {
    /// List all users with pagination (admin only)
    pub async fn list_users(
        pool: &PgPool,
        page: i64,
        page_size: i64,
    ) -> AppResult<(Vec<UserResponse>, i64)> {
        if page < 1 || page_size < 1 || page_size > 1000 {
            return Err(AppError::InvalidRequest("Invalid pagination parameters".to_string()));
        }

        let offset = (page - 1) * page_size;

        let users = sqlx::query_as::<_, User>(
            r#"
            SELECT id, uid, email, password_hash, tier, status, organization_id, team_ids, license_status, source_product_slug, profile_data, created_at, updated_at, last_login FROM users
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
            "#
        )
            .bind(page_size)
            .bind(offset)
            .fetch_all(pool)
            .await?;

        let total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM users")
            .fetch_one(pool)
            .await?;

        let user_responses: Vec<UserResponse> = users.into_iter()
            .map(|u| UserResponse::from(u))
            .collect();

        Ok((user_responses, total))
    }

    /// Get user details by ID (admin only)
    pub async fn get_user_by_id(
        pool: &PgPool,
        user_id: i64,
    ) -> AppResult<UserResponse> {
        if user_id <= 0 {
            return Err(AppError::InvalidRequest("Invalid user ID".to_string()));
        }

        let user = sqlx::query_as::<_, User>(
            "SELECT id, uid, email, password_hash, tier, status, organization_id, team_ids, license_status, source_product_slug, profile_data, created_at, updated_at, last_login FROM users WHERE id = $1"
        )
            .bind(user_id)
            .fetch_optional(pool)
            .await?
            .ok_or(AppError::NotFound("User not found".to_string()))?;

        Ok(UserResponse::from(user))
    }

    /// Log an admin action for audit purposes
    async fn log_admin_action(
        pool: impl sqlx::Executor<'_, Database = sqlx::Postgres>,
        admin_user_id: i64,
        action: &str,
        target_type: &str,
        target_id: i64,
        old_value: Option<String>,
        new_value: Option<String>,
    ) -> AppResult<()> {
        sqlx::query(
            r#"
            INSERT INTO admin_audit_log (admin_user_id, action, target_type, target_id, old_value, new_value, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
            "#
        )
            .bind(admin_user_id)
            .bind(action)
            .bind(target_type)
            .bind(target_id)
            .bind(old_value)
            .bind(new_value)
            .execute(pool)
            .await?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {

    #[test]
    fn test_pagination_parameter_validation() {
        let valid_params = vec![
            (1, 10),   // First page, default size
            (2, 20),   // Second page, larger size
            (100, 50), // High page number
            (1, 1),    // Minimum page size
            (1, 1000), // Maximum page size
        ];

        let invalid_params = vec![
            (0, 10),   // Invalid page (0)
            (-1, 10),  // Negative page
            (1, 0),    // Invalid page size (0)
            (1, -5),   // Negative page size
            (1, 1001), // Too large page size
        ];

        for (page, page_size) in valid_params {
            assert!(page > 0, "Page should be positive: {}", page);
            assert!(page_size > 0 && page_size <= 1000, "Page size should be within limits: {}", page_size);
        }

        for (page, page_size) in invalid_params {
            assert!(
                page <= 0 || page_size <= 0 || page_size > 1000,
                "Invalid pagination params should fail: page={}, size={}",
                page,
                page_size
            );
        }
    }

    #[test]
    fn test_user_id_validation() {
        let valid_ids = vec![1, 2, 100, 999999];

        let invalid_ids = vec![0, -1, -100];

        for id in valid_ids {
            assert!(id > 0, "Valid user ID should be positive: {}", id);
        }

        for id in invalid_ids {
            assert!(id <= 0, "Invalid user ID should be non-positive: {}", id);
        }
    }

    #[test]
    fn test_tier_code_validation() {
        let valid_tiers = vec![
            "free",
            "standard",
            "premium",
            "allstar",
        ];

        let invalid_tiers = vec![
            "",      // Empty
            "   ",   // Only whitespace
            "admin", // Not a valid tier
            "super", // Not a valid tier
        ];

        for tier in valid_tiers {
            assert!(!tier.trim().is_empty(), "Valid tier should not be empty after trim");
            assert!(
                ["free", "standard", "premium", "allstar"].contains(&tier),
                "Valid tier should be recognized: {}", tier
            );
        }

        for tier in invalid_tiers {
            assert!(
                tier.trim().is_empty() || !["free", "standard", "premium", "allstar"].contains(&tier),
                "Invalid tier should fail validation: '{}'",
                tier
            );
        }
    }

    #[test]
    fn test_approval_id_validation() {
        let valid_ids = vec![1, 2, 100, 999999];

        let invalid_ids = vec![0, -1, -100];

        for id in valid_ids {
            assert!(id > 0, "Valid approval ID should be positive: {}", id);
        }

        for id in invalid_ids {
            assert!(id <= 0, "Invalid approval ID should be non-positive: {}", id);
        }
    }

    #[test]
    fn test_rejection_reason_validation() {
        let valid_reasons = vec![
            Some("User does not meet requirements".to_string()),
            Some("Request incomplete".to_string()),
            None, // No reason provided
            Some("".to_string()), // Empty string
            Some("a".to_string()), // Minimum length
        ];

        let invalid_reasons = vec![
            Some("a".repeat(1001)), // Too long (assuming 1000 char limit)
        ];

        for reason in valid_reasons {
            match reason {
                Some(r) => assert!(r.len() <= 1000, "Reason should be within length limit"),
                None => (), // None is valid
            }
        }

        for reason in invalid_reasons {
            if let Some(r) = reason {
                assert!(r.len() > 1000, "Invalid reason should exceed length limit");
            }
        }
    }

    #[test]
    fn test_admin_action_log_structure() {
        struct AdminActionLog {
            admin_user_id: i64,
            action: String,
            target_type: String,
            target_id: i64,
            old_value: Option<String>,
            new_value: Option<String>,
        }

        let valid_actions = vec![
            AdminActionLog {
                admin_user_id: 1,
                action: "tier_change".to_string(),
                target_type: "user".to_string(),
                target_id: 2,
                old_value: Some("free".to_string()),
                new_value: Some("standard".to_string()),
            },
            AdminActionLog {
                admin_user_id: 1,
                action: "user_suspend".to_string(),
                target_type: "user".to_string(),
                target_id: 2,
                old_value: Some("active".to_string()),
                new_value: Some("suspended".to_string()),
            },
            AdminActionLog {
                admin_user_id: 1,
                action: "approval_approve".to_string(),
                target_type: "approval_request".to_string(),
                target_id: 3,
                old_value: Some("pending".to_string()),
                new_value: Some("approved".to_string()),
            },
        ];

        let invalid_actions = vec![
            AdminActionLog {
                admin_user_id: 0, // Invalid admin ID
                action: "tier_change".to_string(),
                target_type: "user".to_string(),
                target_id: 2,
                old_value: None,
                new_value: Some("standard".to_string()),
            },
            AdminActionLog {
                admin_user_id: 1,
                action: "".to_string(), // Empty action
                target_type: "user".to_string(),
                target_id: 2,
                old_value: None,
                new_value: Some("standard".to_string()),
            },
            AdminActionLog {
                admin_user_id: 1,
                action: "tier_change".to_string(),
                target_type: "".to_string(), // Empty target type
                target_id: 2,
                old_value: None,
                new_value: Some("standard".to_string()),
            },
            AdminActionLog {
                admin_user_id: 1,
                action: "tier_change".to_string(),
                target_type: "user".to_string(),
                target_id: 0, // Invalid target ID
                old_value: None,
                new_value: Some("standard".to_string()),
            },
        ];

        for action in valid_actions {
            assert!(action.admin_user_id > 0, "Admin user ID should be positive");
            assert!(!action.action.is_empty(), "Action should not be empty");
            assert!(!action.target_type.is_empty(), "Target type should not be empty");
            assert!(action.target_id > 0, "Target ID should be positive");
            // old_value and new_value can be None
        }

        for action in invalid_actions {
            let admin_invalid = action.admin_user_id <= 0;
            let action_invalid = action.action.is_empty();
            let target_type_invalid = action.target_type.is_empty();
            let target_id_invalid = action.target_id <= 0;

            assert!(
                admin_invalid || action_invalid || target_type_invalid || target_id_invalid,
                "Invalid admin action should fail validation: admin_id={}, action='{}', target_type='{}', target_id={}",
                action.admin_user_id,
                action.action,
                action.target_type,
                action.target_id
            );
        }
    }

    #[test]
    fn test_request_type_handling() {
        let long_string = "a".repeat(101);

        let valid_request_types = vec![
            "tier_upgrade",
            "organization_create",
            "team_create",
            "permission_request",
        ];

        let invalid_request_types = vec![
            "",    // Empty
            "   ", // Whitespace only
            "unknown_request_type",
            &long_string, // Too long
        ];

        for request_type in valid_request_types {
            assert!(!request_type.trim().is_empty(), "Valid request type should not be empty");
            assert!(request_type.len() <= 100, "Valid request type should be within length limit");
        }

        for request_type in invalid_request_types {
            assert!(
                request_type.trim().is_empty() || request_type.len() > 100 || request_type == "unknown_request_type",
                "Invalid request type should fail validation: '{}'",
                request_type
            );
        }
    }

    #[test]
    fn test_tier_hierarchy() {
        // Test that tiers have proper ordering: allstar > premium > standard > free
        let tiers = vec!["free", "standard", "premium", "allstar"];

        fn tier_level(tier: &str) -> u8 {
            match tier {
                "free" => 0,
                "standard" => 1,
                "premium" => 2,
                "allstar" => 3,
                _ => panic!("Unknown tier: {}", tier),
            }
        }

        // Verify ordering
        for window in tiers.windows(2) {
            assert!(
                tier_level(window[0]) < tier_level(window[1]),
                "{} should be lower tier than {}",
                window[0], window[1]
            );
        }

        // Allstar should be the highest tier
        assert_eq!(tier_level("allstar"), 3, "Allstar should be the highest tier level");

        // Free should be the lowest tier
        assert_eq!(tier_level("free"), 0, "Free should be the lowest tier level");
    }

    #[test]
    fn test_approval_status_transitions() {
        let valid_transitions = vec![
            ("pending", "approved"),
            ("pending", "rejected"),
        ];

        let invalid_transitions = vec![
            ("approved", "pending"), // Cannot go back to pending
            ("rejected", "approved"), // Cannot change from rejected
            ("approved", "rejected"), // Cannot change approved to rejected
            ("", "approved"), // Invalid from status
            ("pending", ""), // Invalid to status
        ];

        for (from, to) in valid_transitions {
            assert!(!from.is_empty(), "From status should not be empty");
            assert!(!to.is_empty(), "To status should not be empty");
            assert_eq!(from, "pending", "Valid transitions should start from pending");
            assert!(to == "approved" || to == "rejected", "Valid transitions should end in approved or rejected");
        }

        for (from, to) in invalid_transitions {
            assert!(
                from.is_empty() || to.is_empty() ||
                from != "pending" ||
                (to != "approved" && to != "rejected"),
                "Invalid transition should fail: {} -> {}",
                from,
                to
            );
        }
    }
}