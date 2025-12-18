'use client';

import { useEffect, useState } from 'react';
import { useConditionalProtectedRoute } from '@/lib/middleware/routeProtection';

interface OrgLicense {
  id: number;
  productName: string;
  totalQuota: number;
  usedQuota: number;
  remainingQuota: number;
  expiresAt: string;
}

export default function OrgLicenseProductsPage() {
  const { hasAccess } = useConditionalProtectedRoute(
    (perms) => perms.canAccessOrgLicenseSection(),
    '/error/permission-denied'
  );
  const [licenses, setLicenses] = useState<OrgLicense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!hasAccess) return;

    const loadLicenses = async () => {
      try {
        setLoading(true);
        setError('');
        
        // For now, use mock data
        // In production, this would be an API call
        const mockLicenses: OrgLicense[] = [
          {
            id: 1,
            productName: 'Allowance Pro',
            totalQuota: 100,
            usedQuota: 45,
            remainingQuota: 55,
            expiresAt: '2025-12-31',
          },
          {
            id: 2,
            productName: 'Form Builder',
            totalQuota: 50,
            usedQuota: 30,
            remainingQuota: 20,
            expiresAt: '2025-12-31',
          },
        ];

        setLicenses(mockLicenses);
      } catch (err: any) {
        setError('Failed to load organization licenses');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadLicenses();
  }, [hasAccess]);

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center text-muted-foreground">Loading licenses...</div>
      </div>
    );
  }

  if (!hasAccess) {
    return null;
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
      <div>
        <h1 className="text-3xl font-bold mb-2">Products & Licenses</h1>
        <p className="text-muted-foreground mb-8">
          View your organization's licenses
        </p>

        {licenses.length === 0 ? (
          <div className="border border-dashed border-border rounded-lg p-8 text-center">
            <p className="text-muted-foreground">No licenses assigned yet</p>
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
    </div>
  );
}
