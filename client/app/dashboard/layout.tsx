'use client';

/**
 * ⚠️ 此 layout 用于向后兼容旧的 /dashboard 路由
 * 新页面应该使用对应的新路由：
 * - /user/profile, /user/billing
 * - /org-license/products, /org-license/assign
 * - /team-management/quotas, /team-management/members
 * - /admin/dashboard, /admin/products, /admin/organizations, /admin/users, /admin/teams, /admin/batch/*
 */

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
