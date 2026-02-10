'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { StatusBadge } from '@/components/common/StatusBadge';
import { PaginationNav } from '@/components/common/PaginationNav';
import { AdminDetailOverlay } from '@/components/admin/AdminDetailOverlay';
import { Plus } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface User {
  id: number;
  uid: string;
  email: string;
  tier: string;
  status: string;
  created_at: string;
  organization_id?: number;
  organization_name?: string;
  team_ids?: number[];
  team_names?: string[];
}

interface Organization {
  id: number;
  name: string;
}

interface PaginatedResponse {
  data: User[];
  page: number;
  page_size: number;
  total: number;
}

interface CreateUserFormData {
  email: string;
  password: string;
  tier: string;
  organizationId: number | '';
  activate: boolean;
}

const AVAILABLE_TIERS = [
  { code: 'free', label: 'Free' },
  { code: 'standard', label: 'Standard' },
  { code: 'premium', label: 'Premium' },
  { code: 'allstar', label: 'Allstar (Admin)' },
];

export default function AdminUsersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedUserId = searchParams.get('selected_id') ? parseInt(searchParams.get('selected_id')!) : null;

  const [users, setUsers] = useState<User[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Detail overlay state
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Create user overlay state
  const [isCreating, setIsCreating] = useState(false);
  const [createFormData, setCreateFormData] = useState<CreateUserFormData>({
    email: '',
    password: '',
    tier: 'free',
    organizationId: '',
    activate: true,
  });

  useEffect(() => {
    loadUsers();
    loadOrganizations();
  }, [page]);

  useEffect(() => {
    // Sync selected user when selectedUserId changes
    if (selectedUserId && users.length > 0) {
      const user = users.find(u => u.id === selectedUserId);
      if (user) {
        setSelectedUser(user);
      }
    } else {
      setSelectedUser(null);
    }
  }, [selectedUserId, users]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiClient.listUsers(page, pageSize);
      const data: PaginatedResponse = response.data;
      setUsers(data.data || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadOrganizations = async () => {
    try {
      const response = await apiClient.listOrganizations(1, 1000);
      let orgsData: Organization[] = [];
      if (Array.isArray(response.data)) {
        orgsData = response.data;
      } else if (response.data?.organizations) {
        orgsData = response.data.organizations;
      } else if (response.data?.data) {
        orgsData = response.data.data;
      }
      setOrganizations(orgsData);
    } catch (err) {
      console.error('Failed to load organizations:', err);
    }
  };

  const handleOpenUserDetail = (user: User) => {
    router.push(`?selected_id=${user.id}`);
  };

  const handleCloseOverlay = () => {
    router.push('');
    setSelectedUser(null);
    setIsCreating(false);
    setCreateFormData({
      email: '',
      password: '',
      tier: 'free',
      organizationId: '',
      activate: true,
    });
  };

  const handleCreateUser = async () => {
    try {
      if (!createFormData.email.trim() || !createFormData.password.trim()) {
        setError('Email and password are required');
        return;
      }
      setError('');
      setSuccess('');
      
      await apiClient.adminCreateUser(
        createFormData.email,
        createFormData.password,
        createFormData.tier,
        createFormData.organizationId === '' ? undefined : createFormData.organizationId,
        createFormData.activate
      );
      
      setSuccess('User created successfully');
      handleCloseOverlay();
      await loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create user');
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  const filteredUsers = users.filter(
    (u) => !searchQuery || u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-gray-900">User Management</h1>
          <p className="text-gray-600">Manage system users and tiers</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 transition"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create User
        </button>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      {/* Search */}
      <div>
        <input
          type="text"
          placeholder="Search users by email..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(1);
          }}
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center items-center py-12 border border-gray-200 rounded-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="py-12 text-center border border-gray-200 rounded-lg">
          <p className="text-gray-500">No users found</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Email</TableHead>
              <TableHead>UID</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Teams</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow
                key={user.id}
                className="cursor-pointer"
                onClick={() => handleOpenUserDetail(user)}
              >
                <TableCell className="font-medium text-gray-900">
                  {user.email}
                </TableCell>
                <TableCell className="text-gray-600 font-mono">
                  {user.uid}
                </TableCell>
                <TableCell>
                  <StatusBadge status={user.tier} />
                </TableCell>
                <TableCell>
                  <StatusBadge status={user.status} />
                </TableCell>
                <TableCell className="text-gray-600">
                  {user.organization_name || '-'}
                </TableCell>
                <TableCell>
                  {user.team_names && user.team_names.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {user.team_names.map((team, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {team}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <PaginationNav
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
        />
      )}

      {/* User Detail Overlay */}
      <AdminDetailOverlay
        isOpen={!!selectedUser}
        title={`User Details - ${selectedUser?.email}`}
        onClose={handleCloseOverlay}
        size="md"
      >
        <div className="p-6 space-y-6">
          {/* User Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600 font-medium">Email</p>
              <p className="text-gray-900 font-mono">{selectedUser?.email}</p>
            </div>
            <div>
              <p className="text-gray-600 font-medium">UID</p>
              <p className="text-gray-900 font-mono">{selectedUser?.uid}</p>
            </div>
            <div>
              <p className="text-gray-600 font-medium">Tier</p>
              <StatusBadge status={selectedUser?.tier || 'free'} />
            </div>
            <div>
              <p className="text-gray-600 font-medium">Status</p>
              <StatusBadge status={selectedUser?.status || 'inactive'} />
            </div>
            <div>
              <p className="text-gray-600 font-medium">Organization</p>
              <p className="text-gray-900">{selectedUser?.organization_name || 'Not Assigned'}</p>
            </div>
            <div>
              <p className="text-gray-600 font-medium">Teams</p>
              {selectedUser?.team_names && selectedUser.team_names.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {selectedUser.team_names.map((team, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {team}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">Not Assigned</p>
              )}
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
          </div>
        </div>
      </AdminDetailOverlay>

      {/* Create User Overlay */}
      <AdminDetailOverlay
        isOpen={isCreating}
        title="Create User"
        onClose={handleCloseOverlay}
        size="md"
      >
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email *
            </label>
            <input
              type="email"
              value={createFormData.email}
              onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })}
              placeholder="Enter email address"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password *
            </label>
            <input
              type="password"
              value={createFormData.password}
              onChange={(e) => setCreateFormData({ ...createFormData, password: e.target.value })}
              placeholder="Enter password"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tier
            </label>
            <select
              value={createFormData.tier}
              onChange={(e) => setCreateFormData({ ...createFormData, tier: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              {AVAILABLE_TIERS.map((tier) => (
                <option key={tier.code} value={tier.code}>
                  {tier.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Organization (Optional)
            </label>
            <select
              value={createFormData.organizationId}
              onChange={(e) => setCreateFormData({ ...createFormData, organizationId: e.target.value === '' ? '' : Number(e.target.value) })}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="">Not Assigned</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="activate"
              checked={createFormData.activate}
              onChange={(e) => setCreateFormData({ ...createFormData, activate: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <label htmlFor="activate" className="text-sm font-medium text-gray-700">
              Activate user immediately (skip email verification)
            </label>
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
              onClick={handleCreateUser}
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
