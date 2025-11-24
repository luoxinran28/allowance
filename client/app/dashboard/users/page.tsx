'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';

interface User {
  id: number;
  uid: string;
  email: string;
  tier?: string;
  status?: string;
  created_at?: string;
  [key: string]: any;
}

interface Team {
  id: number;
  name: string;
}

interface Organization {
  id: number;
  name: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [allOrgs, setAllOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<number | ''>('');
  const [selectedOrgFilter, setSelectedOrgFilter] = useState<number | ''>('');

  // Cache for user team/org associations
  const [userAssociations, setUserAssociations] = useState<
    Record<number, { teams: Team[]; orgs: Organization[] }>
  >({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      // Load users, teams, and organizations in parallel
      const [usersRes, teamsRes, orgsRes] = await Promise.all([
        apiClient.listUsers(),
        apiClient.listTeams(),
        apiClient.getUserOrganizations(),
      ]);

      const usersList = Array.isArray(usersRes.data)
        ? usersRes.data
        : usersRes.data?.data || [];

      const teamsList = Array.isArray(teamsRes.data)
        ? teamsRes.data
        : teamsRes.data?.data || [];

      const orgsList = Array.isArray(orgsRes.data?.data)
        ? orgsRes.data.data
        : Array.isArray(orgsRes.data)
          ? orgsRes.data
          : [];

      setUsers(usersList);
      setAllTeams(teamsList);
      setAllOrgs(orgsList);

      // Load associations for all users
      await loadUserAssociations(usersList);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load users');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadUserAssociations = async (usersList: User[]) => {
    const associations: Record<number, { teams: Team[]; orgs: Organization[] }> =
      {};

    // Try to load associations for each user (this may fail if endpoint doesn't exist)
    for (const user of usersList) {
      try {
        // Attempt to load user-specific teams and orgs
        // For now, we'll use empty arrays as fallback
        associations[user.id] = {
          teams: [],
          orgs: [],
        };
      } catch (err) {
        associations[user.id] = {
          teams: [],
          orgs: [],
        };
      }
    }

    setUserAssociations(associations);
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.uid.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesTeamFilter = true;
    let matchesOrgFilter = true;

    // If team filter is selected, check if user belongs to that team
    if (selectedTeamFilter) {
      const userTeams = userAssociations[user.id]?.teams || [];
      matchesTeamFilter = userTeams.some((t) => t.id === selectedTeamFilter);
    }

    // If org filter is selected, check if user belongs to that org
    if (selectedOrgFilter) {
      const userOrgs = userAssociations[user.id]?.orgs || [];
      matchesOrgFilter = userOrgs.some((o) => o.id === selectedOrgFilter);
    }

    return matchesSearch && matchesTeamFilter && matchesOrgFilter;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Users</h1>
          <p className="mt-1 text-gray-600">Browse and manage all system users</p>
        </div>
      </div>

      {/* Error Messages */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Search & Filters */}
      <div className="space-y-4 bg-white p-6 rounded-lg shadow">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search Users
          </label>
          <input
            type="text"
            placeholder="Search by email or UID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Team
            </label>
            <select
              value={selectedTeamFilter}
              onChange={(e) =>
                setSelectedTeamFilter(e.target.value ? Number(e.target.value) : '')
              }
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="">All Teams</option>
              {allTeams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Organization
            </label>
            <select
              value={selectedOrgFilter}
              onChange={(e) =>
                setSelectedOrgFilter(e.target.value ? Number(e.target.value) : '')
              }
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="">All Organizations</option>
              {allOrgs.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-sm text-gray-600">
          Showing {filteredUsers.length} of {users.length} users
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {filteredUsers.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-gray-500">
              {searchQuery || selectedTeamFilter || selectedOrgFilter
                ? 'No users match your filters'
                : 'No users found'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    UID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Tier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Teams
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Organizations
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.map((user) => {
                  const userTeams = userAssociations[user.id]?.teams || [];
                  const userOrgs = userAssociations[user.id]?.orgs || [];

                  return (
                    <tr key={user.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        <Link
                          href={`/admin/users/${user.id}`}
                          className="text-blue-600 hover:underline"
                        >
                          {user.email}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                        {user.uid}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 capitalize">
                        {user.tier || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            user.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : user.status === 'inactive'
                                ? 'bg-gray-100 text-gray-800'
                                : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {user.status || 'unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {user.created_at
                          ? new Date(user.created_at).toLocaleDateString()
                          : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {userTeams.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {userTeams.slice(0, 2).map((team) => (
                              <span
                                key={team.id}
                                className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800"
                              >
                                {team.name}
                              </span>
                            ))}
                            {userTeams.length > 2 && (
                              <span className="text-xs text-gray-600">
                                +{userTeams.length - 2} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {userOrgs.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {userOrgs.slice(0, 2).map((org) => (
                              <span
                                key={org.id}
                                className="inline-flex items-center rounded-full bg-purple-100 px-2 py-1 text-xs text-purple-800"
                              >
                                {org.name}
                              </span>
                            ))}
                            {userOrgs.length > 2 && (
                              <span className="text-xs text-gray-600">
                                +{userOrgs.length - 2} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
