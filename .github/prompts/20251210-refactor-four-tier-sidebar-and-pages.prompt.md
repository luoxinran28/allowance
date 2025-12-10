# 前端页面和 Sidebar 重构计划

**文档版本**: v1.0  
**创建日期**: 2025-12-10  
**状态**: 待实施  
**关键需求来源**: `20251205-four-tier-needs.prompt.md` 行 101-150  
**前置条件**: 完成 `20251205-refactor-four-tier.prompt.md` 的 STEP 1-3  

---

## 📌 核心目标

根据用户四层权限模型（free/standard/premium/allstar），重构前端 Sidebar 导航和相应的页面结构：
- 实现权限级联的菜单显示
- 新增 Profile 页面
- 重组菜单结构为 4 个主要区域
- 创建新的页面和删除旧页面
- 确保权限检查与菜单可见性一致

---

## 🗂️ **Sidebar 重构方案**

### 当前结构（需要改进）
```
Main Navigation
  ├─ Users
  ├─ Teams
  ├─ Organizations
  ├─ Products
  └─ Billing

License Management
  ├─ My Licenses
  └─ Assign Licenses

Batch Operations
  ├─ Generate Licenses
  ├─ Revoke Licenses
  └─ Export Licenses

Admin Section
  ├─ Manage Products
  ├─ Manage Users
  └─ Team Quotas

Help Section
  ├─ Support
  └─ Documentation
```

### 目标结构（新增权限层级）
```
Main Navigation (all users: free/standard/premium/allstar)
  ├─ Profile (新增)
  ├─ Billing
  └─ [隐藏] Teams, Organizations, Products, Users

Organization & License (premium/allstar)
  ├─ Products & Licenses
  └─ Assign Licenses

Team Management (standard/premium/allstar)
  ├─ Team & Quotas
  └─ Team Members

Admin Section (allstar only)
  ├─ Dashboard (概览)
  ├─ Products (产品管理)
  ├─ Organizations (组织管理)
  ├─ Users (用户管理)
  ├─ Generate Licenses (批量生成)
  ├─ Revoke Licenses (批量撤销)
  └─ Export Licenses (批量导出)

Help Section (all users)
  ├─ Support
  └─ Documentation
```

---

## 🎨 **PHASE 1: Sidebar 组件重构**

### 1.1 修改 `client/components/layout/Sidebar.tsx`

**目标**: 
- 实现权限级联菜单显示
- 使用 usePermission hook 判断菜单可见性
- 清晰的菜单分组（nav sections）

**关键变更点**:

```typescript
// 新增菜单项接口
interface NavSection {
  title: string;
  visible: (perms: ReturnType<typeof usePermission>) => boolean;
  items: NavItem[];
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  visible?: (perms: ReturnType<typeof usePermission>) => boolean;
}
```

**新增菜单项权限检查函数**:

```typescript
// usePermission 新增方法
export function usePermission() {
  return {
    // 现有方法...
    
    // Sidebar 可见性检查
    canSeeSidebar: () => true, // 所有用户都能看到 sidebar
    canSeeOrgLicenseSection: () => user?.tier === 'premium' || user?.tier === 'allstar',
    canSeeTeamManagementSection: () => ['standard', 'premium', 'allstar'].includes(user?.tier),
    canSeeAdminSection: () => user?.tier === 'allstar',
    canSeeProfileMenu: () => true, // 所有用户
    canSeeBillingMenu: () => true, // 所有用户
    canSeeUserMenuItem: () => user?.tier === 'allstar', // 仅 admin
    canSeeTeamsMenuItem: () => false, // 隐藏（功能移到 Team Management）
    canSeeOrganizationsMenuItem: () => user?.tier === 'allstar', // 仅 admin
    canSeeProductsMenuItem: () => user?.tier === 'allstar', // 仅 admin
  };
}
```

**Sidebar 实现结构**:

