'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useConditionalProtectedRoute } from '@/lib/middleware/routeProtection';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus } from 'lucide-react';

interface Organization {
  id: number;
  org_id: string;
  name: string;
  description?: string;
  boss_count?: number;
  team_count?: number;
  member_count?: number;
  product_count?: number;
  created_at: string;
}

export default function AdminOrganizationsPage() {
  const { hasAccess } = useConditionalProtectedRoute(
    (perms) => perms.canAccessAdminSection(),
    '/error/permission-denied'
  );
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadOrganizations = async () => {
      try {
        setLoading(true);
        // TODO: Implement API call to fetch organizations
        // const response = await api.getOrganizations({ search: searchTerm });
        // setOrganizations(response.data);
        setOrganizations([]);
      } catch (err) {
        setError('Failed to load organizations');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadOrganizations();
  }, [searchTerm]);

  if (!hasAccess) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Organizations</h1>
        <Button asChild>
          <Link href="/admin/organizations/create">
            <Plus className="h-4 w-4 mr-2" />
            Create Organization
          </Link>
        </Button>
      </div>

      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search organizations..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Organizations Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted border-b border-border">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Organization</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Boss</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Teams</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Members</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Products</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Created</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                  Loading organizations...
                </td>
              </tr>
            ) : organizations.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                  No organizations found
                </td>
              </tr>
            ) : (
              organizations.map((org) => (
                <tr key={org.id} className="hover:bg-muted/50">
                  <td className="px-6 py-4">
                    <Link href={`/admin/organizations/${org.id}`} className="font-medium hover:underline">
                      {org.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {org.boss_count || 0} boss(es)
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {org.team_count || 0}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {org.member_count || 0}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {org.product_count || 0}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {new Date(org.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/admin/organizations/${org.id}`}>View</Link>
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
