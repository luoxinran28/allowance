# 四层角色权限系统 - 完整实施方案

**文档版本**: v1.2  
**创建日期**: 2025-12-05  
**最后更新**: 2026-01-24  
**状态**: ✅ 已完成 (技术细节已归档，仅保留架构摘要)

---

## 📋 实施状态摘要

**所有核心组件已上线**：

1.  **数据模型**: `User` 模型已更新，包含 `tier` (free/standard/premium/allstar), `organization_id`, `team_ids`。
2.  **Tier 推导**: 后端 `derive_tier` 和前端 `deriveTier` 逻辑一致。`Role` 字段已废弃，仅在前端动态推导用于显示。
3.  **权限检查**: 基于 Tier 的统一鉴权。
    *   后端: `PermissionService` 提供细粒度的权限校验。
    *   前端: `usePermission` Hook 提供响应式的权限判断。
    *   路由: `useRouteProtection` 中间件保护页面访问。

---

## 📌 核心架构

### 1. 两个独立维度

```
用户状态 = 数据域 + 权限域

数据域（Organizational Structure）
├─ organization_id: 用户的主组织
└─ team_ids: 用户所属的团队列表

权限域（Authorization Tier）
└─ tier: 用户的功能权限等级 (free/standard/premium/allstar)
```

### 2. Tier 唯一性原则

*   **权限来源**: 所有的权限检查 (`can_access_admin`, `can_manage_team` 等) 仅依赖 `tier`。
*   **Role 仅作展示**: `admin`, `org_boss`, `team_leader` 等角色名称不再存储在数据库，仅由前端根据 Tier 和 Team 归属实时推导。

---

## 🗄️ 关键实现清单

### 后端 (Rust/Axum)

*   **Models**: `server/src/models/user.rs` (UserTier enum, organization_id, team_ids)
*   **Logic**: `server/src/utils/tier_helper.rs` (推导逻辑)
*   **Service**: `server/src/services/permission_service.rs` (鉴权服务)
*   **Middleware**: 移除旧的 RBAC 中间件，采用 Tier Check。

### 前端 (Next.js/TypeScript)

*   **Types**: `client/lib/types.ts` (User Interface 包含 tier)
*   **Logic**: `client/lib/tier-helper.ts` (前端推导)
*   **Hook**: `client/lib/hooks/usePermission.ts` (核心权限 Hook)
*   **Layouts**: 
    *   `client/app/admin/layout.tsx` (Allstar 保护)
    *   `client/app/org-license/layout.tsx` (Premium+ 保护)
    *   `client/app/team-management/layout.tsx` (Standard+ 保护)

---

## 🔄 Tier 自动流转规则

系统会在以下事件发生时自动更新用户的 Tier：

1.  **分配团队**: 免费用户被加入团队 -> `Standard`。
2.  **指定 Boss**: 用户被设置为 Org Boss -> `Premium`。
3.  **移除团队**: 用户被移出所有团队 -> `Free`。
4.  **许可证过期**: 组织许可证过期 -> 所有成员降级为 `Free` (保留 Org/Team 关联)。

---

*(历史代码块已移除，请查阅 Git 历史或相关源代码文件)*