```typescript
export default function Sidebar({ isOpen = true }: { isOpen?: boolean }) {
  const permissions = usePermission();
  const isActive = (href: string) => router.pathname === href;

  // 定义所有菜单项
  const mainNavItems: NavItem[] = [
    { href: '/dashboard/profile', label: 'Profile', icon: <User /> },
    { href: '/dashboard/billing', label: 'Billing', icon: <CreditCard /> },
  ];

  const orgLicenseItems: NavItem[] = [
    { href: '/dashboard/org-license/products', label: 'Products & Licenses', icon: <Package /> },
    { href: '/dashboard/org-license/assign', label: 'Assign Licenses', icon: <Users /> },
  ];

  const teamMgmtItems: NavItem[] = [
    { href: '/dashboard/team-management/quotas', label: 'Team & Quotas', icon: <LayoutDashboard /> },
    { href: '/dashboard/team-management/members', label: 'Team Members', icon: <Users /> },
  ];

  const adminItems: NavItem[] = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: <BarChart3 /> },
    { href: '/admin/products', label: 'Products', icon: <Package /> },
    { href: '/admin/organizations', label: 'Organizations', icon: <Building /> },
    { href: '/admin/users', label: 'Users', icon: <Users /> },
    { href: '/admin/batch/generate', label: 'Generate Licenses', icon: <Plus /> },
    { href: '/admin/batch/revoke', label: 'Revoke Licenses', icon: <Trash /> },
    { href: '/admin/batch/export', label: 'Export Licenses', icon: <Download /> },
  ];

  const helpItems: NavItem[] = [
    { href: 'mailto:support@example.com', label: 'Support', icon: <HelpCircle />, external: true },
    { href: '/docs', label: 'Documentation', icon: <FileText /> },
  ];

  // 定义导航区域（sections）
  const sections: NavSection[] = [
    {
      title: 'Main Menu',
      visible: () => true,
      items: mainNavItems,
    },
    {
      title: 'Organization & License',
      visible: () => permissions.canSeeOrgLicenseSection(),
      items: orgLicenseItems,
    },
    {
      title: 'Team Management',
      visible: () => permissions.canSeeTeamManagementSection(),
      items: teamMgmtItems,
    },
    {
      title: 'Administration',
      visible: () => permissions.canSeeAdminSection(),
      items: adminItems,
    },
    {
      title: 'Resources',
      visible: () => true,
      items: helpItems,
    },
  ];

  // 菜单项渲染组件
  const NavLink = ({ item }: { item: NavItem }) => {
    if (item.visible && !item.visible(permissions)) {
      return null;
    }

    const isExternal = item.external || item.href.startsWith('http') || item.href.startsWith('mailto');

    return isExternal ? (
      <a href={item.href} className="nav-link">
        {item.icon} {item.label}
      </a>
    ) : (
      <Link href={item.href} className={`nav-link ${isActive(item.href) ? 'active' : ''}`}>
        {item.icon} {item.label}
      </Link>
    );
  };

  // 渲染主体
  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      {sections.map((section) => (
        !section.visible(permissions) ? null : (
          <nav key={section.title} className="nav-section">
            <p className="section-title">{section.title}</p>
            <div className="nav-items">
              {section.items.map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
            </div>
          </nav>
        )
      ))}
    </aside>
  );
}
```

---

## 📄 **PHASE 2: 新增页面创建**

### 2.1 新增 Profile 页面

**路由**: `/dashboard/profile`  
**权限**: 所有用户都能访问  
**显示内容**:
- 用户基本信息（UID, Email, Tier）
- 组织信息（Organization name 或 Not Assigned）
- 团队信息（Team list 或 None）
- 许可证信息（License status, Expiration date）
- 注册来源 (source_upid)

**新增文件**: `client/app/dashboard/profile/page.tsx`

```typescript
import { useAuthStore } from '@/lib/auth-store';
import { useRouter } from 'next/router';

export default function ProfilePage() {
  const { user } = useAuthStore();
  const router = useRouter();

  if (!user) {
    return <div>Loading...</div>;
  }

  const getTierLabel = (tier: string) => {
    const tierMap = {
      free: 'Free User',
      standard: 'Standard Employee / Team Leader',
      premium: 'Organization Boss',
      allstar: 'System Administrator',
    };
    return tierMap[tier as keyof typeof tierMap] || tier;
  };

  return (
    <div className="profile-page">
      <h1>My Profile</h1>
      
      <div className="profile-card">
        <div className="field">
          <label>Account (Email)</label>
          <span>{user.email}</span>
        </div>
        
        <div className="field">
          <label>User ID</label>
          <span>{user.uid}</span>
        </div>
        
        <div className="field">
          <label>Product Tier</label>
          <span className={`tier-badge tier-${user.tier}`}>
            {getTierLabel(user.tier)}
          </span>
        </div>
        
        <div className="field">
          <label>License Status</label>
          <span className={`status-badge status-${user.licenseStatus}`}>
            {user.licenseStatus}
          </span>
        </div>
        
        <div className="field">
          <label>Organization</label>
          <span>
            {user.organizationId ? `Organization ID: ${user.organizationId}` : 'Not Assigned'}
          </span>
        </div>
        
        <div className="field">
          <label>Teams</label>
          <span>
            {user.teamIds && user.teamIds.length > 0 
              ? user.teamIds.join(', ') 
              : 'No teams'}
          </span>
        </div>
        
        <div className="field">
          <label>Registration Source Product</label>
          <span>{user.source_upid || 'None'}</span>
        </div>
      </div>
    </div>
  );
}
```

