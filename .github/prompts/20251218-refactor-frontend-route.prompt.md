# 前端路由结构彻底重构方案

**文档版本**: v1.1  
**创建日期**: 2025-12-18  
**状态**: ✅ 已完成  
**最后更新**: 2026-01-21  
**核心问题**: 路由结构与权限体系不对齐，造成页面混乱  
**前置条件**: 已完成 `20251205-refactor-four-tier.prompt.md` 的 STEP 1-4

---

## 📋 实施状态摘要

| 迁移项 | 新位置 | 状态 |
|--------|--------|------|
| Profile | `/user/profile` | ✅ 已完成 |
| Billing | `/user/billing` | ✅ 已完成 |
| Org License Products | `/org-license/products` | ✅ 已完成 |
| Org License Assign | `/org-license/assign` | ✅ 已完成 |
| Team Quotas | `/team-management/quotas` | ✅ 已完成 |
| Team Members | `/team-management/members` | ✅ 已完成 |
| Admin Dashboard | `/admin/dashboard` | ✅ 已完成 |
| Admin Users | `/admin/users` | ✅ 已完成 |
| Admin Products | `/admin/products` | ✅ 已完成 |
| Admin Organizations | `/admin/organizations` | ✅ 已完成 |
| Admin Teams | `/admin/teams` | ✅ 已完成 |
| Batch Operations | `/admin/batch/*` | ✅ 已完成 |

**Layout 权限检查**：
- `app/user/layout.tsx` - 所有认证用户
- `app/org-license/layout.tsx` - premium/allstar
- `app/team-management/layout.tsx` - standard/premium/allstar  
- `app/admin/layout.tsx` - allstar only

---

## 📌 核心问题分析

### 问题 1：路由与权限体系不对齐

**当前情况**：
- `client/app/dashboard/` 是一个"大杂烩"，混杂了所有权限级别的功能
- Admin 功能被放在 `/dashboard/admin/*` 下，而不是 `/admin/*`
- 导致路由层级与 Sidebar 菜单结构完全不匹配

**影响**：
- 新加功能容易放错位置
- 权限检查分散在各个页面，容易遗漏
- 路由保护逻辑复杂，难以维护

### 问题 2：文件和页面重复

| 功能 | 当前位置 | 应该位置 | 状态 |
|------|---------|---------|------|
| Profile | `/dashboard/profile` | `/user/profile` | ❌ 错位 |
| Billing | `/dashboard/billing` | `/user/billing` | ❌ 错位 |
| Organization License | `/dashboard/org-license/*` | `/org-license/*` | ❌ 错位 |
| Team Management | `/dashboard/team-management/*` | `/team-management/*` | ❌ 错位 |
| Admin Dashboard | `/dashboard/admin/dashboard` | `/admin/dashboard` | ❌ 错位 |
| User Management | `/dashboard/users` | `/admin/users` | ❌ 错位 |
| Org Management | `/dashboard/organizations` | `/admin/organizations` | ❌ 错位 |
| Product Management | `/dashboard/products` | `/admin/products` | ❌ 错位 |
| Batch Operations | `/dashboard/batch/*` | `/admin/batch/*` | ❌ 错位 |

---

## 🎯 目标架构

### 新的路由结构（与 Sidebar 菜单完全对齐）

```
/
├─ auth/                          # 公开路由（未认证用户）
│  ├─ login
│  ├─ register
│  ├─ activate/[token]
│  └─ reset-password
│
├─ user/                          # 用户个人中心（free+，所有用户）
│  ├─ layout.tsx                 # ✅ 权限检查：free+
│  ├─ page.tsx                   # 重定向到 /user/profile
│  ├─ profile/
│  │  └─ page.tsx                # /user/profile
│  └─ billing/
│     └─ page.tsx                # /user/billing
│
├─ org-license/                   # 组织和许可证管理（premium+）
│  ├─ layout.tsx                 # ✅ 权限检查：premium+
│  ├─ page.tsx                   # 重定向到 /org-license/products
│  ├─ products/
│  │  └─ page.tsx                # /org-license/products
│  └─ assign/
│     └─ page.tsx                # /org-license/assign
│
├─ team-management/               # 团队管理（standard+）
│  ├─ layout.tsx                 # ✅ 权限检查：standard+
│  ├─ page.tsx                   # 重定向到 /team-management/quotas
│  ├─ quotas/
│  │  └─ page.tsx                # /team-management/quotas
│  └─ members/
│     └─ page.tsx                # /team-management/members
│
├─ admin/                         # 管理员区域（allstar only）
│  ├─ layout.tsx                 # ✅ 权限检查：allstar only
│  ├─ page.tsx                   # 重定向到 /admin/dashboard
│  ├─ dashboard/
│  │  └─ page.tsx                # /admin/dashboard
│  ├─ products/
│  │  └─ page.tsx                # /admin/products
│  ├─ organizations/
│  │  └─ page.tsx                # /admin/organizations
│  ├─ users/
│  │  └─ page.tsx                # /admin/users
│  ├─ teams/
│  │  └─ page.tsx                # /admin/teams
│  └─ batch/
│      ├─ layout.tsx             # ✅ 权限检查：allstar only
│      ├─ generate/
│      │  └─ page.tsx            # /admin/batch/generate
│      ├─ revoke/
│      │  └─ page.tsx            # /admin/batch/revoke
│      └─ export/
│         └─ page.tsx            # /admin/batch/export
│
├─ dashboard/                     # 旧路由入口（保留向后兼容）
│  ├─ page.tsx                   # 重定向到 /user/profile
│  └─ layout.tsx                 # 保留过渡性支持
│
└─ error/                         # 错误页面
   ├─ permission-denied/
   │  └─ page.tsx
   └─ not-found/
      └─ page.tsx
```

