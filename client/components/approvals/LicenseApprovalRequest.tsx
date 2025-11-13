import React, { useState } from 'react';
import { apiClient } from '@/lib/api-client';

interface LicenseApprovalRequestProps {
  licenseId: number;
  licenseName: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

/**
 * LicenseApprovalRequest Component
 * Allows users to request approval for a specific license assignment
 * 
 * Usage:
 * <LicenseApprovalRequest 
 *   licenseId={1} 
 *   licenseName="UPID-minerbond-basic"
 *   onSuccess={() => alert('Request submitted!')}
 * />
 */
export const LicenseApprovalRequest: React.FC<LicenseApprovalRequestProps> = ({
  licenseId,
  licenseName,
  onSuccess,
  onError,
}) => {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await apiClient.requestLicense(licenseId);
      setSubmitted(true);
      onSuccess?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit request';
      onError?.(message);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <p className="text-green-800 font-medium">✓ Request submitted successfully!</p>
        <p className="text-green-700 text-sm mt-1">
          Your license request for {licenseName} has been submitted for approval.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Request License Assignment</h3>
      <p className="text-gray-600 text-sm mb-4">
        License: <span className="font-mono font-semibold">{licenseName}</span>
      </p>
      <form onSubmit={handleSubmit}>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg transition"
        >
          {loading ? 'Submitting...' : 'Submit Request for Approval'}
        </button>
      </form>
      <p className="text-gray-500 text-xs mt-3">
        Your request will be sent to team leaders for review and approval.
      </p>
    </div>
  );
};
