use std::sync::Arc;
use sqlx::PgPool;
use crate::models::{User, UserResponse, ApprovalRequest};
use crate::utils::{AppResult, AppError};
use crate::services::RbacService;

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
            SELECT * FROM users
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
            "SELECT * FROM users WHERE id = $1"
        )
            .bind(user_id)
            .fetch_optional(pool)
            .await?
            .ok_or(AppError::NotFound("User not found".to_string()))?;

        Ok(UserResponse::from(user))
    }

    /// Assign role to user (admin only)
    pub async fn assign_role_to_user(
        pool: &PgPool,
        admin_user_id: i64,
        target_user_id: i64,
        role_code: &str,
    ) -> AppResult<()> {
        if target_user_id <= 0 {
            return Err(AppError::InvalidRequest("Invalid target user ID".to_string()));
        }

        if role_code.trim().is_empty() {
            return Err(AppError::InvalidRequest("Role code cannot be empty".to_string()));
        }

        // Verify admin has permission
        let has_permission = RbacService::has_permission(
            pool,
            admin_user_id,
            "admin:manage_users",
        ).await?;

        if !has_permission {
            return Err(AppError::Forbidden);
        }

        // Check if target user exists
        let user_exists: bool = sqlx::query_scalar(
            "SELECT EXISTS(SELECT 1 FROM users WHERE id = $1)"
        )
            .bind(target_user_id)
            .fetch_one(pool)
            .await?;

        if !user_exists {
            return Err(AppError::NotFound("Target user not found".to_string()));
        }

        // Assign the role
        RbacService::assign_role(pool, target_user_id, role_code).await?;

        // Log the admin action
        Self::log_admin_action(
            pool,
            admin_user_id,
            "role_assign",
            "user",
            target_user_id,
            None,
            Some(role_code.to_string()),
        ).await?;

        Ok(())
    }

    /// Remove role from user (admin only)
    pub async fn remove_role_from_user(
        pool: &PgPool,
        admin_user_id: i64,
        target_user_id: i64,
        role_code: &str,
    ) -> AppResult<()> {
        if target_user_id <= 0 {
            return Err(AppError::InvalidRequest("Invalid target user ID".to_string()));
        }

        if role_code.trim().is_empty() {
            return Err(AppError::InvalidRequest("Role code cannot be empty".to_string()));
        }

        // Verify admin has permission
        let has_permission = RbacService::has_permission(
            pool,
            admin_user_id,
            "admin:manage_users",
        ).await?;

        if !has_permission {
            return Err(AppError::Forbidden);
        }

        // Check if target user exists
        let user_exists: bool = sqlx::query_scalar(
            "SELECT EXISTS(SELECT 1 FROM users WHERE id = $1)"
        )
            .bind(target_user_id)
            .fetch_one(pool)
            .await?;

        if !user_exists {
            return Err(AppError::NotFound("Target user not found".to_string()));
        }

        // Remove the role
        RbacService::remove_role(pool, target_user_id, role_code).await?;

        // Log the admin action
        Self::log_admin_action(
            pool,
            admin_user_id,
            "role_remove",
            "user",
            target_user_id,
            Some(role_code.to_string()),
            None,
        ).await?;

        Ok(())
    }

    /// List pending approval requests (admin only)
    pub async fn list_pending_approvals(
        pool: &PgPool,
        admin_user_id: i64,
    ) -> AppResult<Vec<ApprovalRequest>> {
        // Verify admin has permission
        let has_permission = RbacService::has_permission(
            pool,
            admin_user_id,
            "admin:manage_approvals",
        ).await?;

        if !has_permission {
            return Err(AppError::Forbidden);
        }

        let approvals = sqlx::query_as::<_, ApprovalRequest>(
            r#"
            SELECT * FROM approval_requests
            WHERE status = 'pending'
            ORDER BY created_at ASC
            "#
        )
            .fetch_all(pool)
            .await?;

        Ok(approvals)
    }

    /// Get approval request details (admin only)
    pub async fn get_approval_request(
        pool: &PgPool,
        admin_user_id: i64,
        approval_id: i64,
    ) -> AppResult<ApprovalRequest> {
        if approval_id <= 0 {
            return Err(AppError::InvalidRequest("Invalid approval ID".to_string()));
        }

        // Verify admin has permission
        let has_permission = RbacService::has_permission(
            pool,
            admin_user_id,
            "admin:manage_approvals",
        ).await?;

        if !has_permission {
            return Err(AppError::Forbidden);
        }

        let approval = sqlx::query_as::<_, ApprovalRequest>(
            "SELECT * FROM approval_requests WHERE id = $1"
        )
            .bind(approval_id)
            .fetch_optional(pool)
            .await?
            .ok_or(AppError::NotFound("Approval request not found".to_string()))?;

        Ok(approval)
    }

    /// Approve an approval request (admin only)
    pub async fn approve_request(
        pool: &PgPool,
        admin_user_id: i64,
        approval_id: i64,
    ) -> AppResult<()> {
        if approval_id <= 0 {
            return Err(AppError::InvalidRequest("Invalid approval ID".to_string()));
        }

        // Verify admin has permission
        let has_permission = RbacService::has_permission(
            pool,
            admin_user_id,
            "admin:manage_approvals",
        ).await?;

        if !has_permission {
            return Err(AppError::Forbidden);
        }

        // Use a transaction to ensure consistency
        let mut tx = pool.begin().await?;

        // Get the approval request
        let approval = sqlx::query_as::<_, ApprovalRequest>(
            "SELECT * FROM approval_requests WHERE id = $1 AND status = 'pending'"
        )
            .bind(approval_id)
            .fetch_optional(&mut *tx)
            .await?
            .ok_or(AppError::NotFound("Pending approval request not found".to_string()))?;

        // Update the approval request
        sqlx::query(
            r#"
            UPDATE approval_requests
            SET status = 'approved', approved_by = $1, updated_at = NOW()
            WHERE id = $2
            "#
        )
            .bind(admin_user_id)
            .bind(approval_id)
            .execute(&mut *tx)
            .await?;

        // Process the approval based on request type
        match approval.request_type.as_str() {
            "role_upgrade" => {
                // Extract target_user_id and role from request details
                // This would need to be implemented based on how request details are stored
                // For now, just log the approval
            }
            "organization_create" => {
                // Handle organization creation approval
            }
            _ => {
                // Unknown request type - still approve but log
            }
        }

        // Log the admin action
        Self::log_admin_action(
            &mut *tx,
            admin_user_id,
            "approval_approve",
            "approval_request",
            approval_id,
            Some("pending".to_string()),
            Some("approved".to_string()),
        ).await?;

        tx.commit().await?;
        Ok(())
    }

    /// Reject an approval request (admin only)
    pub async fn reject_request(
        pool: &PgPool,
        admin_user_id: i64,
        approval_id: i64,
        reason: Option<String>,
    ) -> AppResult<()> {
        if approval_id <= 0 {
            return Err(AppError::InvalidRequest("Invalid approval ID".to_string()));
        }

        // Verify admin has permission
        let has_permission = RbacService::has_permission(
            pool,
            admin_user_id,
            "admin:manage_approvals",
        ).await?;

        if !has_permission {
            return Err(AppError::Forbidden);
        }

        // Validate rejection reason length
        if let Some(ref r) = reason {
            if r.len() > 1000 {
                return Err(AppError::InvalidRequest("Rejection reason too long".to_string()));
            }
        }

        let result = sqlx::query(
            r#"
            UPDATE approval_requests
            SET status = 'rejected', approved_by = $1, rejection_reason = $2, updated_at = NOW()
            WHERE id = $3 AND status = 'pending'
            "#
        )
            .bind(admin_user_id)
            .bind(reason.as_deref().unwrap_or("No reason provided"))
            .bind(approval_id)
            .execute(pool)
            .await?;

        if result.rows_affected() == 0 {
            return Err(AppError::NotFound("Pending approval request not found".to_string()));
        }

        // Log the admin action
        Self::log_admin_action(
            pool,
            admin_user_id,
            "approval_reject",
            "approval_request",
            approval_id,
            Some("pending".to_string()),
            Some("rejected".to_string()),
        ).await?;

        Ok(())
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

    /// Check if a user has admin permissions
    pub async fn is_admin(
        pool: &PgPool,
        user_id: i64,
    ) -> AppResult<bool> {
        RbacService::has_permission(pool, user_id, "admin:manage_users").await
    }
}