### Layout 层级权限检查

```
📋 app/layout.tsx
   └─ 全局认证检查 + 顶级布局
   
   📋 app/auth/layout.tsx
      └─ Auth 专用布局（隐藏 Sidebar，无权限检查）
   
   📋 app/user/layout.tsx
      └─ ✅ 权限检查：tier === 'free' || 'standard' || 'premium' || 'allstar'
      └─ 显示：Main Navigation 部分菜单
   
   📋 app/org-license/layout.tsx
      └─ ✅ 权限检查：tier === 'premium' || 'allstar'
      └─ 显示：Organization & License 部分菜单
   
   📋 app/team-management/layout.tsx
      └─ ✅ 权限检查：tier === 'standard' || 'premium' || 'allstar'
      └─ 显示：Team Management 部分菜单
   
   📋 app/admin/layout.tsx
      └─ ✅ 权限检查：tier === 'allstar'（严格）
      └─ 显示：完整 Administration 部分菜单
      
      📋 app/admin/batch/layout.tsx
         └─ ✅ 权限检查：tier === 'allstar'（双重检查）
         └─ 显示：Batch Operations 部分菜单
```

---

## 📊 迁移映射表

### 文件迁移清单

| 来源 | 目标 | 操作 | 备注 |
|------|------|------|------|
| `/dashboard/profile/page.tsx` | `/user/profile/page.tsx` | 移动 | ✅ 修改导入路径 |
| `/dashboard/billing/page.tsx` | `/user/billing/page.tsx` | 移动 | ✅ 修改导入路径 |
| `/dashboard/org-license/products/page.tsx` | `/org-license/products/page.tsx` | 移动 | ✅ 修改导入路径 |
| `/dashboard/org-license/assign/page.tsx` | `/org-license/assign/page.tsx` | 移动 | ✅ 修改导入路径 |
| `/dashboard/team-management/quotas/page.tsx` | `/team-management/quotas/page.tsx` | 移动 | ✅ 修改导入路径 |
| `/dashboard/team-management/members/page.tsx` | `/team-management/members/page.tsx` | 移动 | ✅ 修改导入路径 |
| `/dashboard/admin/dashboard/page.tsx` | `/admin/dashboard/page.tsx` | 移动 | ✅ 修改导入路径 |
| `/dashboard/products/page.tsx` | `/admin/products/page.tsx` | 移动 | ✅ 修改导入路径 |
| `/dashboard/organizations/page.tsx` | `/admin/organizations/page.tsx` | 移动 | ✅ 修改导入路径 |
| `/dashboard/users/page.tsx` | `/admin/users/page.tsx` | 移动 | ✅ 修改导入路径 |
| `/dashboard/teams/page.tsx` | `/admin/teams/page.tsx` | 移动 | ✅ 修改导入路径 |
| `/dashboard/batch/generate/page.tsx` | `/admin/batch/generate/page.tsx` | 移动 | ✅ 修改导入路径 |
| `/dashboard/batch/revoke/page.tsx` | `/admin/batch/revoke/page.tsx` | 移动 | ✅ 修改导入路径 |
| `/dashboard/batch/export/page.tsx` | `/admin/batch/export/page.tsx` | 移动 | ✅ 修改导入路径 |
| 无 | `/user/layout.tsx` | 新建 | ✅ 添加权限检查 |
| 无 | `/user/page.tsx` | 新建 | ✅ 重定向到 /user/profile |
| 无 | `/org-license/layout.tsx` | 新建 | ✅ 添加权限检查 |
| 无 | `/org-license/page.tsx` | 新建 | ✅ 重定向到 /org-license/products |
| 无 | `/team-management/layout.tsx` | 新建 | ✅ 添加权限检查 |
| 无 | `/team-management/page.tsx` | 新建 | ✅ 重定向到 /team-management/quotas |
| `/dashboard/layout.tsx` | `/dashboard/layout.tsx` | 修改 | ✅ 简化为过渡/重定向逻辑 |
| `/dashboard/admin/layout.tsx` | `/admin/layout.tsx` | 移动/新建 | ✅ 添加权限检查 |
| 无 | `/admin/page.tsx` | 新建 | ✅ 重定向到 /admin/dashboard |
| 无 | `/admin/batch/layout.tsx` | 新建 | ✅ 添加权限检查（双重） |

