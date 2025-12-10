'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useConditionalProtectedRoute } from '@/lib/middleware/routeProtection';

interface TeamQuota {
  id: number;
  name: string;
  productName: string;
  totalQuota: number;
  usedQuota: number;
  remainingQuota: number;
}

export default function TeamQuotasPage() {
  const router = useRouter();
  const { hasAccess } = useConditionalProtectedRoute(
    (perms) => perms.canAccessTeamManagement(),
    '/error/permission-denied'
  );
  const [quotas, setQuotas] = useState<TeamQuota[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!hasAccess) return;

    const loadQuotas = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Mock data
        const mockQuotas: TeamQuota[] = [
          {
            id: 1,
            name: 'Development Team',
            productName: 'Allowance Pro',
            totalQuota: 50,
            usedQuota: 30,
            remainingQuota: 20,
          },
          {
            id: 2,
            name: 'Design Team',
            productName: 'Allowance Pro',
            totalQuota: 30,
            usedQuota: 15,
            remainingQuota: 15,
          },
          {
            id: 3,
            name: 'Marketing Team',
            productName: 'Form Builder',
            totalQuota: 25,
            usedQuota: 10,
            remainingQuota: 15,
          },
        ];

        setQuotas(mockQuotas);
      } catch (err: any) {
        setError('Failed to load team quotas');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadQuotas();
  }, [hasAccess]);

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center text-muted-foreground">Loading team quotas...</div>
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
        <h1 className="text-3xl font-bold mb-2">Team & Quotas</h1>
        <p className="text-muted-foreground mb-8">
          Manage team quota allocations and monitor usage
        </p>

        {quotas.length === 0 ? (
          <div className="border border-dashed border-border rounded-lg p-8 text-center">
            <p className="text-muted-foreground">No teams with quotas</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {quotas.map((quota) => {
              const usagePercent = (quota.usedQuota / quota.totalQuota) * 100;
              const isNearCapacity = usagePercent >= 80;
              
              return (
                <div
                  key={quota.id}
                  className="border border-border rounded-lg p-6 bg-card hover:shadow-lg transition-shadow"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{quota.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Product: {quota.productName}
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
                      <span className="text-muted-foreground">Quota Usage</span>
                      <span className="font-medium">
                        {quota.usedQuota} / {quota.totalQuota}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          isNearCapacity ? 'bg-red-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(usagePercent, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
                    <div>
                      <p className="text-xs text-muted-foreground">Allocated</p>
                      <p className="text-lg font-bold mt-1">{quota.totalQuota}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Used</p>
                      <p className="text-lg font-bold text-blue-600 mt-1">{quota.usedQuota}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Available</p>
                      <p className="text-lg font-bold text-green-600 mt-1">{quota.remainingQuota}</p>
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
