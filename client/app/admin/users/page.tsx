'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { RoleTag } from '@/components/common/RoleTag';
import { StatusBadge } from '@/components/common/StatusBadge';
import { PaginationNav } from '@/components/common/PaginationNav';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { AdminDetailOverlay } from '@/components/admin/AdminDetailOverlay';

interface User {
  id: number;
  uid: string;
  email: string;
  tier: string;
  status: string;
  created_at: string;
  roles?: string[];
}

interface PaginatedResponse {
  data: User[];
  page: number;
  page_size: number;
  total: number;
}

const AVAILABLE_ROLES = [
  { code: 'admin', label: 'Administrator' },
  { code: 'team_leader', label: 'Team Leader' },
  { code: 'standard_employee', label: 'Standard Employee' },
  { code: 'free_user', label: 'Free User' },
];

export default function AdminUsersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedUserId = searchParams.get('selected_id') ? parseInt(searchParams.get('selected_id')!) : null;

  const [users, setUsers] = useState<User[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Detail overlay state
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState('');

  // Confirm dialog state
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'assign' | 'remove';
    userId?: number;
    role?: string;
  }>({ type: 'assign' });

  useEffect(() => {
    loadUsers();
  }, [page]);

  useEffect(() => {
    // Sync selected user when selectedUserId changes
    if (selectedUserId && users.length > 0) {
      const user = users.find(u => u.id === selectedUserId);
      if (user) {
        setSelectedUser(user);
        setSelectedRole(user.roles?.[0] || 'free_user');
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

  const handleOpenRoleModal = (user: User) => {
    router.push(`?selected_id=${user.id}`);
  };

  const handleCloseOverlay = () => {
    router.push('');
    setSelectedUser(null);
    setSelectedRole('');
  };

  const handleRemoveRole = (userId: number, role: string) => {
    setConfirmAction({ type: 'remove', userId, role });
    setShowConfirm(true);
  };

  const confirmRoleChange = async () => {
    try {
      setError('');
      setSuccess('');

      if (confirmAction.type === 'assign' && confirmAction.userId && confirmAction.role) {
        await apiClient.assignRole(confirmAction.userId, confirmAction.role);
        setSuccess('Role assigned successfully');
      } else if (confirmAction.type === 'remove' && confirmAction.userId && confirmAction.role) {
        await apiClient.removeRole(confirmAction.userId, confirmAction.role);
        setSuccess('Role removed successfully');
      }

      handleCloseOverlay();
      await loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update role');
    } finally {
      setShowConfirm(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  const filteredUsers = users.filter(
    (u) => !searchQuery || u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2 text-gray-900">User Management</h1>
        <p className="text-gray-600">Manage system users and assign roles</p>
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
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-gray-500">No users found</p>
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
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-gray-50 transition"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                      {user.uid}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <StatusBadge status={user.tier} />
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <RoleTag role={user.roles?.[0] || 'free_user'} />
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <StatusBadge status={user.status} />
                    </td>
                    <td className="px-6 py-4 text-sm space-x-3 flex">
                      <button
                        onClick={() => handleOpenRoleModal(user)}
                        className="text-blue-600 hover:text-blue-800 font-medium transition"
                        title="Assign role"
                      >
                        👤
                      </button>
                    </td>
                  </tr>
                ))}
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

      {/* Role Assignment Overlay */}
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
              <p className="text-gray-900">{selectedUser?.tier}</p>
            </div>
            <div>
              <p className="text-gray-600 font-medium">Status</p>
              <p className="text-gray-900">{selectedUser?.status}</p>
            </div>
          </div>

          <div className="border-t border-gray-200" />

          {/* Role Assignment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Role
            </label>
            <div className="space-y-2">
              {AVAILABLE_ROLES.map((role) => (
                <label
                  key={role.code}
                  className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-blue-50 transition"
                >
                  <input
                    type="radio"
                    name="role"
                    value={role.code}
                    checked={selectedRole === role.code}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div className="ml-3">
                    <p className="font-medium text-gray-900">{role.label}</p>
                    <p className="text-xs text-gray-500">{role.code}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Current Roles */}
          {selectedUser?.roles && selectedUser.roles.length > 0 && (
            <div className="pt-4 border-t">
              <p className="text-sm font-medium text-gray-700 mb-2">Current Roles</p>
              <div className="flex flex-wrap gap-2">
                {selectedUser.roles.map((role) => (
                  <div
                    key={role}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-sm text-gray-800"
                  >
                    <span>{role}</span>
                    <button
                      onClick={() => handleRemoveRole(selectedUser.id, role)}
                      className="text-red-600 hover:text-red-800 font-bold"
                      title="Remove role"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              onClick={handleCloseOverlay}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (!selectedUser || !selectedRole) return;
                setConfirmAction({ type: 'assign', userId: selectedUser.id, role: selectedRole });
                setShowConfirm(true);
              }}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 transition"
            >
              Assign
            </button>
          </div>
        </div>
      </AdminDetailOverlay>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={showConfirm}
        title={confirmAction.type === 'assign' ? 'Assign Role' : 'Remove Role'}
        message={
          confirmAction.type === 'assign'
            ? `Are you sure you want to assign the ${confirmAction.role} role to this user?`
            : `Are you sure you want to remove the ${confirmAction.role} role from this user?`
        }
        confirmText={confirmAction.type === 'assign' ? 'Assign' : 'Remove'}
        isDangerous={confirmAction.type === 'remove'}
        onConfirm={confirmRoleChange}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}
