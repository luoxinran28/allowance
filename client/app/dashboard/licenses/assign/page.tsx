'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/hooks/useAuth';
import { usePermission } from '@/lib/hooks/usePermission';

interface ApprovedRequest {
  id: number;
  user_id: number;
  user_email: string;
  product_upid: string;
  justification: string;
  required_by: string;
  created_at: string;
}

interface CreateLicenseParams {
  user_id: number;
  product_upid: string;
  days_valid: number;
  daily_limit?: number;
  monthly_limit?: number;
}

/**
 * License Assignment Page (Team Leader/Manager)
 * 
 * Allows managers to:
 * - View approved license requests
 * - Create licenses for approved employees
 * - Set license parameters (days valid, limits)
 * - Bulk assign licenses
 */
export default function AssignLicensesPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { hasPermission } = usePermission();

  // State
  const [approvedRequests, setApprovedRequests] = useState<ApprovedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<ApprovedRequest | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    days_valid: '30',
    daily_limit: '',
    monthly_limit: '',
    notes: '',
  });

  // Fetch approved requests
  useEffect(() => {
    if (!isAuthenticated || !hasPermission('license_assign')) {
      router.push('/dashboard');
      return;
    }

    const fetchRequests = async () => {
      try {
        setLoading(true);
        setError(null);

        // In a real app, would fetch from /license-requests?status=approved
        // For now, using admin approvals endpoint
        const response = await (apiClient as any).client.get('/admin/approvals?take=50');
        
        // Filter to show only approved requests (this would be done server-side in real app)
        const approved = response.data.approvals?.filter(
          (a: any) => a.status === 'approved' && !a.assigned_at
        ) || [];
        
        setApprovedRequests(approved);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load approved requests');
        console.error('Error fetching requests:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [isAuthenticated, hasPermission, router]);

  const handleAssignLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!selectedRequest) {
      setError('Please select a request');
      return;
    }

    if (!formData.days_valid) {
      setError('Please enter days valid');
      return;
    }

    try {
      setSubmitting(true);

      const params: CreateLicenseParams = {
        user_id: selectedRequest.user_id,
        product_upid: selectedRequest.product_upid,
        days_valid: parseInt(formData.days_valid),
      };

      if (formData.daily_limit) {
        params.daily_limit = parseInt(formData.daily_limit);
      }
      if (formData.monthly_limit) {
        params.monthly_limit = parseInt(formData.monthly_limit);
      }

      // Create license
      await (apiClient as any).client.post('/admin/licenses', params);

      setSuccess(true);
      
      // Remove from list
      setApprovedRequests(
        approvedRequests.filter((r) => r.id !== selectedRequest.id)
      );

      // Reset form
      setSelectedRequest(null);
      setFormData({
        days_valid: '30',
        daily_limit: '',
        monthly_limit: '',
        notes: '',
      });

      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to assign license');
      console.error('Error assigning license:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Assign Licenses</h1>
        <p className="text-gray-600 mt-1">Review approved requests and assign licenses to your team</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded text-green-700">
          ✓ License assigned successfully!
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Approved Requests List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b font-semibold">
              Approved Requests
              {approvedRequests.length > 0 && (
                <span className="ml-2 inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                  {approvedRequests.length}
                </span>
              )}
            </div>

            {loading ? (
              <div className="p-4 text-gray-500 text-sm">Loading requests...</div>
            ) : approvedRequests.length > 0 ? (
              <div className="divide-y max-h-96 overflow-y-auto">
                {approvedRequests.map((request) => (
                  <button
                    key={request.id}
                    onClick={() => {
                      setSelectedRequest(request);
                      setFormData({
                        days_valid: '30',
                        daily_limit: '',
                        monthly_limit: '',
                        notes: '',
                      });
                    }}
                    className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                      selectedRequest?.id === request.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                    }`}
                  >
                    <div className="font-medium text-sm">{request.user_email}</div>
                    <code className="text-xs text-blue-600 font-mono">{request.product_upid}</code>
                    <div className="text-xs text-gray-600 mt-1">
                      Requested: {new Date(request.created_at).toLocaleDateString()}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 text-gray-500 text-sm text-center py-8">
                No approved requests ready for assignment.
              </div>
            )}
          </div>
        </div>

        {/* Assignment Form */}
        <div className="lg:col-span-2">
          {selectedRequest ? (
            <div className="bg-white rounded-lg shadow p-6 space-y-6">
              {/* Request Summary */}
              <div className="border-b pb-4">
                <h3 className="font-semibold text-gray-900 mb-3">Request Details</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">User</span>
                    <span className="font-medium">{selectedRequest.user_email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Product</span>
                    <code className="font-mono text-blue-600 font-bold">
                      {selectedRequest.product_upid}
                    </code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Required By</span>
                    <span className="font-medium">
                      {new Date(selectedRequest.required_by).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
                  <div className="font-medium text-gray-700 mb-1">Justification</div>
                  <p className="text-gray-600">{selectedRequest.justification}</p>
                </div>
              </div>

              {/* Assignment Form */}
              <form onSubmit={handleAssignLicense} className="space-y-4">
                {/* Days Valid */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Days Valid <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2 mb-2">
                    {[30, 60, 90, 365].map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => setFormData({ ...formData, days_valid: days.toString() })}
                        className={`px-3 py-1 rounded text-sm font-medium ${
                          formData.days_valid === days.toString()
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {days}d
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="3650"
                    value={formData.days_valid}
                    onChange={(e) => setFormData({ ...formData, days_valid: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                {/* Daily Limit */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Daily Limit (optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.daily_limit}
                    onChange={(e) => setFormData({ ...formData, daily_limit: e.target.value })}
                    placeholder="Leave empty for unlimited"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                {/* Monthly Limit */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Monthly Limit (optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.monthly_limit}
                    onChange={(e) => setFormData({ ...formData, monthly_limit: e.target.value })}
                    placeholder="Leave empty for unlimited"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Notes (optional)
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Add any notes about this assignment..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Assigning...' : 'Assign License'}
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-12 text-center text-gray-600">
              <div className="text-4xl mb-2">👈</div>
              <p>Select a request to view assignment form</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
