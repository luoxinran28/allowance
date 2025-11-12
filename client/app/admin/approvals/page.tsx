'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { StatusBadge } from '@/components/common/StatusBadge';

interface Approval {
  id: number;
  user_id: number;
  type: string;
  status: string;
  created_at: string;
  [key: string]: any;
}

interface PaginatedResponse {
  data: Approval[];
  page: number;
  page_size: number;
  total: number;
}

export default function AdminApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rejectConfirm, setRejectConfirm] = useState<{ show: boolean; approvalId?: number }>({
    show: false,
  });
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    loadApprovals();
  }, [page]);

  const loadApprovals = async () => {
    try {
      setLoading(true);
      const response = await apiClient.listApprovals(page, pageSize);
      const data: PaginatedResponse = response.data;
      setApprovals(data.data || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load approvals');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (approvalId: number) => {
    try {
      await apiClient.approveRequest(approvalId);
      await loadApprovals();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to approve request');
    }
  };

  const handleReject = async () => {
    if (!rejectConfirm.approvalId) return;

    try {
      await apiClient.rejectRequest(rejectConfirm.approvalId, rejectReason);
      setRejectConfirm({ show: false });
      setRejectReason('');
      await loadApprovals();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reject request');
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Approval Requests</h1>
        <p className="text-gray-600">Review and approve pending user requests</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : approvals.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No pending approvals</h3>
          <p className="text-gray-600">All approval requests have been processed</p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {approvals.map((approval) => (
              <div
                key={approval.id}
                className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">
                        {approval.type.replace(/_/g, ' ').toUpperCase()}
                      </h3>
                      <StatusBadge
                        status={approval.status}
                        variant={
                          approval.status === 'approved'
                            ? 'success'
                            : approval.status === 'pending'
                            ? 'pending'
                            : 'error'
                        }
                      />
                    </div>
                    <p className="text-gray-600 text-sm">
                      User ID: {approval.user_id} · Created{' '}
                      {new Date(approval.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  {approval.status === 'pending' && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleApprove(approval.id)}
                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => setRejectConfirm({ show: true, approvalId: approval.id })}
                        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 text-sm"
                      >
                        Reject
                      </button>
                    </div>
                  )}
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

      {/* Reject Modal */}
      {rejectConfirm.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 p-6">
            <h2 className="text-lg font-bold mb-4 text-gray-900">Reject Approval Request</h2>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason (optional)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              rows={3}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setRejectConfirm({ show: false })}
                className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-100 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 text-sm font-medium"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
