'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useConditionalProtectedRoute } from '@/lib/middleware/routeProtection';
import { apiClient } from '@/lib/api-client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Users } from 'lucide-react';

// ============================================
// Types
// ============================================

interface OrgLicense {
  id: number;
  productName: string;
  totalQuota: number;
  usedQuota: number;
  remainingQuota: number;
  expiresAt: string;
}

// ============================================
// Products & Quotas Tab
// ============================================

function ProductsQuotasTab() {
  const [licenses, setLicenses] = useState<OrgLicense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadLicenses = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Use the new endpoint for org members to get their org's licenses
        const response = await apiClient.getMyOrgLicenses();
        
        const licensesList = response.data?.licenses || [];

        const realLicenses: OrgLicense[] = licensesList.map((l: any) => ({
          id: l.id,
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
          <p className="text-muted-foreground">No licenses assigned to your organization yet</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {licenses.map((license) => {
            const usagePercent = (license.usedQuota / license.totalQuota) * 100;
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
                      Expires: {new Date(license.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    isNearCapacity
                      ? 'bg-red-100 text-red-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {Math.round(usagePercent)}% Used
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">License Usage</span>
                    <span className="font-medium">
                      {license.usedQuota} / {license.totalQuota}
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
                    <p className="text-xs text-muted-foreground">Used</p>
                    <p className="text-lg font-bold text-blue-600 mt-1">{license.usedQuota}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Remaining</p>
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
// Assign to Members Tab
// ============================================

function AssignToMembersTab() {
  return (
    <div className="space-y-6">
      <div className="border border-dashed border-border rounded-lg p-12 text-center">
        <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground text-lg">
          License assignment interface coming soon
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          This feature will allow you to assign licenses to team members and manage their access
        </p>
      </div>
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
  const defaultTab = tabParam && ['products', 'assign'].includes(tabParam) ? tabParam : 'products';

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
            View your organization's product quotas and assign licenses to team members
          </p>
        </div>

        <Tabs value={defaultTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Products & Quotas
            </TabsTrigger>
            <TabsTrigger value="assign" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Assign to Members
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            <ProductsQuotasTab />
          </TabsContent>

          <TabsContent value="assign">
            <AssignToMembersTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
