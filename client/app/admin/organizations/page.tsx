'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
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
  created_at: string;
}

interface CreateOrgFormData {
  name: string;
  description: string;
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
  const [success, setSuccess] = useState('');
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createFormData, setCreateFormData] = useState<CreateOrgFormData>({
    name: '',
    description: '',
  });

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiClient.listOrganizations(1, 100);
      
      // Handle both response formats:
      // 1. { organizations: [...], total: N }
      // 2. { data: [...], total: N }
      // 3. Array directly
      let orgsData: Organization[] = [];
      if (Array.isArray(response.data)) {
        orgsData = response.data;
      } else if (response.data?.organizations) {
        orgsData = response.data.organizations;
      } else if (response.data?.data) {
        orgsData = response.data.data;
      }
      
      setOrganizations(orgsData);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load organizations');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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

  const handleOpenOverlay = (org?: Organization) => {
    if (org && org.id > 0) {
      router.push(`?selected_id=${org.id}`);
    } else {
      // Create mode
      setIsCreating(true);
      setSelectedOrg(null);
    }
  };

  const handleCloseOverlay = () => {
    router.push('');
    setSelectedOrg(null);
    setIsCreating(false);
    setCreateFormData({ name: '', description: '' });
  };

  const handleCreateOrganization = async () => {
    try {
      if (!createFormData.name.trim()) {
        setError('Organization name is required');
        return;
      }
      setError('');
      setSuccess('');
      await apiClient.createOrganization(createFormData.name, createFormData.description);
      setSuccess('Organization created successfully');
      setCreateFormData({ name: '', description: '' });
      setIsCreating(false);
      await loadOrganizations();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create organization');
    }
  };

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Organizations</h1>
        <Button onClick={() => handleOpenOverlay()}>
          <Plus className="h-4 w-4 mr-2" />
          Create Organization
        </Button>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-100 p-4 text-sm text-green-800">
          {success}
        </div>
      )}

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

      {/* Organizations Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted border-b border-border">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Organization</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Description</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Created</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                  Loading organizations...
                </td>
              </tr>
            ) : organizations.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
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
                    {org.description || '-'}
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
              <div className="space-y-3 text-sm">
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

      {/* Create Organization Overlay */}
      <AdminDetailOverlay
        isOpen={isCreating}
        title="Create Organization"
        onClose={handleCloseOverlay}
        size="md"
      >
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Organization Name *
            </label>
            <input
              type="text"
              value={createFormData.name}
              onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
              placeholder="Enter organization name"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={createFormData.description}
              onChange={(e) => setCreateFormData({ ...createFormData, description: e.target.value })}
              placeholder="Enter organization description (optional)"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              rows={4}
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t">
            <button
              onClick={handleCloseOverlay}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateOrganization}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 transition"
            >
              Create
            </button>
          </div>
        </div>
      </AdminDetailOverlay>
    </div>
  );
}
