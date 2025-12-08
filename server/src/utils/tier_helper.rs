// server/src/utils/tier_helper.rs
// Tier 推导规则与帮助函数

use crate::models::user::UserTier;

/// 根据 organization_id 和 team_ids 推导用户的 Tier
/// 
/// 规则：
/// - 如果是 Admin: allstar
/// - 如果没有 organization_id: free
/// - 如果有 organization_id 但没有 team_ids: free
/// - 如果有 organization_id 和 team_ids: standard
pub fn derive_tier_from_membership(
    organization_id: Option<i64>,
    team_ids: Option<&serde_json::Value>,
    is_admin: bool,
) -> UserTier {
    if is_admin {
        return UserTier::Allstar;
    }

    match (organization_id, team_ids) {
        (None, _) => UserTier::Free,
        (Some(_), None) => UserTier::Free,
        (Some(_), Some(ids)) => {
            // 检查 team_ids 数组是否非空
            if let Some(arr) = ids.as_array() {
                if arr.is_empty() {
                    UserTier::Free
                } else {
                    UserTier::Standard
                }
            } else {
                UserTier::Free
            }
        }
    }
}

/// 判断用户是否是特定 Tier
pub fn is_tier(tier: &UserTier, target: UserTier) -> bool {
    tier == &target
}

/// 判断用户是否至少是某个 Tier（Tier 有等级关系）
pub fn is_at_least_tier(tier: &UserTier, target: UserTier) -> bool {
    match (tier, target) {
        (UserTier::Allstar, _) => true,
        (UserTier::Premium, UserTier::Premium | UserTier::Standard | UserTier::Free) => true,
        (UserTier::Standard, UserTier::Standard | UserTier::Free) => true,
        (UserTier::Free, UserTier::Free) => true,
        _ => false,
    }
}

/// 获取 team_ids 数组
pub fn get_team_ids(team_ids: Option<&serde_json::Value>) -> Vec<i64> {
    match team_ids {
        Some(val) => {
            if let Some(arr) = val.as_array() {
                arr.iter()
                    .filter_map(|v| v.as_i64())
                    .collect()
            } else {
                vec![]
            }
        }
        None => vec![],
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_admin_is_allstar() {
        let tier = derive_tier_from_membership(Some(1), Some(&json!([1])), true);
        assert_eq!(tier, UserTier::Allstar);
    }

    #[test]
    fn test_no_org_is_free() {
        let tier = derive_tier_from_membership(None, None, false);
        assert_eq!(tier, UserTier::Free);
    }

    #[test]
    fn test_org_only_is_free() {
        let tier = derive_tier_from_membership(Some(1), None, false);
        assert_eq!(tier, UserTier::Free);
    }

    #[test]
    fn test_org_with_empty_teams_is_free() {
        let tier = derive_tier_from_membership(Some(1), Some(&json!([])), false);
        assert_eq!(tier, UserTier::Free);
    }

    #[test]
    fn test_org_with_teams_is_standard() {
        let tier = derive_tier_from_membership(Some(1), Some(&json!([1, 2])), false);
        assert_eq!(tier, UserTier::Standard);
    }

    #[test]
    fn test_get_team_ids() {
        let ids: Vec<i64> = get_team_ids(Some(&json!([1, 2, 3])));
        assert_eq!(ids, vec![1i64, 2i64, 3i64]);
    }

    #[test]
    fn test_get_team_ids_empty() {
        let ids: Vec<i64> = get_team_ids(Some(&json!([])));
        assert!(ids.is_empty());
    }

    #[test]
    fn test_get_team_ids_none() {
        let ids: Vec<i64> = get_team_ids(None);
        assert!(ids.is_empty());
    }

    #[test]
    fn test_is_at_least_tier() {
        assert!(is_at_least_tier(&UserTier::Allstar, UserTier::Standard));
        assert!(is_at_least_tier(&UserTier::Premium, UserTier::Standard));
        assert!(is_at_least_tier(&UserTier::Standard, UserTier::Standard));
        assert!(!is_at_least_tier(&UserTier::Free, UserTier::Standard));
    }
}
