'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { apiClient } from '@/lib/api-client';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

interface RevokeResult {
  id: string;
  revoked_count: number;
  failed_count: number;
  revoked_licenses: Array<{
    key: string;
    status: string;
  }>;
}

export default function BatchRevokePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [revokeMode, setRevokeMode] = useState<'keys' | 'batch'>('keys');
  const [licenseKeys, setLicenseKeys] = useState('');
  const [batchId, setBatchId] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<RevokeResult | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, router]);

  const getKeyList = (): string[] => {
    return licenseKeys
      .split('\n')
      .map((k) => k.trim())
      .filter((k) => k.length > 0);
  };

  const handleRevokeBatch = async () => {
    try {
      setLoading(true);
      setError('');

      let response;

      if (revokeMode === 'keys') {
        const keys = getKeyList();
        if (keys.length === 0) {
          throw new Error('Please enter at least one license key');
        }
        response = await apiClient.revokeBatchLicenses(keys, reason);
      } else {
        if (!batchId.trim()) {
          throw new Error('Please enter a batch ID');
        }
        response = await apiClient.revokeBatchById(batchId, reason);
      }

      if (response.status === 200) {
        setResult(response.data);
      } else {
        throw new Error('Failed to revoke licenses');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to revoke licenses');
      console.error('Revoke error:', err);
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  if (!result) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Revoke Batch Licenses</h1>
            <p className="text-gray-600">Revoke licenses by individual keys or batch ID</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          <div className="bg-white rounded-lg shadow p-8">
            {/* Mode Selector */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Revoke Mode
              </label>
              <div className="flex gap-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    checked={revokeMode === 'keys'}
                    onChange={() => setRevokeMode('keys')}
                    className="h-4 w-4 text-blue-600"
                  />
                  <span className="ml-2 text-gray-700">Revoke by License Keys</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    checked={revokeMode === 'batch'}
                    onChange={() => setRevokeMode('batch')}
                    className="h-4 w-4 text-blue-600"
                  />
                  <span className="ml-2 text-gray-700">Revoke by Batch ID</span>
                </label>
              </div>
            </div>

            {/* Keys Input */}
            {revokeMode === 'keys' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  License Keys (one per line) *
                </label>
                <textarea
                  value={licenseKeys}
                  onChange={(e) => setLicenseKeys(e.target.value)}
                  placeholder="LICENSE-KEY-001&#10;LICENSE-KEY-002&#10;LICENSE-KEY-003"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent font-mono text-sm"
                  rows={6}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {getKeyList().length} keys entered
                </p>
              </div>
            )}

            {/* Batch ID Input */}
            {revokeMode === 'batch' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Batch ID *
                </label>
                <input
                  type="text"
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value)}
                  placeholder="e.g., BATCH-2024-001234"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  All licenses in this batch will be revoked
                </p>
              </div>
            )}

            {/* Reason */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Revocation (optional)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Customer requested refund, License misuse, Duplicate purchase"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                rows={3}
              />
            </div>

            {/* Warning */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-red-900 mb-2">⚠️ Warning</h3>
              <p className="text-sm text-red-800">
                This action will immediately revoke the selected licenses. Users will no longer be able
                to use these licenses. This action cannot be undone.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => router.back()}
                className="flex-1 bg-gray-300 text-gray-900 font-semibold py-3 px-6 rounded-lg hover:bg-gray-400 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowConfirm(true)}
                disabled={
                  loading ||
                  (revokeMode === 'keys' && getKeyList().length === 0) ||
                  (revokeMode === 'batch' && !batchId.trim())
                }
                className="flex-1 bg-red-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Revoke Licenses
              </button>
            </div>
          </div>
        </div>

        {/* Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showConfirm}
          title="Confirm License Revocation"
          message={`Are you sure you want to revoke ${
            revokeMode === 'keys'
              ? `${getKeyList().length} license(s)`
              : `all licenses in batch ${batchId}`
          }? This action cannot be undone.`}
          confirmText="Revoke"
          cancelText="Cancel"
          isLoading={loading}
          isDangerous={true}
          onConfirm={handleRevokeBatch}
          onCancel={() => setShowConfirm(false)}
        />
      </div>
    );
  }

  // Success View
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Revocation Complete</h2>
          <p className="text-gray-600">Licenses have been successfully revoked</p>
        </div>

        <div className="bg-white rounded-lg shadow p-8">
          {/* Results Summary */}
          <div className="mb-8 space-y-4">
            <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
              <span className="text-gray-700">Successfully Revoked:</span>
              <span className="text-2xl font-bold text-green-600">{result.revoked_count}</span>
            </div>

            {result.failed_count > 0 && (
              <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg">
                <span className="text-gray-700">Failed to Revoke:</span>
                <span className="text-2xl font-bold text-red-600">{result.failed_count}</span>
              </div>
            )}
          </div>

          {/* Revoked Licenses List */}
          <div className="mb-8">
            <h3 className="font-semibold text-gray-900 mb-3">Revoked Licenses</h3>
            <div className="bg-gray-50 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-200 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left text-gray-700">License Key</th>
                    <th className="px-4 py-2 text-left text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {result.revoked_licenses.slice(0, 20).map((license, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-100">
                      <td className="px-4 py-2 font-mono text-xs">{license.key}</td>
                      <td className="px-4 py-2">
                        <span className="inline-block px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">
                          {license.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {result.revoked_licenses.length > 20 && (
              <p className="text-xs text-gray-500 mt-2">
                ... and {result.revoked_licenses.length - 20} more licenses
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex-1 bg-gray-300 text-gray-900 font-semibold py-3 px-6 rounded-lg hover:bg-gray-400 transition"
            >
              Back to Dashboard
            </button>
            <button
              onClick={() => {
                setLicenseKeys('');
                setBatchId('');
                setReason('');
                setResult(null);
              }}
              className="flex-1 bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition"
            >
              Revoke More Licenses
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