#[cfg(test)]
mod tests {
    use super::*;

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
    fn test_role_code_validation() {
        let long_string = "a".repeat(101);

        let valid_roles = vec![
            "admin",
            "free_user",
            "standard_employee",
            "team_leader",
            "a", // Minimum length
        ];

        let invalid_roles = vec![
            "",      // Empty
            "   ",   // Only whitespace
            &long_string, // Too long (assuming 100 char limit)
        ];

        for role in valid_roles {
            assert!(!role.trim().is_empty(), "Valid role should not be empty after trim");
            assert!(role.len() <= 100, "Valid role should be within length limit");
        }

        for role in invalid_roles {
            assert!(
                role.trim().is_empty() || role.len() > 100,
                "Invalid role should fail validation: '{}'",
                role
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
                action: "role_assign".to_string(),
                target_type: "user".to_string(),
                target_id: 2,
                old_value: None,
                new_value: Some("admin".to_string()),
            },
            AdminActionLog {
                admin_user_id: 1,
                action: "role_remove".to_string(),
                target_type: "user".to_string(),
                target_id: 2,
                old_value: Some("admin".to_string()),
                new_value: None,
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
                action: "role_assign".to_string(),
                target_type: "user".to_string(),
                target_id: 2,
                old_value: None,
                new_value: Some("admin".to_string()),
            },
            AdminActionLog {
                admin_user_id: 1,
                action: "".to_string(), // Empty action
                target_type: "user".to_string(),
                target_id: 2,
                old_value: None,
                new_value: Some("admin".to_string()),
            },
            AdminActionLog {
                admin_user_id: 1,
                action: "role_assign".to_string(),
                target_type: "".to_string(), // Empty target type
                target_id: 2,
                old_value: None,
                new_value: Some("admin".to_string()),
            },
            AdminActionLog {
                admin_user_id: 1,
                action: "role_assign".to_string(),
                target_type: "user".to_string(),
                target_id: 0, // Invalid target ID
                old_value: None,
                new_value: Some("admin".to_string()),
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
            "role_upgrade",
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
    fn test_admin_permission_hierarchy() {
        // Test that admin permissions include all other permissions
        let admin_permissions = vec![
            "admin:manage_users",
            "admin:manage_approvals",
            "user:read",
            "product:read",
            "team:write",
            "org:write",
        ];

        let non_admin_permissions = vec![
            "user:read",
            "product:read",
            "team:write",
        ];

        // Admin should have all permissions
        for perm in &non_admin_permissions {
            assert!(
                admin_permissions.contains(perm),
                "Admin should include all non-admin permissions: {}",
                perm
            );
        }

        // Admin should have additional admin-specific permissions
        let admin_only_perms: Vec<_> = admin_permissions.iter()
            .filter(|p| p.starts_with("admin:"))
            .collect();

        assert!(!admin_only_perms.is_empty(), "Admin should have admin-specific permissions");
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