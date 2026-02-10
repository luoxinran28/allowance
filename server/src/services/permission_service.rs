// server/src/services/permission_service.rs
// 统一的权限检查服务 - 仅基于 Tier 进行权限判断

use crate::models::user::UserTier;

/// 权限检查上下文
#[derive(Debug, Clone)]
pub struct PermissionContext {
    pub user_id: i64,
    pub user_tier: UserTier,
    pub user_org_id: Option<i64>,
    pub user_team_ids: Vec<i64>,
    pub target_org_id: Option<i64>,
    pub target_team_id: Option<i64>,
}

impl PermissionContext {
    pub fn new(
        user_id: i64,
        user_tier: UserTier,
        user_org_id: Option<i64>,
        user_team_ids: Vec<i64>,
    ) -> Self {
        PermissionContext {
            user_id,
            user_tier,
            user_org_id,
            user_team_ids,
            target_org_id: None,
            target_team_id: None,
        }
    }

    pub fn with_target_org(mut self, org_id: i64) -> Self {
        self.target_org_id = Some(org_id);
        self
    }

    pub fn with_target_team(mut self, team_id: i64) -> Self {
        self.target_team_id = Some(team_id);
        self
    }
}

pub struct PermissionService;

impl PermissionService {
    // ============ Sidebar 可见性检查 ============

    /// 检查用户是否能访问 Admin Section
    pub fn can_access_admin_section(tier: &UserTier) -> bool {
        matches!(tier, UserTier::Allstar)
    }

    /// 检查用户是否能访问 Organization & License 菜单
    pub fn can_access_org_license_section(tier: &UserTier) -> bool {
        matches!(tier, UserTier::Premium | UserTier::Allstar)
    }

    /// 检查用户是否能访问 Team Management 菜单
    pub fn can_access_team_management(tier: &UserTier) -> bool {
        matches!(
            tier,
            UserTier::Standard | UserTier::Premium | UserTier::Allstar
        )
    }

    // ============ 资源级权限检查 ============

    /// 检查用户是否能创建团队（仅 Org Boss + Admin）
    pub fn can_create_team(ctx: &PermissionContext) -> bool {
        matches!(ctx.user_tier, UserTier::Premium | UserTier::Allstar)
    }

    /// 检查用户是否能删除团队
    pub fn can_delete_team(ctx: &PermissionContext) -> bool {
        matches!(ctx.user_tier, UserTier::Premium | UserTier::Allstar)
    }

    /// 检查用户是否能添加团队成员
    pub fn can_add_team_member(ctx: &PermissionContext) -> bool {
        match &ctx.user_tier {
            UserTier::Allstar => true,
            UserTier::Premium => {
                // Org Boss 只能在自己的组织内添加
                ctx.target_org_id == ctx.user_org_id
            }
            UserTier::Standard => {
                // Team Leader 只能在自己的团队内添加
                if let Some(target_team_id) = ctx.target_team_id {
                    ctx.user_team_ids.contains(&target_team_id)
                } else {
                    false
                }
            }
            UserTier::Free => false,
        }
    }

    /// 检查用户是否能移除团队成员
    pub fn can_remove_team_member(ctx: &PermissionContext) -> bool {
        Self::can_add_team_member(ctx)
    }

    /// 检查用户是否能查看用户列表
    pub fn can_view_users(tier: &UserTier) -> bool {
        matches!(
            tier,
            UserTier::Standard | UserTier::Premium | UserTier::Allstar
        )
    }

    /// 检查用户是否能修改用户 Tier（仅 Admin）
    pub fn can_change_user_tier(tier: &UserTier) -> bool {
        matches!(tier, UserTier::Allstar)
    }

    /// 检查用户是否能查看组织信息
    pub fn can_view_organization(ctx: &PermissionContext) -> bool {
        match &ctx.user_tier {
            UserTier::Allstar => true,
            UserTier::Premium => {
                // Org Boss 只看自己的组织
                ctx.target_org_id == ctx.user_org_id
            }
            _ => false,
        }
    }

    /// 检查用户是否能管理组织配置
    pub fn can_manage_organization(ctx: &PermissionContext) -> bool {
        match &ctx.user_tier {
            UserTier::Allstar => true,
            UserTier::Premium => {
                // Org Boss 只能管理自己的组织
                ctx.target_org_id == ctx.user_org_id
            }
            _ => false,
        }
    }