### 2.2 新增 Admin Dashboard 页面

**路由**: `/admin/dashboard`  
**权限**: allstar (系统管理员) 仅  
**显示内容**:
- 系统概览（Products, Organizations, Teams, Users, Licenses 总数）
- 最近活动
- 许可证过期警告

**新增文件**: `client/app/admin/dashboard/page.tsx`

```typescript
import { useApiClient } from '@/lib/hooks/useApiClient';
import { useEffect, useState } from 'react';

export default function AdminDashboard() {
  const api = useApiClient();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        // 加载系统统计信息
        const [products, orgs, teams, users, licenses] = await Promise.all([
          api.getProducts(),
          api.getOrganizations(),
          api.getTeams(),
          api.getUsers(),
          api.getLicenses(),
        ]);

        setStats({
          productsCount: products.length,
          organizationsCount: orgs.length,
          teamsCount: teams.length,
          usersCount: users.length,
          licensesCount: licenses.length,
          expiredLicensesCount: licenses.filter(l => l.expired).length,
        });
      } catch (error) {
        console.error('Failed to load admin stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="admin-dashboard">
      <h1>System Overview</h1>
      
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Products</h3>
          <p className="stat-number">{stats?.productsCount || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Organizations</h3>
          <p className="stat-number">{stats?.organizationsCount || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Teams</h3>
          <p className="stat-number">{stats?.teamsCount || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Users</h3>
          <p className="stat-number">{stats?.usersCount || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Total Licenses</h3>
          <p className="stat-number">{stats?.licensesCount || 0}</p>
        </div>
        <div className="stat-card warning">
          <h3>Expired Licenses</h3>
          <p className="stat-number">{stats?.expiredLicensesCount || 0}</p>
        </div>
      </div>
    </div>
  );
}
```

### 2.3 修改 Organization License 页面

**旧路由**: `/dashboard/org-license` (可能不存在)  
**新路由**: `/dashboard/org-license/products`  
**权限**: premium (org_boss) 和 allstar (admin)  
**显示变更**:
- Admin: 看所有组织的所有产品和许可证
- Org Boss: 仅看自己所属组织的产品和许可证
- 同一页面，数据不同

**新增文件**: `client/app/dashboard/org-license/products/page.tsx`

```typescript
export default function OrgLicenseProductsPage() {
  const { user } = useAuthStore();
  const [orgLicenses, setOrgLicenses] = useState([]);

  useEffect(() => {
    const loadOrgLicenses = async () => {
      try {
        // Admin: 加载所有组织的许可证
        // Org Boss: 加载自己组织的许可证
        const filters = user?.tier === 'allstar' ? {} : { org_id: user?.organizationId };
        const licenses = await api.getOrgProductLicenses(filters);
        setOrgLicenses(licenses);
      } catch (error) {
        console.error('Failed to load org licenses:', error);
      }
    };

    loadOrgLicenses();
  }, []);

  return (
    <div className="org-license-products">
      <h1>Products & Licenses</h1>
      <div className="license-list">
        {orgLicenses.map((lic) => (
          <div key={lic.id} className="license-card">
            <h3>{lic.product_name}</h3>
            <div className="license-details">
              <span>Total Quota: {lic.total_quota}</span>
              <span>Used: {lic.used_quota}</span>
              <span>Remaining: {lic.remaining_quota}</span>
              <span>Expires: {lic.expires_at}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 🗑️ **PHASE 3: 旧页面与组件删除**

### 3.1 要删除的文件

```
❌ client/app/dashboard/teams/page.tsx
   理由：Teams 功能移到 Team Management > Team & Quotas

❌ client/app/dashboard/organizations/page.tsx
   理由：Organizations 功能仅在 Admin Section 中可见

❌ client/app/dashboard/products/page.tsx
   理由：Products 功能仅在 Admin Section 中可见

❌ client/app/dashboard/users/page.tsx
   理由：Users 功能仅在 Admin Section 中可见，移动到 /admin/users

❌ client/app/dashboard/licenses/page.tsx (如果存在)
   理由：License 功能重组为 Organization & License section

