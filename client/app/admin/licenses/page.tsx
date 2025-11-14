'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/hooks/useAuth';
import { usePermission } from '@/lib/hooks/usePermission';
import { PaginationNav } from '@/components/common/PaginationNav';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import CreateLicenseModal from '@/components/admin/CreateLicenseModal';
import EditLicenseModal from '@/components/admin/EditLicenseModal';

interface License {
  id: number;
  user_id: number;
  user_email: string;
  product_upid: string;
  status: 'active' | 'pending' | 'expired' | 'revoked';
  created_at: string;
  expires_at: string;
  daily_limit: number | null;
  monthly_limit: number | null;
}

interface FilterState {
  status: 'all' | 'active' | 'pending' | 'expired' | 'revoked';
  search: string;
  sortBy: 'created_at' | 'expires_at' | 'user_email';
}

/**
 * Admin License Management Page
 * 
 * Displays all system licenses with CRUD operations:
 * - List licenses with pagination (20 per page)
 * - Filter by status, user email, product
 * - Create new licenses via modal
 * - Edit existing licenses
 * - Revoke licenses with confirmation
 * 
 * Requires: admin role with license_manage permission
 */
export default function AdminLicensesPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { hasPermission } = usePermission();

  // State
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination
  const [skip, setSkip] = useState(0);
  const [take] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  
  // Filtering
  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    search: '',
    sortBy: 'created_at',
  });

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLicense, setEditingLicense] = useState<License | null>(null);
  const [showConfirmRevoke, setShowConfirmRevoke] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<License | null>(null);

  // Fetch licenses
  useEffect(() => {
    if (!isAuthenticated || !hasPermission('license_manage')) {
      router.push('/dashboard');
      return;
    }

    const fetchLicenses = async () => {
      try {
        setLoading(true);
        setError(null);

        // Build query string
        const params = new URLSearchParams({
          skip: skip.toString(),
          take: take.toString(),
          ...(filters.status !== 'all' && { status: filters.status }),
          ...(filters.search && { search: filters.search }),
          sort_by: filters.sortBy,
        });

        const response = await (apiClient as any).client.get(`/admin/licenses?${params}`);
        setLicenses(response.data.licenses || []);
        setTotalCount(response.data.total_count || 0);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load licenses');
        console.error('Error fetching licenses:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLicenses();
  }, [skip, filters, isAuthenticated, hasPermission, router]);

  // Handle create license
  const handleCreateLicense = async (data: any) => {
    try {
      await (apiClient as any).client.post('/admin/licenses', data);
      setShowCreateModal(false);
      // Refresh list
      setSkip(0);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create license');
    }
  };

  // Handle update license
  const handleUpdateLicense = async (id: number, data: any) => {
    try {
      await (apiClient as any).client.put(`/admin/licenses/${id}`, data);
      setShowEditModal(false);
      setEditingLicense(null);
      // Refresh list
      setSkip(0);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update license');
    }
  };

  // Handle revoke license
  const handleRevokeLicense = async () => {
    if (!revokeTarget) return;

    try {
      await (apiClient as any).client.post(`/admin/licenses/${revokeTarget.id}/revoke`);
      setShowConfirmRevoke(false);
      setRevokeTarget(null);
      // Refresh list
      setSkip(0);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to revoke license');
    }
  };

  // Handle export to CSV
  const handleExportCSV = async () => {
    try {
      const response = await (apiClient as any).client.get('/admin/licenses/export', {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `licenses-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentElement?.removeChild(link);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to export licenses');
    }
  };

  if (!isAuthenticated) {
    return <div className="text-center py-8">Loading...</div>;
  }

  const pages = Math.ceil(totalCount / take);
  const currentPage = Math.floor(skip / take) + 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">License Management</h1>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-gray-200 text-gray-900 rounded hover:bg-gray-300"
          >
            Export CSV
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            + Create License
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded shadow space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => {
                setFilters({ ...filters, status: e.target.value as any });
                setSkip(0);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="expired">Expired</option>
              <option value="revoked">Revoked</option>
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search (Email/UPID)
            </label>
            <input
              type="text"
              placeholder="user@example.com"
              value={filters.search}
              onChange={(e) => {
                setFilters({ ...filters, search: e.target.value });
                setSkip(0);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            />
          </div>

          {/* Sort */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
            <select
              value={filters.sortBy}
              onChange={(e) => {
                setFilters({ ...filters, sortBy: e.target.value as any });
                setSkip(0);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            >
              <option value="created_at">Newest First</option>
              <option value="expires_at">Expiration Date</option>
              <option value="user_email">User Email</option>
            </select>
          </div>

          {/* Results Count */}
          <div className="flex items-end">
            <div className="text-sm text-gray-600">
              Showing <span className="font-semibold">{licenses.length}</span> of{' '}
              <span className="font-semibold">{totalCount}</span> licenses
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8 text-gray-600">Loading licenses...</div>
      )}

      {/* License Table */}
      {!loading && (
        <>
          {licenses.length > 0 ? (
            <div className="bg-white rounded shadow overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">User</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Product</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Status</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Expires</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Limits</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {licenses.map((license) => (
                    <tr key={license.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">{license.user_email}</div>
                          <div className="text-gray-500">ID: {license.user_id}</div>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <code className="px-2 py-1 bg-gray-100 rounded text-xs">
                          {license.product_upid}
                        </code>
                      </td>
                      <td className="px-6 py-3">
                        <StatusBadge status={license.status} />
                      </td>
                      <td className="px-6 py-3 text-sm">
                        {new Date(license.expires_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3 text-sm">
                        {license.daily_limit || license.monthly_limit ? (
                          <div>
                            {license.daily_limit && <div>Day: {license.daily_limit}</div>}
                            {license.monthly_limit && <div>Month: {license.monthly_limit}</div>}
                          </div>
                        ) : (
                          <span className="text-gray-500">Unlimited</span>
                        )}
                      </td>
                      <td className="px-6 py-3 space-x-2">
                        <button
                          onClick={() => {
                            setEditingLicense(license);
                            setShowEditModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                        >
                          Edit
                        </button>
                        {license.status !== 'revoked' && (
                          <button
                            onClick={() => {
                              setRevokeTarget(license);
                              setShowConfirmRevoke(true);
                            }}
                            className="text-red-600 hover:text-red-800 text-xs font-medium"
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-600">
              No licenses found. Create one to get started.
            </div>
          )}

          {/* Pagination */}
          {pages > 1 && (
            <PaginationNav
              page={currentPage}
              pageSize={take}
              total={totalCount}
              onPageChange={(page) => setSkip((page - 1) * take)}
            />
          )}
        </>
      )}

      {/* Modals */}
      <CreateLicenseModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateLicense}
      />

      {editingLicense && (
        <EditLicenseModal
          open={showEditModal}
          license={editingLicense}
          onClose={() => {
            setShowEditModal(false);
            setEditingLicense(null);
          }}
          onUpdate={handleUpdateLicense}
        />
      )}

      <ConfirmDialog
        isOpen={showConfirmRevoke}
        title="Revoke License"
        message={`Are you sure you want to revoke the license for ${revokeTarget?.user_email}?`}
        confirmText="Revoke"
        cancelText="Cancel"
        onConfirm={handleRevokeLicense}
        onCancel={() => {
          setShowConfirmRevoke(false);
          setRevokeTarget(null);
        }}
        isDangerous
      />
    </div>
  );
}
