'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { usePermission } from '@/lib/hooks/usePermission';
import { PaginationNav } from '@/components/common/PaginationNav';

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

export default function AdminTeamsPage() {
  const { isAdmin } = usePermission();
  const [teams, setTeams] = useState<Team[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrgId, setSelectedOrgId] = useState<number | ''>('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!isAdmin()) {
      setError('You do not have permission to access this page');
      return;
    }
    loadData();
  }, [page, selectedOrgId, isAdmin]);

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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Team Management</h1>
        <p className="mt-1 text-gray-600">Manage teams, members, and assign team leaders</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
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
    </div>
  );
}
