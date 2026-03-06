# 四层权限系统 - 需求定义

**状态**: ✅ 已完成  
**创建日期**: 2025-12-05  
**最后更新**: 2026-03-06

---

## 四层权限模型

| Tier | 角色 | 权限范围 |
|------|------|---------|
| free | 免费用户 | Profile、Billing |
| standard | 团队成员/领导 | + Team Management |
| premium | 组织老板 (Org Boss) | + Organization & License |
| allstar | 系统管理员 | 全部权限 |

## 核心设计原则

- **两个独立维度**：数据域（organization_id + team_ids）+ 权限域（tier）
- **Tier 唯一性**：所有权限检查仅依赖 tier，不存储 Role
- **Role 仅作展示**：前端根据 tier 实时推导角色名称

## Tier 自动转变规则

| 触发事件 | 转变 |
|---------|------|
| 用户注册 | → free |
| 分配到团队 | free → standard |
| 指定为 Org Boss | → premium（设置 organization_id） |
| 从所有团队移除（非 Boss） | standard → free |
| 移除 Boss | → standard（保留 organization_id） |

## 各角色权限

### System Admin (allstar)
- 全系统最高权限，管理所有组织/团队/用户/产品/许可证
- 可跨组织移动用户

### Org Boss (premium)
- 管理所属组织的团队和成员
- 可创建/删除团队、指定 Team Leader、调整团队配额
- 不能创建产品/组织，不能修改其他 Boss 权限
- 一个用户只能是一个组织的 Boss

### Team Leader (standard)
- 管理所属团队的成员和许可证
- 不能创建团队、删除团队或管理组织级设置
- 可被多个团队指定为 Leader

### Free User (free)
- 仅能查看 Profile 和 Billing
- 注册后 organization_id=null，由 Admin 分配

## 组织与 Boss 管理

- 创建组织：仅创建记录，不自动创建 Default Team
- 添加 Boss：通过 `POST /org/:id/bosses` 单独操作（自动升级 tier=premium）
- 移除 Boss：组织至少保留一个 Boss；移除后 tier 降级为 standard
- 团队创建：Admin 或 Boss 手动创建

## Sidebar 菜单结构

- **Main Navigation**（所有用户）：Profile, Billing
- **Organization & License**（premium+）：Organization Licenses（2 Tab: Products & Quotas / Assign to Members）
- **Team Management**（standard+）：Team & Quotas, Team Members
- **Admin Section**（allstar）：Dashboard, Products, Organizations, Users, Licenses（3 Tab）
- **Help Section**（所有用户）：Support, Documentation

## 配额管理规则

- Admin 和 Boss 都可调整团队配额
- 配额不能低于已使用量（否则拒绝操作）
- 不支持跨团队挪用配额
- 许可证过期后，成员 tier 降级为 free（保留 org/team 关联）
- 用户只能属于一个组织，可属于同组织下多个团队

## 关键实现文件

### 后端 (Rust/Axum)
- **Models**: `server/src/models/user.rs`（UserTier enum, organization_id, team_ids）
- **Tier 推导**: `server/src/utils/tier_helper.rs`
- **权限服务**: `server/src/services/permission_service.rs`

### 前端 (Next.js/TypeScript)
- **Types**: `client/lib/types.ts`（User interface 含 tier）
- **Tier 推导**: `client/lib/tier-helper.ts`
- **权限 Hook**: `client/lib/hooks/usePermission.ts`
- **路由保护**: layout.tsx（admin→allstar, org-license→premium+, team-management→standard+）
