'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { usePermission } from '@/lib/hooks/usePermission';
import { PaginationNav } from '@/components/common/PaginationNav';
import { AdminDetailOverlay } from '@/components/admin/AdminDetailOverlay';
import { Plus } from 'lucide-react';

interface Team {
  id: number;
  group_id: string;
  organization_id: number;
  name: string;
  description?: string;
  created_by?: number;
  created_at?: string;
  [key: string]: any;
}

interface Organization {
  id: number;
  name: string;
}

interface CreateTeamFormData {
  name: string;
  description: string;
  organizationId: number | '';
}

export default function AdminTeamsPage() {
  const { isAdmin } = usePermission();
  const isUserAdmin = isAdmin();
  const [teams, setTeams] = useState<Team[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedOrgId, setSelectedOrgId] = useState<number | ''>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Create team overlay state
  const [isCreating, setIsCreating] = useState(false);
  const [createFormData, setCreateFormData] = useState<CreateTeamFormData>({
    name: '',
    description: '',
    organizationId: '',
  });
  useEffect(() => {
    if (!isUserAdmin) {
      setError('You do not have permission to access this page');
      return;
    }
    loadData();
  }, [page, selectedOrgId, isUserAdmin]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      // Load organizations for filter dropdown
      const orgsResponse = await apiClient.listOrganizations(1, 1000);
      const orgsList = Array.isArray(orgsResponse.data?.organizations)
        ? orgsResponse.data.organizations
        : Array.isArray(orgsResponse.data)
          ? orgsResponse.data
          : [];
      setOrganizations(orgsList);

      // Load all teams
      const teamsResponse = await apiClient.listTeams();
      let allTeams = Array.isArray(teamsResponse.data) ? teamsResponse.data : [];

      // Filter by organization if selected
      if (selectedOrgId !== '') {
        allTeams = allTeams.filter((t: Team) => t.organization_id === selectedOrgId);
      }

      // Filter by search query if provided
      if (searchQuery) {
        allTeams = allTeams.filter((t: Team) =>
          t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.group_id.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      // Paginate
      const paginated = allTeams.slice((page - 1) * pageSize, page * pageSize);
      setTeams(paginated);
      setTotal(allTeams.length);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (orgId: number | '') => {
    setSelectedOrgId(orgId);
    setPage(1);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPage(1);
  };

  const handleCloseOverlay = () => {
    setIsCreating(false);
    setCreateFormData({
      name: '',
      description: '',
      organizationId: '',
    });
    setError('');
  };

  const handleCreateTeam = async () => {
    try {
      if (!createFormData.name.trim()) {
        setError('Team name is required');
        return;
      }
      if (createFormData.organizationId === '') {
        setError('Organization is required');
        return;
      }
      setError('');
      setSuccess('');

      await apiClient.createTeam(
        createFormData.name,
        createFormData.description || undefined,
        createFormData.organizationId as number
      );

      setSuccess('Team created successfully');
      handleCloseOverlay();
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create team');
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  if (!isAdmin()) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-800">
          You do not have permission to access this page. Only administrators can manage teams.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Team Management</h1>
          <p className="mt-1 text-gray-600">Manage teams, members, and assign team leaders</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 transition"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Team
        </button>
      </div>

      {/* Error/Success Messages */}
      {error && !isCreating && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Organization Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Organization
            </label>
            <select
              value={selectedOrgId}
              onChange={(e) => handleFilterChange(e.target.value ? Number(e.target.value) : '')}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="">All Organizations</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search Bar */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Teams
            </label>
            <input
              type="text"
              placeholder="Search by name or team ID..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
        </div>
      </div>

      {/* Teams Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : teams.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-gray-500">
              {total === 0 ? 'No teams found' : 'No teams on this page'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Team Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Team ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Organization
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {teams.map((team) => {
                  const org = organizations.find((o) => o.id === team.organization_id);
                  return (
                    <tr key={team.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {team.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                        {team.group_id}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {org?.name || `Org #${team.organization_id}`}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {team.created_at
                          ? new Date(team.created_at).toLocaleDateString()
                          : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm space-x-3 flex">
                        <Link
                          href={`/dashboard/admin/teams/${team.id}`}
                          className="text-blue-600 hover:text-blue-800 font-medium transition"
                          title="View team details"
                        >
                          👁️
                        </Link>
                        <Link
                          href={`/dashboard/admin/teams/${team.id}/members`}
                          className="text-indigo-600 hover:text-indigo-800 font-medium transition"
                          title="Manage members"
                        >
                          👥
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <PaginationNav
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
        />
      )}

      {/* Create Team Overlay */}
      <AdminDetailOverlay
        isOpen={isCreating}
        title="Create Team"
        onClose={handleCloseOverlay}
        size="md"
      >
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Team Name *
            </label>
            <input
              type="text"
              value={createFormData.name}
              onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
              placeholder="Enter team name"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Organization *
            </label>
            <select
              value={createFormData.organizationId}
              onChange={(e) => setCreateFormData({ ...createFormData, organizationId: e.target.value === '' ? '' : Number(e.target.value) })}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="">Select Organization</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={createFormData.description}
              onChange={(e) => setCreateFormData({ ...createFormData, description: e.target.value })}
              placeholder="Enter team description"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              rows={3}
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
              onClick={handleCreateTeam}
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