❌ client/components/common/RoleTag.tsx
   理由：改为显示 Tier，不再显示 Role

❌ client/components/common/RoleSelector.tsx (如果存在)
   理由：改为 TierSelector 组件

❌ client/lib/hooks/useRole.ts (如果存在)
   理由：改为 usePermission hook
```

### 3.2 要修改的文件

**修改**: `client/app/layout.tsx`
- 确保 Sidebar 使用新的权限检查

**修改**: `client/app/dashboard/layout.tsx`
- 更新导航结构
- 添加权限检查保护

**修改**: `client/app/admin/layout.tsx`
- 新增文件，添加 Admin 专用布局
- 添加权限检查（仅 allstar 可访问）

**删除**: `client/components/admin/` 中的旧管理组件
- 具体列表在实施时确认

---

## 📊 **PHASE 4: 权限检查与路由保护**

### 4.1 新增路由保护中间件

**新增文件**: `client/lib/middleware/routeProtection.ts`

```typescript
import { useRouter } from 'next/router';
import { useAuthStore } from '@/lib/auth-store';
import { usePermission } from '@/lib/hooks/usePermission';

// 路由权限映射
const ROUTE_PERMISSIONS: Record<string, (perms: ReturnType<typeof usePermission>) => boolean> = {
  '/admin/dashboard': (p) => p.canAccessAdminSection(),
  '/admin/products': (p) => p.canAccessAdminSection(),
  '/admin/organizations': (p) => p.canAccessAdminSection(),
  '/admin/users': (p) => p.canAccessAdminSection(),
  '/admin/batch/generate': (p) => p.canAccessAdminSection(),
  '/admin/batch/revoke': (p) => p.canAccessAdminSection(),
  '/admin/batch/export': (p) => p.canAccessAdminSection(),
  '/dashboard/org-license/products': (p) => p.canAccessOrgLicenseSection(),
  '/dashboard/org-license/assign': (p) => p.canAccessOrgLicenseSection(),
  '/dashboard/team-management/quotas': (p) => p.canAccessTeamManagement(),
  '/dashboard/team-management/members': (p) => p.canAccessTeamManagement(),
};

/**
 * 检查用户是否有权访问特定路由
 */
export function useRouteProtection(route: string): boolean {
  const perms = usePermission();
  const checker = ROUTE_PERMISSIONS[route];
  
  if (!checker) {
    return true; // 路由无权限要求，允许访问
  }

  return checker(perms);
}

/**
 * 在页面加载时保护路由
 */
export function useProtectRoute(requiredPermission: (p: ReturnType<typeof usePermission>) => boolean) {
  const router = useRouter();
  const perms = usePermission();
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    if (!requiredPermission(perms)) {
      router.push('/error/permission-denied');
      return;
    }
  }, [user, perms]);
}
```

### 4.2 在各页面中应用路由保护

**示例**: `client/app/admin/users/page.tsx`

```typescript
import { useProtectRoute } from '@/lib/middleware/routeProtection';
import { usePermission } from '@/lib/hooks/usePermission';

