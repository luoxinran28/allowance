# 四层权限系统 - 技术实施

**状态**: ✅ 已完成  
**创建日期**: 2025-12-05  
**最后更新**: 2026-03-06

---

## 架构概要

### 两个独立维度

- **数据域**：organization_id（主组织）+ team_ids（团队列表）
- **权限域**：tier（free/standard/premium/allstar）

### Tier 唯一性原则

- 权限检查仅依赖 tier（`can_access_admin`, `can_manage_team` 等）
- Role 不存储在数据库，前端根据 Tier 和 Team 归属实时推导显示

## 实现清单

### 后端 (Rust/Axum)
- **Models**: `server/src/models/user.rs`（UserTier enum, organization_id, team_ids）
- **Tier 推导**: `server/src/utils/tier_helper.rs`
- **权限服务**: `server/src/services/permission_service.rs`

### 前端 (Next.js/TypeScript)
- **Types**: `client/lib/types.ts`（User interface 含 tier）
- **Tier 推导**: `client/lib/tier-helper.ts`
- **权限 Hook**: `client/lib/hooks/usePermission.ts`
- **路由保护**: layout.tsx（admin→allstar, org-license→premium+, team-management→standard+）

## Tier 自动流转

1. 分配团队 → free → standard
2. 指定 Boss → → premium
3. 从所有团队移除 → → free
4. 移除 Boss → → standard（保留 organization_id）
5. 许可证过期 → → free（保留 org/team 关联）
