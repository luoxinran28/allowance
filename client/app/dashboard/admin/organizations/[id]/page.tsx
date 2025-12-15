'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useConditionalProtectedRoute } from '@/lib/middleware/routeProtection';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Organization {
  id: number;
  org_id: string;
  name: string;
  description?: string;
  created_at: string;
}

export default function OrganizationDetailPage() {
  const params = useParams();
  const { hasAccess } = useConditionalProtectedRoute(
    (perms) => perms.canAccessAdminSection(),
    '/error/permission-denied'
  );
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  const organizationId = params?.id as string;

  useEffect(() => {
    const loadOrganization = async () => {
      try {
        setLoading(true);
        // TODO: Implement API call to fetch organization details
        // const response = await api.getOrganization(organizationId);
        // setOrganization(response.data);
        setOrganization({
          id: parseInt(organizationId),
          org_id: 'ORG-001',
          name: 'Sample Organization',
          description: 'This is a sample organization',
          created_at: new Date().toISOString(),
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (organizationId) {
      loadOrganization();
    }
  }, [organizationId]);

  if (!hasAccess) {
    return null;
  }

  if (loading) {
    return <div className="text-center py-8">Loading organization...</div>;
  }

  if (!organization) {
    return <div className="text-center py-8 text-destructive">Organization not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Admin', href: '/dashboard/admin/dashboard' },
          { label: 'Organizations', href: '/dashboard/admin/organizations' },
          { label: organization.name },
        ]}
      />

      {/* Back Button */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/admin/organizations">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Organizations
          </Link>
        </Button>
      </div>

      {/* Header */}
      <h1 className="text-3xl font-bold tracking-tight">{organization.name}</h1>

      {/* Organization Details */}
      <div className="border border-border rounded-lg p-6 space-y-6">
        <h2 className="text-lg font-semibold">Organization Details</h2>

        <div className="grid gap-4">
          <div className="space-y-2">
            <Label>Organization ID</Label>
            <Input readOnly value={organization.org_id} />
          </div>

          <div className="space-y-2">
            <Label>Name</Label>
            <Input readOnly value={organization.name} />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <textarea
              readOnly
              value={organization.description || 'N/A'}
              className="w-full px-3 py-2 border border-input rounded-md text-sm bg-muted"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Created Date</Label>
            <Input
              readOnly
              value={new Date(organization.created_at).toLocaleDateString()}
            />
          </div>
        </div>
      </div>

      {/* TODO: Add Products & Licenses section */}
      {/* TODO: Add Teams section */}
      {/* TODO: Add Organization Bosses section */}
    </div>
  );
}
