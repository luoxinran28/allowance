'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useConditionalProtectedRoute } from '@/lib/middleware/routeProtection';

export default function AssignLicensesPage() {
  const router = useRouter();
  const { hasAccess } = useConditionalProtectedRoute(
    (perms) => perms.canAccessOrgLicenseSection(),
    '/error/permission-denied'
  );

  useEffect(() => {
    // Component will redirect if no access
  }, []);

  if (!hasAccess) {
    return null;
  }

  return (
    <div className="p-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Assign Licenses</h1>
        <p className="text-muted-foreground mb-8">
          Assign licenses from your organization pool to team members
        </p>

        <div className="border border-dashed border-border rounded-lg p-12 text-center">
          <p className="text-muted-foreground text-lg">
            License assignment interface coming soon
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            This feature will allow you to assign licenses to team members and manage their access
          </p>
        </div>
      </div>
    </div>
  );
}
