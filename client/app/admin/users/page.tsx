'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { RoleTag } from '@/components/common/RoleTag';

interface User {
  id: number;
  uid: string;
  email: string;
  tier: string;
  status: string;
  created_at: string;
}

interface PaginatedResponse {
  data: User[];
  page: number;
  page_size: number;
  total: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadUsers();
  }, [page]);

  const loadUsers = async () => {
    try {
      setLoading(true);
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

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">User Management</h1>
        <p className="text-gray-600">Manage system users and assign roles</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search users by email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">UID</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Tier</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users
                    .filter(
                      (u) =>
                        !searchQuery ||
                        u.email.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((user) => (
                      <tr key={user.id} className="border-b hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">{user.email}</td>
                        <td className="px-6 py-4 text-sm font-mono text-gray-600">
                          {user.uid}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className="capitalize">{user.tier}</span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <RoleTag role={user.status} />
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <Link
                            href={`/admin/users/${user.id}`}
                            className="text-blue-600 hover:underline"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
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
