'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';

interface Organization {
  id: string;
  name: string;
  created_at: string;
}

interface PaginatedResponse {
  data: Organization[];
  page: number;
  page_size: number;
  total: number;
}

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadOrganizations();
  }, [page, searchQuery]);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      let response;

      if (searchQuery.trim()) {
        response = await apiClient.searchOrganizations(searchQuery, page, pageSize);
      } else {
        response = await apiClient.getUserOrganizations(page, pageSize);
      }

      const data: PaginatedResponse = response.data;
      setOrgs(data.data || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Organization name is required');
      return;
    }

    try {
      setIsCreating(true);
      await apiClient.createOrganization(formData.name, formData.description);
      setFormData({ name: '', description: '' });
      setShowCreateForm(false);
      setPage(1);
      await loadOrganizations();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create organization');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Organizations</h1>
          <p className="text-gray-600">Manage your organizations and team structures</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          {showCreateForm ? 'Cancel' : '+ Create Organization'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {showCreateForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Create New Organization</h2>
          <form onSubmit={handleCreateOrg} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Organization Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Acme Corporation"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="What does this organization do?"
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isCreating}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                {isCreating ? 'Creating...' : 'Create Organization'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search organizations..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : orgs.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No organizations</h3>
          <p className="text-gray-600 mb-6">
            {searchQuery ? 'No organizations match your search' : 'Create your first organization to get started'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Create Organization
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-6">
            {orgs.map((org) => (
              <div
                key={org.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition p-6"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{org.name}</h3>
                    <p className="text-gray-600 text-sm mt-1">
                      Created {new Date(org.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Link
                    href={`/dashboard/organizations/${org.id}`}
                    className="bg-blue-100 text-blue-700 px-4 py-2 rounded hover:bg-blue-200 text-sm font-medium"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50 mt-6 rounded-lg">
              <div className="text-sm text-gray-600">
                Page {page} of {totalPages} · Showing {(page - 1) * pageSize + 1}-
                {Math.min(page * pageSize, total)} of {total}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                  className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