    /// 检查用户是否能查看许可证池
    pub fn can_view_license_pool(ctx: &PermissionContext) -> bool {
        match &ctx.user_tier {
            UserTier::Allstar => true,
            UserTier::Premium => {
                // Org Boss 只看自己组织的许可证
                ctx.target_org_id == ctx.user_org_id
            }
            _ => false,
        }
    }

    /// 检查用户是否能修改团队配额
    pub fn can_modify_team_quota(ctx: &PermissionContext) -> bool {
        match &ctx.user_tier {
            UserTier::Allstar => true,
            UserTier::Premium => {
                // Org Boss 只能修改自己组织内的配额
                ctx.target_org_id == ctx.user_org_id
            }
            _ => false,
        }
    }

    /// 检查用户是否能创建产品（仅 Admin）
    pub fn can_create_product(tier: &UserTier) -> bool {
        matches!(tier, UserTier::Allstar)
    }

    /// 检查用户是否能查看所有产品（仅 Admin）
    pub fn can_view_products(tier: &UserTier) -> bool {
        matches!(tier, UserTier::Allstar)
    }

    /// 检查用户是否能分配 Org Boss（仅 Admin）
    pub fn can_assign_org_boss(tier: &UserTier) -> bool {
        matches!(tier, UserTier::Allstar)
    }

    /// 检查用户是否能查看产品信息（所有用户）
    pub fn can_read_product(ctx: &PermissionContext) -> bool {
        // All tiers can read product info
        true
    }

    /// 检查用户是否能管理所有用户（仅 Admin）
    pub fn can_manage_all_users(ctx: &PermissionContext) -> bool {
        matches!(ctx.user_tier, UserTier::Allstar)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn admin_ctx() -> PermissionContext {
        PermissionContext::new(1, UserTier::Allstar, Some(1), vec![1, 2])
    }

    fn org_boss_ctx() -> PermissionContext {
        PermissionContext::new(2, UserTier::Premium, Some(1), vec![1])
    }

    fn team_leader_ctx() -> PermissionContext {
        PermissionContext::new(3, UserTier::Standard, Some(1), vec![1])
    }

    fn free_user_ctx() -> PermissionContext {
        PermissionContext::new(4, UserTier::Free, None, vec![])
    }

    #[test]
    fn test_admin_can_access_everything() {
        let ctx = admin_ctx();
        assert!(PermissionService::can_access_admin_section(&ctx.user_tier));
        assert!(PermissionService::can_access_org_license_section(&ctx.user_tier));
        assert!(PermissionService::can_access_team_management(&ctx.user_tier));
        assert!(PermissionService::can_create_team(&ctx));
    }

    #[test]
    fn test_org_boss_cannot_access_admin() {
        let ctx = org_boss_ctx();
        assert!(!PermissionService::can_access_admin_section(&ctx.user_tier));
        assert!(PermissionService::can_access_org_license_section(&ctx.user_tier));
    }

    #[test]
    fn test_team_leader_cannot_create_team() {
        let ctx = team_leader_ctx();
        assert!(!PermissionService::can_create_team(&ctx));
        assert!(PermissionService::can_add_team_member(
            &ctx.with_target_team(1)
        ));
    }

    #[test]
    fn test_free_user_no_permissions() {
        let ctx = free_user_ctx();
        assert!(!PermissionService::can_access_admin_section(&ctx.user_tier));
        assert!(!PermissionService::can_access_team_management(&ctx.user_tier));
    }

    #[test]
    fn test_org_boss_cross_org_cannot_manage() {
        let mut ctx = org_boss_ctx();
        ctx.target_org_id = Some(2);
        assert!(!PermissionService::can_manage_organization(&ctx));
    }

    #[test]
    fn test_team_leader_own_team_can_add_member() {
        let ctx = team_leader_ctx().with_target_team(1);
        assert!(PermissionService::can_add_team_member(&ctx));
    }

    #[test]
    fn test_team_leader_other_team_cannot_add_member() {
        let ctx = team_leader_ctx().with_target_team(999);
        assert!(!PermissionService::can_add_team_member(&ctx));
    }
}
