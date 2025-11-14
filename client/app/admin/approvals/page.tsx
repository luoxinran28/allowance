'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

interface Approval {
  id: number;
  user_id: number;
  user_email?: string;
  type: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  approved_at?: string;
  product_upid?: string;
  justification?: string;
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
  
  // Filtering
  const [approvalType, setApprovalType] = useState<'all' | 'license' | 'other'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  
  // Selected approval details
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  
  // Modal states
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [approvalToReject, setApprovalToReject] = useState<Approval | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadApprovals();
  }, [page, statusFilter]);

  const loadApprovals = async () => {
    try {
      setLoading(true);
      const response = await (apiClient as any).client.get(
        `/admin/approvals?skip=${(page - 1) * pageSize}&take=${pageSize}&status=${statusFilter}`
      );
      const data: PaginatedResponse = response.data;
      setApprovals(data.data || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load approvals');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (approval: Approval) => {
    try {
      setActionLoading(true);
      await (apiClient as any).client.post(`/admin/approvals/${approval.id}/approve`);
      setSelectedApproval(null);
      await loadApprovals();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to approve request');
    } finally {
      setActionLoading(false);
    }
  };

  const initiateReject = (approval: Approval) => {
    setApprovalToReject(approval);
    setShowRejectDialog(true);
  };

  const handleReject = async () => {
    if (!approvalToReject) return;

    try {
      setActionLoading(true);
      await (apiClient as any).client.post(`/admin/approvals/${approvalToReject.id}/reject`, {
        reason: rejectReason,
      });
      setShowRejectDialog(false);
      setRejectReason('');
      setApprovalToReject(null);
      setSelectedApproval(null);
      await loadApprovals();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reject request');
    } finally {
      setActionLoading(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  // Filter approvals by type
  const filteredApprovals = approvals.filter((a) => {
    if (approvalType === 'all') return true;
    if (approvalType === 'license') return a.type === 'license_request';
    return a.type !== 'license_request';
  });

  const isLicenseRequest = (approval: Approval) => {
    return approval.type === 'license_request';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Approval Requests</h1>
        <p className="text-gray-600 mt-1">Review and approve pending user requests</p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded shadow space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Request Type</label>
            <select
              value={approvalType}
              onChange={(e) => {
                setApprovalType(e.target.value as any);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            >
              <option value="all">All Types</option>
              <option value="license">License Requests</option>
              <option value="other">Other Requests</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Results Count */}
          <div className="flex items-end">
            <div className="text-sm text-gray-600">
              <span className="font-semibold">{filteredApprovals.length}</span> of{' '}
              <span className="font-semibold">{total}</span> requests
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12 text-gray-600">Loading approvals...</div>
      )}

      {/* Approval List */}
      {!loading && (
        <>
          {filteredApprovals.length > 0 ? (
            <div className="space-y-4">
              {filteredApprovals.map((approval) => (
                <div
                  key={approval.id}
                  className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => setSelectedApproval(approval)}
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-gray-900">
                            {isLicenseRequest(approval) ? '📋 License Request' : 'Request'}
                          </h3>
                          <StatusBadge status={approval.status} />
                        </div>
                        <p className="text-sm text-gray-600">
                          User: <span className="font-medium">{approval.user_email || `ID ${approval.user_id}`}</span>
                        </p>
                      </div>
                      {approval.status === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApprove(approval);
                            }}
                            disabled={actionLoading}
                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              initiateReject(approval);
                            }}
                            disabled={actionLoading}
                            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>

                    {/* License-specific details */}
                    {isLicenseRequest(approval) && (
                      <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200 space-y-2">
                        {approval.product_upid && (
                          <div>
                            <span className="text-xs text-gray-600">Product:</span>
                            <code className="ml-2 text-sm bg-white px-2 py-1 rounded font-mono">
                              {approval.product_upid}
                            </code>
                          </div>
                        )}
                        {approval.justification && (
                          <div>
                            <span className="text-xs text-gray-600">Justification:</span>
                            <p className="text-sm text-gray-700 mt-1">{approval.justification}</p>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="mt-3 flex justify-between items-center">
                      <div className="text-xs text-gray-500">
                        Requested: {new Date(approval.created_at).toLocaleString()}
                        {approval.approved_at && (
                          <span>
                            · Approved: {new Date(approval.approved_at).toLocaleString()}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedApproval(approval);
                        }}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <div className="text-4xl mb-2">✓</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No approvals</h3>
              <p className="text-gray-600">
                {statusFilter === 'pending'
                  ? 'All approval requests have been processed!'
                  : 'No requests match the selected filters'}
              </p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border rounded-lg">
              <div className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-50 text-sm"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-50 text-sm"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Reject Dialog */}
      <ConfirmDialog
        isOpen={showRejectDialog}
        title="Reject Approval Request"
        message={`Are you sure you want to reject this ${
          approvalToReject && isLicenseRequest(approvalToReject) ? 'license' : ''
        } request?`}
        confirmText="Reject"
        cancelText="Cancel"
        isDangerous
        onConfirm={handleReject}
        onCancel={() => {
          setShowRejectDialog(false);
          setRejectReason('');
          setApprovalToReject(null);
        }}
        customContent={
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Rejection Reason</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter the reason for rejection..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        }
      />

      {/* Details Sidebar */}
      {selectedApproval && (
        <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-lg overflow-y-auto z-40 border-l">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
            <h2 className="text-xl font-bold">Request Details</h2>
            <button
              onClick={() => setSelectedApproval(null)}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          {/* Details Content */}
          <div className="p-6 space-y-6">
            {/* Type & Status */}
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase">Type</label>
              <div className="text-lg font-medium text-gray-900 mt-1">
                {isLicenseRequest(selectedApproval) ? '📋 License Request' : 'Other Request'}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase">Status</label>
              <div className="mt-1">
                <StatusBadge status={selectedApproval.status} />
              </div>
            </div>

            {/* User Info */}
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase">User</label>
              <div className="text-gray-900 font-medium mt-1">{selectedApproval.user_email}</div>
              <div className="text-sm text-gray-600">ID: {selectedApproval.user_id}</div>
            </div>

            {/* Dates */}
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase">Dates</label>
              <div className="mt-2 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Requested:</span>
                  <span className="font-medium">
                    {new Date(selectedApproval.created_at).toLocaleString()}
                  </span>
                </div>
                {selectedApproval.approved_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Approved:</span>
                    <span className="font-medium">
                      {new Date(selectedApproval.approved_at).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* License-specific details */}
            {isLicenseRequest(selectedApproval) && (
              <>
                {selectedApproval.product_upid && (
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase">Product UPID</label>
                    <code className="block mt-2 p-2 bg-gray-100 rounded font-mono text-sm">
                      {selectedApproval.product_upid}
                    </code>
                  </div>
                )}

                {selectedApproval.justification && (
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase">Justification</label>
                    <p className="mt-2 text-sm text-gray-700 bg-gray-50 p-3 rounded">
                      {selectedApproval.justification}
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Actions */}
            {selectedApproval.status === 'pending' && (
              <div className="pt-4 border-t space-y-3">
                <button
                  onClick={() => {
                    handleApprove(selectedApproval);
                  }}
                  disabled={actionLoading}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium disabled:opacity-50"
                >
                  {actionLoading ? 'Processing...' : 'Approve Request'}
                </button>
                <button
                  onClick={() => {
                    initiateReject(selectedApproval);
                  }}
                  disabled={actionLoading}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-medium disabled:opacity-50"
                >
                  {actionLoading ? 'Processing...' : 'Reject Request'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Overlay for sidebar */}
      {selectedApproval && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setSelectedApproval(null)}
        />
      )}
    </div>
  );
}
