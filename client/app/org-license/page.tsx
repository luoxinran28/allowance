'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useConditionalProtectedRoute } from '@/lib/middleware/routeProtection';
import { apiClient } from '@/lib/api-client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Building2 } from 'lucide-react';

// ============================================
// Types
// ============================================

interface OrgLicense {
  id: number;
  productId: number;
  upid: string;
  productName: string;
  organizationId: number;
  organizationName: string;
  totalQuota: number;
  usedQuota: number;
  remainingQuota: number;
  expiresAt: string;
}

// ============================================
// Products & Licenses Tab (Overview)
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
        
        const response = await apiClient.getMyOrgLicenses();
        const licensesList = response.data?.licenses || [];

        const realLicenses: OrgLicense[] = licensesList.map((l: any) => ({
          id: l.id,
          productId: l.product_id,
          upid: l.upid,
          productName: l.product_name || `Product #${l.product_id}`,
          organizationId: l.organization_id,
          organizationName: l.organization_name || `Organization #${l.organization_id}`,
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

  // Group licenses by product for overview
  const licensesByProduct = licenses.reduce((acc, license) => {
    if (!acc[license.upid]) {
      acc[license.upid] = {
        upid: license.upid,
        productName: license.productName,
        licenses: []
      };
    }
    acc[license.upid].licenses.push(license);
    return acc;
  }, {} as Record<string, { upid: string; productName: string; licenses: OrgLicense[] }>);

  const productList = Object.values(licensesByProduct);

  return (
    <div className="space-y-6">
      {licenses.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-8 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No licenses assigned to your organizations yet</p>
          <p className="text-sm text-muted-foreground mt-2">
            Contact your system administrator to assign product licenses to your organization
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {productList.map((product) => {
            const totalQuota = product.licenses.reduce((sum, l) => sum + l.totalQuota, 0);
            const usedQuota = product.licenses.reduce((sum, l) => sum + l.usedQuota, 0);
            const remainingQuota = product.licenses.reduce((sum, l) => sum + l.remainingQuota, 0);
            const usagePercent = totalQuota > 0 ? (usedQuota / totalQuota) * 100 : 0;
            const isNearCapacity = usagePercent >= 80;
            
            return (
              <div
                key={product.upid}
                className="border border-border rounded-lg p-6 bg-card hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">{product.productName}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      UPID: {product.upid}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {product.licenses.length} organization{product.licenses.length !== 1 ? 's' : ''} allocated
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
                    <span className="text-muted-foreground">Total License Pool</span>
                    <span className="font-medium">
                      {usedQuota} / {totalQuota} allocated
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
                    <p className="text-lg font-bold mt-1">{totalQuota}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Allocated</p>
                    <p className="text-lg font-bold text-blue-600 mt-1">{usedQuota}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Available</p>
                    <p className="text-lg font-bold text-green-600 mt-1">{remainingQuota}</p>
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
// Organization Allocations Tab (Products allocated to Organizations)
// ============================================

function OrganizationAllocationsTab() {
  const [licenses, setLicenses] = useState<OrgLicense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError('');
        
        const response = await apiClient.getMyOrgLicenses();
        const licensesList = response.data?.licenses || [];
        
        const realLicenses: OrgLicense[] = licensesList.map((l: any) => ({
          id: l.id,
          productId: l.product_id,
          upid: l.upid,
          productName: l.product_name || `Product #${l.product_id}`,
          organizationId: l.organization_id,
          organizationName: l.organization_name || `Organization #${l.organization_id}`,
          totalQuota: l.total_count,
          usedQuota: l.total_count - l.available_count,
          remainingQuota: l.available_count,
          expiresAt: l.expires_at,
        }));
        
        setLicenses(realLicenses);
        
      } catch (err: any) {
        setError('Failed to load organization allocations');
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

  // Group licenses by organization
  const licensesByOrg = licenses.reduce((acc, license) => {
    if (!acc[license.organizationId]) {
      acc[license.organizationId] = {
        organizationId: license.organizationId,
        organizationName: license.organizationName,
        licenses: []
      };
    }
    acc[license.organizationId].licenses.push(license);
    return acc;
  }, {} as Record<number, { organizationId: number; organizationName: string; licenses: OrgLicense[] }>);

  const orgList = Object.values(licensesByOrg);

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        View products and licenses allocated to your organizations
      </p>

      {licenses.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-8 text-center">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No licenses allocated to your organizations yet</p>
          <p className="text-sm text-muted-foreground mt-2">
            Contact your system administrator to assign product licenses to your organization
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orgList.map((org) => {
            const totalQuota = org.licenses.reduce((sum, l) => sum + l.totalQuota, 0);
            const usedQuota = org.licenses.reduce((sum, l) => sum + l.usedQuota, 0);
            
            return (
              <div key={org.organizationId} className="border border-border rounded-lg p-6 bg-card">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      {org.organizationName}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {org.licenses.length} product{org.licenses.length !== 1 ? 's' : ''} allocated
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total Licenses</p>
                    <p className="font-semibold">{usedQuota} / {totalQuota} used</p>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-2 font-medium">Product</th>
                        <th className="text-left py-2 px-2 font-medium">UPID</th>
                        <th className="text-right py-2 px-2 font-medium">Total</th>
                        <th className="text-right py-2 px-2 font-medium">Used</th>
                        <th className="text-right py-2 px-2 font-medium">Available</th>
                        <th className="text-right py-2 px-2 font-medium">Expires</th>
                        <th className="text-right py-2 px-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {org.licenses.map((license, idx) => {
                        const usagePercent = license.totalQuota > 0 
                          ? Math.round((license.usedQuota / license.totalQuota) * 100) 
                          : 0;
                        const isHighUsage = usagePercent >= 80;
                        
                        return (
                          <tr key={`${license.id}-${idx}`} className="border-b border-border last:border-0">
                            <td className="py-2 px-2 font-medium">{license.productName}</td>
                            <td className="py-2 px-2 text-muted-foreground">{license.upid}</td>
                            <td className="py-2 px-2 text-right">{license.totalQuota}</td>
                            <td className="py-2 px-2 text-right">{license.usedQuota}</td>
                            <td className="py-2 px-2 text-right text-green-600">
                              {license.remainingQuota}
                            </td>
                            <td className="py-2 px-2 text-right text-muted-foreground">
                              {new Date(license.expiresAt).toLocaleDateString()}
                            </td>
                            <td className="py-2 px-2 text-right">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                isHighUsage ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                              }`}>
                                {usagePercent}% used
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
            View your organization&apos;s product licenses and allocations
          </p>
        </div>

        <Tabs value={defaultTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Products & Licenses
            </TabsTrigger>
            <TabsTrigger value="allocations" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Organization Allocations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            <ProductsLicensesTab />
          </TabsContent>

          <TabsContent value="allocations">
            <OrganizationAllocationsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