### 旧路由向后兼容（可选）

为了避免破坏书签和外部链接，可以添加以下重定向：

```typescript
// client/app/dashboard/page.tsx
import { redirect } from 'next/navigation';

export default function DashboardRedirect() {
  redirect('/user/profile');
}

// client/app/dashboard/profile/page.tsx
import { redirect } from 'next/navigation';
export default function ProfileRedirect() {
  redirect('/user/profile');
}

// 类似处理其他旧路由...
```

---

## 🔐 Layout 权限检查模板

### 用户中心 Layout 模板

```typescript
// client/app/user/layout.tsx
'use client';

import { useAuthStore } from '@/lib/auth-store';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push('/auth/login');
      return;
    }

    // 所有已认证用户都可以访问用户中心（free+）
    // 无需额外权限检查
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated || !user) {
    return <div>Redirecting...</div>;
  }

  return (
    <div className="layout-container">
      <Sidebar isOpen={true} />
      <main className="main-content">{children}</main>
    </div>
  );
}
```

### 组织许可证 Layout 模板

```typescript
// client/app/org-license/layout.tsx
'use client';

import { useAuthStore } from '@/lib/auth-store';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';

export default function OrgLicenseLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push('/auth/login');
      return;
    }

    // 权限检查：premium+ 用户
    if (user.tier !== 'premium' && user.tier !== 'allstar') {
      router.push('/error/permission-denied');
      return;
    }
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated || !user || (user.tier !== 'premium' && user.tier !== 'allstar')) {
    return <div>Redirecting...</div>;
  }

  return (
    <div className="layout-container">
      <Sidebar isOpen={true} />
      <main className="main-content">{children}</main>
    </div>
  );
}
```

### 管理员 Layout 模板

```typescript
// client/app/admin/layout.tsx
'use client';

import { useAuthStore } from '@/lib/auth-store';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push('/auth/login');
      return;
    }

    // 严格权限检查：仅 allstar 用户
    if (user.tier !== 'allstar') {
      router.push('/error/permission-denied');
      return;
    }
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated || !user || user.tier !== 'allstar') {
    return <div>Redirecting...</div>;
  }

  return (
    <div className="layout-container admin-layout">
      <Sidebar isOpen={true} />
      <main className="main-content admin-content">{children}</main>
    </div>
  );
}
```

---

## 📝 Sidebar 菜单项与路由映射

更新后的 Sidebar 菜单项必须指向新的路由：

```typescript
interface NavItem {
  href: string;  // 新路由
  label: string;
  icon: React.ReactNode;
}

// Main Navigation
const mainNavItems: NavItem[] = [
  { href: '/user/profile', label: 'Profile', icon: <User /> },
  { href: '/user/billing', label: 'Billing', icon: <CreditCard /> },
];

// Organization & License
const orgLicenseItems: NavItem[] = [
  { href: '/org-license/products', label: 'Products & Licenses', icon: <Package /> },
  { href: '/org-license/assign', label: 'Assign Licenses', icon: <Users /> },
];

// Team Management
const teamMgmtItems: NavItem[] = [
  { href: '/team-management/quotas', label: 'Team & Quotas', icon: <LayoutDashboard /> },
  { href: '/team-management/members', label: 'Team Members', icon: <Users /> },
];

// Administration
const adminItems: NavItem[] = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: <BarChart3 /> },
  { href: '/admin/products', label: 'Products', icon: <Package /> },
  { href: '/admin/organizations', label: 'Organizations', icon: <Building /> },
  { href: '/admin/users', label: 'Users', icon: <Users /> },
  { href: '/admin/teams', label: 'Teams', icon: <Users /> },
  { href: '/admin/batch/generate', label: 'Generate Licenses', icon: <Plus /> },
  { href: '/admin/batch/revoke', label: 'Revoke Licenses', icon: <Trash /> },
  { href: '/admin/batch/export', label: 'Export Licenses', icon: <Download /> },
];
```

---

## ✅ 实施检查清单

- [ ] 所有新目录已创建
- [ ] 所有文件已从旧位置迁移到新位置
- [ ] 所有新 Layout 文件已创建并添加权限检查
- [ ] Sidebar 菜单项路由已更新
- [ ] 所有页面的导入路径已更新
- [ ] 旧路由重定向已实现（向后兼容）
- [ ] E2E 测试已更新为新路由
- [ ] E2E 测试全部通过
- [ ] 无 console 错误或警告
- [ ] 权限检查逻辑已验证（各 tier 用户）

---

## 🎯 成功标准

✅ 所有路由与 Sidebar 菜单结构完全对齐  
✅ 权限检查在 Layout 级别统一进行  
✅ 各权限级别的用户只能访问对应的页面  
✅ E2E 测试验证所有新路由和权限检查  
✅ 旧路由重定向正常工作  
✅ 没有 console 错误或警告  

---

**创建日期**: 2025-12-18  
**预计实施周期**: 1-2 天  
**风险等级**: 低（主要是路由迁移，业务逻辑不变）
