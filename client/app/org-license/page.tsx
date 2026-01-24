'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useConditionalProtectedRoute } from '@/lib/middleware/routeProtection';
import { apiClient } from '@/lib/api-client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Users } from 'lucide-react';
import Link from 'next/link';

// ============================================
// Types
// ============================================

interface OrgLicense {
  id: number;
  productId: number;
  upid: string;
  productName: string;
  totalQuota: number;
  usedQuota: number;
  remainingQuota: number;
  expiresAt: string;
}

interface TeamQuota {
  team_id: number;
  team_name: string;
  product_id: number;
  upid: string;
  product_name: string;
  allocated_count: number;
  used_count: number;
}

// ============================================
// Products & Licenses Tab
// ============================================

function ProductsLicensesTab() {
  const [licenses, setLicenses] = useState<OrgLicense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadLicenses = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Use the endpoint for org members to get their org's licenses
        const response = await apiClient.getMyOrgLicenses();
        
        const licensesList = response.data?.licenses || [];

        const realLicenses: OrgLicense[] = licensesList.map((l: any) => ({
          id: l.id,
          productId: l.product_id,
          upid: l.upid,
          productName: l.product_name || `Product #${l.product_id}`,
          totalQuota: l.total_count,
          usedQuota: l.total_count - l.available_count,
          remainingQuota: l.available_count,
          expiresAt: l.expires_at,
        }));

        setLicenses(realLicenses);
      } catch (err: any) {
        setError('Failed to load organization licenses');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadLicenses();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-red-200 bg-red-50 text-red-700 rounded-lg p-4">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {licenses.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-8 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No licenses assigned to your organization yet</p>
          <p className="text-sm text-muted-foreground mt-2">
            Contact your system administrator to assign product licenses to your organization
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {licenses.map((license) => {
            const usagePercent = license.totalQuota > 0 ? (license.usedQuota / license.totalQuota) * 100 : 0;
            const isNearCapacity = usagePercent >= 80;
            
            return (
              <div
                key={license.id}
                className="border border-border rounded-lg p-6 bg-card hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">{license.productName}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      UPID: {license.upid}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Expires: {new Date(license.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    isNearCapacity
                      ? 'bg-red-100 text-red-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {Math.round(usagePercent)}% Allocated
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">License Pool Usage</span>
                    <span className="font-medium">
                      {license.usedQuota} / {license.totalQuota} allocated to teams
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        isNearCapacity ? 'bg-red-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(usagePercent, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Quota</p>
                    <p className="text-lg font-bold mt-1">{license.totalQuota}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Allocated to Teams</p>
                    <p className="text-lg font-bold text-blue-600 mt-1">{license.usedQuota}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Unallocated</p>
                    <p className="text-lg font-bold text-green-600 mt-1">{license.remainingQuota}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================
// Team Allocations Tab (Read-only view)
// ============================================

function TeamAllocationsTab() {
  const [teamQuotas, setTeamQuotas] = useState<TeamQuota[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError('');
        
        const quotasRes = await apiClient.listTeamQuotas();
        const quotasList = Array.isArray(quotasRes.data) ? quotasRes.data : (quotasRes.data?.quotas || []);
        setTeamQuotas(quotasList);
        
      } catch (err: any) {
        setError('Failed to load team allocations');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-red-200 bg-red-50 text-red-700 rounded-lg p-4">
        {error}
      </div>
    );
  }

  // Group quotas by team
  const quotasByTeam = teamQuotas.reduce((acc, quota) => {
    if (!acc[quota.team_id]) {
      acc[quota.team_id] = {
        team_id: quota.team_id,
        team_name: quota.team_name,
        quotas: []
      };
    }
    acc[quota.team_id].quotas.push(quota);
    return acc;
  }, {} as Record<number, { team_id: number; team_name: string; quotas: TeamQuota[] }>);

  const teamList = Object.values(quotasByTeam);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-muted-foreground">
          View how organization licenses are allocated across teams
        </p>
        <Link 
          href="/team-management/quotas"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
        >
          Manage Team Quotas
        </Link>
      </div>

      {teamQuotas.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-8 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No quotas allocated to teams yet</p>
          <p className="text-sm text-muted-foreground mt-2">
            Go to <Link href="/team-management/quotas" className="text-blue-600 hover:underline">Team & Quotas</Link> to allocate quotas to your teams
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {teamList.map((team) => {
            const totalAllocated = team.quotas.reduce((sum, q) => sum + q.allocated_count, 0);
            const totalUsed = team.quotas.reduce((sum, q) => sum + q.used_count, 0);
            
            return (
              <div key={team.team_id} className="border border-border rounded-lg p-6 bg-card">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">{team.team_name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {team.quotas.length} product{team.quotas.length !== 1 ? 's' : ''} allocated
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total Usage</p>
                    <p className="font-semibold">{totalUsed} / {totalAllocated}</p>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-2 font-medium">Product</th>
                        <th className="text-right py-2 px-2 font-medium">Allocated</th>
                        <th className="text-right py-2 px-2 font-medium">Used</th>
                        <th className="text-right py-2 px-2 font-medium">Available</th>
                        <th className="text-right py-2 px-2 font-medium">Usage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {team.quotas.map((quota, idx) => {
                        const usagePercent = quota.allocated_count > 0 
                          ? Math.round((quota.used_count / quota.allocated_count) * 100) 
                          : 0;
                        const isHighUsage = usagePercent >= 80;
                        
                        return (
                          <tr key={`${quota.upid}-${idx}`} className="border-b border-border last:border-0">
                            <td className="py-2 px-2">{quota.product_name || quota.upid}</td>
                            <td className="py-2 px-2 text-right">{quota.allocated_count}</td>
                            <td className="py-2 px-2 text-right">{quota.used_count}</td>
                            <td className="py-2 px-2 text-right text-green-600">
                              {quota.allocated_count - quota.used_count}
                            </td>
                            <td className="py-2 px-2 text-right">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                isHighUsage ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                              }`}>
                                {usagePercent}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================
// Main Page Component
// ============================================

export default function OrgLicensePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasAccess } = useConditionalProtectedRoute(
    (perms) => perms.canAccessOrgLicenseSection(),
    '/error/permission-denied'
  );
  
  // Get tab from URL or default to 'products'
  const tabParam = searchParams.get('tab');
  const defaultTab = tabParam && ['products', 'allocations'].includes(tabParam) ? tabParam : 'products';

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', value);
    router.push(`/org-license?${params.toString()}`);
  };

  if (!hasAccess) {
    return null;
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Organization Licenses</h1>
          <p className="text-muted-foreground">
            View your organization&apos;s product licenses and team allocations
          </p>
        </div>

        <Tabs value={defaultTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Products & Licenses
            </TabsTrigger>
            <TabsTrigger value="allocations" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Team Allocations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            <ProductsLicensesTab />
          </TabsContent>

          <TabsContent value="allocations">
            <TeamAllocationsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
