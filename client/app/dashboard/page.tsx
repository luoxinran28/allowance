'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { usePermission } from '@/lib/hooks/usePermission';
import { User, UserLicense } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, Lock, Zap, Star } from 'lucide-react';

interface DashboardData {
  user: User | null;
  licenses: UserLicense[];
  teamsCount: number;
  orgsCount: number;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>({
    user: null,
    licenses: [],
    teamsCount: 0,
    orgsCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { canManageOrganization, isPremium, isAdmin } = usePermission();

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError('');

        // Fetch all required data in parallel
        const [profileRes, licensesRes, teamsRes, orgsRes] = await Promise.all([
          apiClient.getUserProfile(),
          apiClient.getUserLicenses(),
          apiClient.listTeams(),
          apiClient.getUserOrganizations(),
        ]);

        setData({
          user: profileRes.data,
          licenses: licensesRes.data || [],
          teamsCount: Array.isArray(teamsRes.data) ? teamsRes.data.length : 0,
          orgsCount: Array.isArray(orgsRes.data?.data) ? orgsRes.data.data.length : 0,
        });
      } catch (err: any) {
        setError(
          err.response?.data?.error || 
          'Failed to load dashboard data'
        );
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">Loading dashboard...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const activeLicenses = data.licenses.filter(l => !l.revoked_at && new Date(l.expires_at) > new Date()).length;

  // Determine if user should see upgrade suggestions
  const showPremiumUpgrade = data.user?.tier === 'free' || data.user?.tier === 'standard';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome back, {data.user?.email?.split('@')[0]}!</h1>
        <p className="text-muted-foreground mt-2">Here's an overview of your account</p>
      </div>

      {/* Permission Alerts */}
      {showPremiumUpgrade && canManageOrganization() === false && (
        <Alert>
          <Zap className="h-4 w-4" />
          <AlertDescription>
            <strong>Unlock Premium Features:</strong> Upgrade to Premium to access batch operations, team management, and organization control.{' '}
            <Button variant="link" className="h-auto p-0 ml-1" asChild>
              <Link href="/dashboard/billing">View plans →</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Account Tier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize mb-2">{data.user?.tier}</div>
            <p className="text-xs text-muted-foreground">
              Status: <span className="font-semibold capitalize">{data.user?.status}</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Licenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">{activeLicenses}</div>
            <p className="text-xs text-muted-foreground">
              Out of {data.licenses.length} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Teams</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">{data.teamsCount}</div>
            <Button variant="link" className="h-auto p-0" asChild>
              <Link href="/dashboard/teams" className="text-xs">
                Manage Teams →
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Organizations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">{data.orgsCount}</div>
            <Button variant="link" className="h-auto p-0" asChild>
              <Link href="/dashboard/organizations" className="text-xs">
                Manage Orgs →
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Generate License</CardTitle>
            <CardDescription>Create a new license for your products</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard/products">Go to Products</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create Team</CardTitle>
            <CardDescription>Collaborate with team members on licenses</CardDescription>
          </CardHeader>
          <CardContent>
            {data.user?.tier === 'free' ? (
              <Button disabled variant="outline" className="w-full">
                <Lock className="h-4 w-4 mr-2" />
                Premium feature
              </Button>
            ) : (
              <Button asChild>
                <Link href="/dashboard/teams">Create Team</Link>
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>View Profile</CardTitle>
            <CardDescription>Manage your account settings and preferences</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard/profile">View Profile</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Billing</CardTitle>
            <CardDescription>View subscription and billing information</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard/billing">Billing Info</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Premium & Admin Features */}
      {isPremium() && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Premium Features
            </CardTitle>
            <CardDescription>You have access to advanced license management tools</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button variant="outline" asChild className="justify-start">
                <Link href="/dashboard/batch/generate">Generate Batch Licenses</Link>
              </Button>
              <Button variant="outline" asChild className="justify-start">
                <Link href="/dashboard/batch/revoke">Revoke Licenses</Link>
              </Button>
              <Button variant="outline" asChild className="justify-start">
                <Link href="/dashboard/batch/export">Export Licenses</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isAdmin() && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              Administrator Panel
            </CardTitle>
            <CardDescription>You have full system administration access</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button variant="outline" asChild className="justify-start">
                <Link href="/dashboard/admin/users">Manage Users</Link>
              </Button>
              <Button variant="outline" asChild className="justify-start">
                <Link href="/dashboard/admin/products">Manage Products</Link>
              </Button>
              <Button variant="outline" asChild className="justify-start">
                <Link href="/dashboard/admin/team-quotas">Team Quotas</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Licenses */}
      {data.licenses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Licenses</CardTitle>
            <CardDescription>Your most recent licenses and their status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">License Key</th>
                    <th className="text-left py-3 px-4 font-semibold">Expires</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.licenses.slice(0, 5).map((license) => {
                    const isExpired = new Date(license.expires_at) < new Date();
                    const isRevoked = !!license.revoked_at;

                    return (
                      <tr key={license.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4 font-mono text-xs">
                          {license.license_key.substring(0, 20)}...
                        </td>
                        <td className="py-3 px-4">
                          {new Date(license.expires_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={
                            isRevoked ? "destructive" : isExpired ? "outline" : "default"
                          }>
                            {isRevoked ? 'Revoked' : isExpired ? 'Expired' : 'Active'}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {data.licenses.length > 5 && (
              <div className="mt-4 pt-4 border-t">
                <Button variant="link" asChild>
                  <Link href="/dashboard/products">
                    View all licenses →
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