export default function AdminUsersPage() {
  const perms = usePermission();
  
  // 保护路由：仅 allstar 可访问
  useProtectRoute((p) => p.canAccessAdminSection());

  // 页面内容...
}
```

---

## 🧪 **PHASE 5: 测试与验证**

### 5.1 前端路由和权限测试

**新增测试文件**: `client/e2e/10-sidebar-refactor.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Sidebar Refactor - Permission-based Menu', () => {
  test('free user sees only main menu', async ({ page, context }) => {
    // 登录为 free 用户
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'free@test.com');
    await page.fill('input[name="password"]', 'Pass888999');
    await page.click('button:has-text("Login")');
    
    await page.waitForURL('/dashboard');
    
    // 检查 sidebar 菜单可见性
    expect(await page.locator('text=Main Menu').isVisible()).toBe(true);
    expect(await page.locator('text=Organization & License').isVisible()).toBe(false);
    expect(await page.locator('text=Team Management').isVisible()).toBe(false);
    expect(await page.locator('text=Administration').isVisible()).toBe(false);
  });

  test('standard user sees team management', async ({ page }) => {
    // 登录为 standard 用户
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'member1@test.com');
    await page.fill('input[name="password"]', 'Pass888999');
    await page.click('button:has-text("Login")');
    
    await page.waitForURL('/dashboard');
    
    // 检查 Team Management 菜单
    expect(await page.locator('text=Team Management').isVisible()).toBe(true);
    expect(await page.locator('text=Administration').isVisible()).toBe(false);
  });

  test('org boss sees org license and team management', async ({ page }) => {
    // 登录为 org boss（假设已设置为 premium tier）
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'boss@test.com');
    await page.fill('input[name="password"]', 'Pass888999');
    await page.click('button:has-text("Login")');
    
    await page.waitForURL('/dashboard');
    
    // 检查菜单
    expect(await page.locator('text=Organization & License').isVisible()).toBe(true);
    expect(await page.locator('text=Team Management').isVisible()).toBe(true);
    expect(await page.locator('text=Administration').isVisible()).toBe(false);
  });

  test('admin sees all sections', async ({ page }) => {
    // 登录为 admin
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'Pass888999');
    await page.click('button:has-text("Login")');
    
    await page.waitForURL('/dashboard');
    
    // 检查所有菜单
    expect(await page.locator('text=Main Menu').isVisible()).toBe(true);
    expect(await page.locator('text=Organization & License').isVisible()).toBe(true);
    expect(await page.locator('text=Team Management').isVisible()).toBe(true);
    expect(await page.locator('text=Administration').isVisible()).toBe(true);
    expect(await page.locator('text=Resources').isVisible()).toBe(true);
  });

  test('profile page accessible to all users', async ({ page }) => {
    // 登录为任何用户，访问 profile 页面
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'free@test.com');
    await page.fill('input[name="password"]', 'Pass888999');
    await page.click('button:has-text("Login")');
    
    await page.waitForURL('/dashboard');
    
    // 点击 Profile 菜单
    await page.click('text=Profile');
    await page.waitForURL('/dashboard/profile');
    
    // 验证页面内容
    expect(await page.locator('text=My Profile').isVisible()).toBe(true);
    expect(await page.locator('text=Product Tier').isVisible()).toBe(true);
  });

  test('unauthorized route access blocked', async ({ page }) => {
    // 登录为 free 用户
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'free@test.com');
    await page.fill('input[name="password"]', 'Pass888999');
    await page.click('button:has-text("Login")');
    
    await page.waitForURL('/dashboard');
    
    // 尝试直接访问 admin 路由
    await page.goto('/admin/dashboard');
    
    // 应该被重定向到权限错误页面
    expect(page.url()).toContain('/error');
  });
});
```

### 5.2 验证清单

在部署前，确保以下项目都已完成和测试：

- [ ] Sidebar 组件已更新，菜单项根据权限正确显示/隐藏
- [ ] Profile 页面创建完成，所有用户都能访问
- [ ] Admin Dashboard 页面创建完成，仅 admin 可访问
- [ ] Organization & License 页面已更新，支持 admin 和 org_boss 不同数据视图
- [ ] Team Management 页面已更新，权限检查正确
- [ ] 旧页面已删除或重定向
- [ ] 所有受保护路由都有权限检查
- [ ] E2E 测试通过
- [ ] 各 tier 用户的 sidebar 显示正确
- [ ] 权限不足时的错误处理正确

---

## 📋 **实施步骤总结**

```
PHASE 1: Sidebar 重构 (2-3天)
├─ 修改 Sidebar.tsx 添加权限检查
├─ 更新 usePermission hook 添加 sidebar 相关方法
└─ 更新菜单结构

PHASE 2: 新增页面 (2-3天)
├─ 创建 /dashboard/profile 页面
├─ 创建 /admin/dashboard 页面
├─ 更新 /dashboard/org-license/* 页面
└─ 创建 /dashboard/team-management/* 页面

PHASE 3: 删除旧页面 (1天)
├─ 删除过时的 dashboard 页面
├─ 删除旧组件
└─ 更新路由配置

PHASE 4: 路由保护 (1-2天)
├─ 创建路由保护中间件
├─ 在各页面应用权限检查
└─ 处理权限不足时的跳转

PHASE 5: 测试 (2-3天)
├─ 单元测试
├─ E2E 测试
├─ 各 tier 用户验证
└─ 最终回归测试
```

**总预计时间**: 1-2 周

---

## 🎯 **成功标准**

✅ Sidebar 菜单根据用户权限正确显示/隐藏  
✅ 所有新页面都能正确显示和访问  
✅ 权限不足的用户无法访问受保护页面  
✅ Admin 和 Org Boss 看到不同的数据  
✅ 所有 E2E 测试通过  
✅ 没有 console 错误或警告  
✅ 性能指标（LCP, FID, CLS）符合标准  

---

**下一步**: 确认此计划无误后，可开始 PHASE 1 的实施。

