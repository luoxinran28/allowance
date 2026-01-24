# 前端路由重构与规范

**文档版本**: v1.2  
**创建日期**: 2025-12-18  
**最后更新**: 2026-01-24  
**状态**: ✅ 已完成 (技术细节已归档)

---

## 📋 实施状态

前端路由已根据四层权限模型和最新的 License 页面优化方案完成重构。

---

## 🗺️ 最终路由表 (Updated 2026-01-24)

### 1. 公共区域
*   `/auth/login`
*   `/auth/register`
*   `/dashboard/profile` (原 `/dashboard/profile`，现通常作为登陆后首页)

### 2. Organization & License (Premium+)
*   `/org-license`: 组织许可证管理中心 (Tabs: Products, Assign)

### 3. Team Management (Standard+)
*   `/team-management/quotas`: 团队配额管理
*   `/team-management/members`: 团队成员管理

### 4. Admin Section (Allstar Only)
*   `/admin/dashboard`: 系统概览
*   `/admin/products`: 产品管理
*   `/admin/organizations`: 组织管理
*   `/admin/users`: 全局用户管理
*   `/admin/licenses`: 系统许可证管理中心 (Tabs: Assign to Org, Revoke, Export)

---

## 🛡️ 路由保护机制

路由保护通过 `client/lib/middleware/routeProtection.ts` 实现。

*   **Public**: `/auth/*`
*   **Protected**: 所有其他 `/dashboard`, `/admin`, `/org-license`, `/team-management` 路由。
*   **Tier Checks**:
    *   `/admin/*` -> Requires `admin` (Allstar)
    *   `/org-license/*` -> Requires `org_boss` (Premium) or `admin`
    *   `/team-management/*` -> Requires `team_leader` (Standard) or higher

---

*(历史代码块已移除，请查阅 Git 历史或相关源代码文件)*
