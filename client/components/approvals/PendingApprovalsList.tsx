import React, { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

interface Approval {
  id: number;
  user_id: number;
  license_id: number;
  upid: string;
  user_email: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  approved_at?: string;
}

interface PendingApprovalsListProps {
  teamId?: number;
}

/**
 * PendingApprovalsList Component
 * Displays all pending license approval requests for a team
 * 
 * Usage:
 * <PendingApprovalsList teamId={1} />
 */
export const PendingApprovalsList: React.FC<PendingApprovalsListProps> = ({
  teamId,
}) => {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  useEffect(() => {
    fetchApprovals();
  }, [teamId, filter]);

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getPendingApprovals(teamId || 0);
      let items = response.data || [];
      
      // Filter by status if not showing all
      if (filter !== 'all') {
        items = items.filter((a: Approval) => a.status === filter);
      }
      
      setApprovals(items);
      setError(null);
    } catch (err) {
      setError('Failed to fetch approvals');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'approved':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'rejected':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return <div className="p-4 text-center text-gray-500">Loading approvals...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
        {error}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">License Approvals</h3>
          <button
            onClick={fetchApprovals}
            className="text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded transition"
          >
            Refresh
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 rounded font-medium text-sm transition ${
                filter === tab
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {approvals.length === 0 ? (
        <div className="p-6 text-center text-gray-500">
          No {filter === 'all' ? '' : filter} approvals found
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {approvals.map((approval) => (
            <div
              key={approval.id}
              className={`p-4 border-l-4 ${getStatusColor(approval.status)}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-semibold text-base">{approval.upid}</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(approval.status)}`}>
                      {approval.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    User: <span className="font-medium">{approval.user_email}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Requested: {new Date(approval.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
