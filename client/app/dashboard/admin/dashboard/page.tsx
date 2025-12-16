'use client';

import { useEffect, useState } from 'react';
import { useConditionalProtectedRoute } from '@/lib/middleware/routeProtection';
import { Breadcrumb } from '@/components/common/Breadcrumb';

interface AdminStats {
  productsCount: number;
  organizationsCount: number;
  teamsCount: number;
  usersCount: number;
  licensesCount: number;
  expiredLicensesCount: number;
}

export default function AdminDashboard() {
  const { hasAccess } = useConditionalProtectedRoute(
    (perms) => perms.canAccessAdminSection(),
    '/error/permission-denied'
  );
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!hasAccess) return;

    const loadStats = async () => {
      try {
        setLoading(true);
        setError('');
        
        // For now, we'll use placeholder data
        // In production, these would be separate API calls
        const mockStats: AdminStats = {
          productsCount: 5,
          organizationsCount: 2,
          teamsCount: 10,
          usersCount: 9,
          licensesCount: 24,
          expiredLicensesCount: 0,
        };

        setStats(mockStats);
      } catch (err: any) {
        setError('Failed to load admin statistics');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [hasAccess]);

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center text-muted-foreground">Loading admin dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="border border-red-200 bg-red-50 text-red-700 rounded-lg p-4">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Breadcrumb Navigation */}
      <div className="mb-8">
        <Breadcrumb
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Administration' },
          ]}
        />
      </div>

      <div>
        <h1 className="text-3xl font-bold mb-2">System Overview</h1>
        <p className="text-muted-foreground mb-8">Monitor and manage all system resources</p>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Products Card */}
          <div className="border border-border rounded-lg p-6 bg-card hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Products</p>
                <p className="text-3xl font-bold mt-2">{stats?.productsCount || 0}</p>
              </div>
              <div className="text-3xl">📦</div>
            </div>
            <a href="/dashboard/admin/products" className="text-sm text-blue-600 hover:text-blue-700 mt-4 block">
              View Products →
            </a>
          </div>

          {/* Organizations Card */}
          <div className="border border-border rounded-lg p-6 bg-card hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Organizations</p>
                <p className="text-3xl font-bold mt-2">{stats?.organizationsCount || 0}</p>
              </div>
              <div className="text-3xl">🏢</div>
            </div>
            <a href="/dashboard/admin/organizations" className="text-sm text-blue-600 hover:text-blue-700 mt-4 block">
              View Organizations →
            </a>
          </div>

          {/* Teams Card */}
          <div className="border border-border rounded-lg p-6 bg-card hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Teams</p>
                <p className="text-3xl font-bold mt-2">{stats?.teamsCount || 0}</p>
              </div>
              <div className="text-3xl">👥</div>
            </div>
            <a href="/dashboard/admin/users" className="text-sm text-blue-600 hover:text-blue-700 mt-4 block">
              View Teams →
            </a>
          </div>

          {/* Users Card */}
          <div className="border border-border rounded-lg p-6 bg-card hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Users</p>
                <p className="text-3xl font-bold mt-2">{stats?.usersCount || 0}</p>
              </div>
              <div className="text-3xl">👤</div>
            </div>
            <a href="/dashboard/admin/users" className="text-sm text-blue-600 hover:text-blue-700 mt-4 block">
              View Users →
            </a>
          </div>

          {/* Total Licenses Card */}
          <div className="border border-border rounded-lg p-6 bg-card hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Licenses</p>
                <p className="text-3xl font-bold mt-2">{stats?.licensesCount || 0}</p>
              </div>
              <div className="text-3xl">🎫</div>
            </div>
            <a href="/dashboard/admin/batch/generate" className="text-sm text-blue-600 hover:text-blue-700 mt-4 block">
              Manage Licenses →
            </a>
          </div>

          {/* Expired Licenses Card */}
          <div className={`border rounded-lg p-6 hover:shadow-lg transition-shadow ${
            (stats?.expiredLicensesCount || 0) > 0
              ? 'border-red-200 bg-red-50'
              : 'border-border bg-card'
          }`}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Expired Licenses</p>
                <p className={`text-3xl font-bold mt-2 ${
                  (stats?.expiredLicensesCount || 0) > 0 ? 'text-red-600' : ''
                }`}>
                  {stats?.expiredLicensesCount || 0}
                </p>
              </div>
              <div className="text-3xl">⚠️</div>
            </div>
            {(stats?.expiredLicensesCount || 0) > 0 && (
              <p className="text-sm text-red-600 mt-4">Action required</p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <a 
              href="/dashboard/admin/batch/generate" 
              className="border border-border rounded-lg p-4 hover:bg-accent transition-colors"
            >
              <p className="font-medium">Generate Licenses</p>
              <p className="text-sm text-muted-foreground mt-1">Create new batch licenses</p>
            </a>
            <a 
              href="/dashboard/admin/batch/revoke" 
              className="border border-border rounded-lg p-4 hover:bg-accent transition-colors"
            >
              <p className="font-medium">Revoke Licenses</p>
              <p className="text-sm text-muted-foreground mt-1">Revoke existing licenses</p>
            </a>
            <a 
              href="/dashboard/admin/batch/export" 
              className="border border-border rounded-lg p-4 hover:bg-accent transition-colors"
            >
              <p className="font-medium">Export Licenses</p>
              <p className="text-sm text-muted-foreground mt-1">Export license data</p>
            </a>
            <a 
              href="/dashboard/admin/users" 
              className="border border-border rounded-lg p-4 hover:bg-accent transition-colors"
            >
              <p className="font-medium">Manage Users</p>
              <p className="text-sm text-muted-foreground mt-1">View and manage users</p>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
