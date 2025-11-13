import React, { useState } from 'react';
import { apiClient } from '@/lib/api-client';

interface ApprovalReviewDialogProps {
  approvalId: number;
  upid: string;
  userEmail: string;
  isOpen: boolean;
  onClose: () => void;
  onApprovalSubmitted?: () => void;
}

/**
 * ApprovalReviewDialog Component
 * Modal interface for team leaders to approve or reject license requests
 * 
 * Usage:
 * <ApprovalReviewDialog
 *   approvalId={1}
 *   upid="UPID-product-basic"
 *   userEmail="user@example.com"
 *   isOpen={isOpen}
 *   onClose={handleClose}
 *   onApprovalSubmitted={handleRefresh}
 * />
 */
export const ApprovalReviewDialog: React.FC<ApprovalReviewDialogProps> = ({
  approvalId,
  upid,
  userEmail,
  isOpen,
  onClose,
  onApprovalSubmitted,
}) => {
  const [status, setStatus] = useState<'approved' | 'rejected'>('approved');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!remarks.trim()) {
      setError('Please provide remarks');
      return;
    }

    try {
      setLoading(true);
      await apiClient.reviewLicenseRequest(approvalId, status, remarks);
      onApprovalSubmitted?.();
      onClose();
      setRemarks('');
      setStatus('approved');
      setError(null);
    } catch (err) {
      setError('Failed to submit review');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900">Review License Request</h2>
          <p className="text-sm text-gray-600 mt-1">{upid}</p>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* User Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Requested by</p>
            <p className="text-sm font-medium text-gray-900">{userEmail}</p>
          </div>

          {/* Status Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Decision
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="approved"
                  checked={status === 'approved'}
                  onChange={(e) => setStatus(e.target.value as 'approved' | 'rejected')}
                  className="h-4 w-4 text-blue-600"
                />
                <span className="ml-2 text-sm text-gray-700">Approve</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="rejected"
                  checked={status === 'rejected'}
                  onChange={(e) => setStatus(e.target.value as 'approved' | 'rejected')}
                  className="h-4 w-4 text-red-600"
                />
                <span className="ml-2 text-sm text-gray-700">Reject</span>
              </label>
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Remarks <span className="text-red-500">*</span>
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder={
                status === 'approved'
                  ? 'e.g., Approved for Q1 project work'
                  : 'e.g., Need more team capacity first'
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={4}
              disabled={loading}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-800 text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-500 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg transition ${
                status === 'approved'
                  ? 'bg-green-600 hover:bg-green-700 disabled:bg-green-400'
                  : 'bg-red-600 hover:bg-red-700 disabled:bg-red-400'
              }`}
            >
              {loading ? 'Submitting...' : status === 'approved' ? 'Approve' : 'Reject'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
