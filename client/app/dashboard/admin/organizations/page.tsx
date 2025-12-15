'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useConditionalProtectedRoute } from '@/lib/middleware/routeProtection';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus } from 'lucide-react';
import { AdminDetailOverlay } from '@/components/admin/AdminDetailOverlay';

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedOrgId = searchParams.get('selected_id') ? parseInt(searchParams.get('selected_id')!) : null;

  useConditionalProtectedRoute(
    (perms) => perms.canAccessAdminSection(),
    '/error/permission-denied'
  );

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);

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

  useEffect(() => {
    // Sync selected org when selectedOrgId changes
    if (selectedOrgId && organizations.length > 0) {
      const org = organizations.find(o => o.id === selectedOrgId);
      if (org) {
        setSelectedOrg(org);
      }
    } else {
      setSelectedOrg(null);
    }
  }, [selectedOrgId, organizations]);

  const handleOpenOverlay = (org: Organization) => {
    router.push(`?selected_id=${org.id}`);
  };

  const handleCloseOverlay = () => {
    router.push('');
    setSelectedOrg(null);
  };

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Organizations</h1>
        <Button asChild>
          <button onClick={() => handleOpenOverlay({ id: 0, org_id: '', name: 'Create Organization', created_at: new Date().toISOString() })}>
            <Plus className="h-4 w-4 mr-2" />
            Create Organization
          </button>
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
                    <button
                      onClick={() => handleOpenOverlay(org)}
                      className="font-medium hover:underline text-blue-600"
                    >
                      {org.name}
                    </button>
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
                    <button
                      onClick={() => handleOpenOverlay(org)}
                      className="px-3 py-1 rounded hover:bg-gray-100 text-blue-600 hover:text-blue-800"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Organization Detail Overlay */}
      <AdminDetailOverlay
        isOpen={!!selectedOrg}
        title={selectedOrg?.name || 'Organization Details'}
        onClose={handleCloseOverlay}
        size="lg"
      >
        {selectedOrg && (
          <div className="p-6 space-y-6">
            {/* Organization Info */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Organization Info</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 font-medium">Organization ID</p>
                  <p className="text-gray-900 font-mono">{selectedOrg.org_id}</p>
                </div>
                <div>
                  <p className="text-gray-600 font-medium">Name</p>
                  <p className="text-gray-900">{selectedOrg.name}</p>
                </div>
                <div>
                  <p className="text-gray-600 font-medium">Description</p>
                  <p className="text-gray-900">{selectedOrg.description || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-600 font-medium">Created</p>
                  <p className="text-gray-900">{new Date(selectedOrg.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200" />

            {/* Statistics */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Statistics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <p className="text-sm text-gray-600">Bosses</p>
                  <p className="text-2xl font-bold text-blue-600">{selectedOrg.boss_count || 0}</p>
                </div>
                <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                  <p className="text-sm text-gray-600">Teams</p>
                  <p className="text-2xl font-bold text-green-600">{selectedOrg.team_count || 0}</p>
                </div>
                <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                  <p className="text-sm text-gray-600">Members</p>
                  <p className="text-2xl font-bold text-yellow-600">{selectedOrg.member_count || 0}</p>
                </div>
                <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
                  <p className="text-sm text-gray-600">Products</p>
                  <p className="text-2xl font-bold text-purple-600">{selectedOrg.product_count || 0}</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <button
                onClick={handleCloseOverlay}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Close
              </button>
              <button
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 transition"
              >
                Edit
              </button>
            </div>
          </div>
        )}
      </AdminDetailOverlay>
    </div>
  );
}
