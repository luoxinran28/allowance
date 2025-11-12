'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { User, UserLicense } from '@/lib/types';

interface DashboardData {
  user: User | null;
  licenses: UserLicense[];
  teamsCount: number;
  orgsCount: number;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>({
    user: null,
    licenses: [],
    teamsCount: 0,
    orgsCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError('');

        // Fetch all required data in parallel
        const [profileRes, licensesRes, teamsRes, orgsRes] = await Promise.all([
          apiClient.getUserProfile(),
          apiClient.getUserLicenses(),
          apiClient.listTeams(),
          apiClient.getUserOrganizations(),
        ]);

        setData({
          user: profileRes.data,
          licenses: licensesRes.data || [],
          teamsCount: Array.isArray(teamsRes.data) ? teamsRes.data.length : 0,
          orgsCount: Array.isArray(orgsRes.data?.data) ? orgsRes.data.data.length : 0,
        });
      } catch (err: any) {
        setError(
          err.response?.data?.error || 
          'Failed to load dashboard data'
        );
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Welcome back, {data.user?.email?.split('@')[0]}!</h1>
        <p className="text-gray-600">Here's an overview of your account</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Account Tier</h3>
          <p className="text-3xl font-bold text-blue-600 capitalize">{data.user?.tier}</p>
          <p className="text-xs text-gray-500 mt-2">
            Status: <span className="font-semibold capitalize">{data.user?.status}</span>
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Active Licenses</h3>
          <p className="text-3xl font-bold text-green-600">
            {data.licenses.filter(l => !l.revoked_at && new Date(l.expires_at) > new Date()).length}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Total: {data.licenses.length}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Teams</h3>
          <p className="text-3xl font-bold text-purple-600">{data.teamsCount}</p>
          <Link
            href="/dashboard/teams"
            className="text-xs text-blue-600 hover:underline mt-2 inline-block"
          >
            Manage Teams →
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Organizations</h3>
          <p className="text-3xl font-bold text-orange-600">{data.orgsCount}</p>
          <Link
            href="/dashboard/organizations"
            className="text-xs text-blue-600 hover:underline mt-2 inline-block"
          >
            Manage Orgs →
          </Link>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Generate License</h3>
          <p className="text-blue-700 text-sm mb-4">
            Create a new license for your products
          </p>
          <Link
            href="/dashboard/products"
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
          >
            Go to Products
          </Link>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
          <h3 className="text-lg font-semibold text-green-900 mb-2">Create Team</h3>
          <p className="text-green-700 text-sm mb-4">
            Collaborate with team members on licenses
          </p>
          <Link
            href="/dashboard/teams"
            className="inline-block bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm"
          >
            Create Team
          </Link>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
          <h3 className="text-lg font-semibold text-purple-900 mb-2">View Profile</h3>
          <p className="text-purple-700 text-sm mb-4">
            Manage your account settings and preferences
          </p>
          <Link
            href="/dashboard/profile"
            className="inline-block bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 text-sm"
          >
            View Profile
          </Link>
        </div>

        <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-6 border border-orange-200">
          <h3 className="text-lg font-semibold text-orange-900 mb-2">Billing</h3>
          <p className="text-orange-700 text-sm mb-4">
            View subscription and billing information
          </p>
          <Link
            href="/dashboard/billing"
            className="inline-block bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 text-sm"
          >
            Billing Info
          </Link>
        </div>
      </div>

      {/* Recent Licenses */}
      {data.licenses.length > 0 && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Recent Licenses</h2>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">License Key</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Expires</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.licenses.slice(0, 5).map((license) => {
                    const isExpired = new Date(license.expires_at) < new Date();
                    const isRevoked = !!license.revoked_at;

                    return (
                      <tr key={license.id} className="border-b hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-mono text-gray-900">
                          {license.license_key.substring(0, 20)}...
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {new Date(license.expires_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            isRevoked
                              ? 'bg-red-100 text-red-800'
                              : isExpired
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {isRevoked ? 'Revoked' : isExpired ? 'Expired' : 'Active'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {data.licenses.length > 5 && (
              <div className="px-6 py-4 border-t bg-gray-50">
                <Link
                  href="/dashboard/products"
                  className="text-blue-600 hover:underline text-sm font-medium"
                >
                  View all licenses →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
