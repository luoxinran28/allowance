'use client';

import { useState } from 'react';

interface License {
  id: number;
  user_id: number;
  user_email: string;
  product_upid: string;
  status: 'active' | 'pending' | 'expired' | 'revoked';
  created_at: string;
  expires_at: string;
  daily_limit: number | null;
  monthly_limit: number | null;
}

interface EditLicenseModalProps {
  open: boolean;
  license: License | null;
  onClose: () => void;
  onUpdate: (id: number, data: UpdateLicenseData) => Promise<void>;
}

interface UpdateLicenseData {
  daily_limit?: number | null;
  monthly_limit?: number | null;
  expires_at?: string;
}

/**
 * Modal to edit an existing license
 * 
 * Editable fields:
 * - Daily limit
 * - Monthly limit
 * - Expiration date
 */
export default function EditLicenseModal({
  open,
  license,
  onClose,
  onUpdate,
}: EditLicenseModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    daily_limit: license?.daily_limit?.toString() || '',
    monthly_limit: license?.monthly_limit?.toString() || '',
    expires_at: license?.expires_at?.split('T')[0] || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!license) return;

    try {
      setLoading(true);

      const data: UpdateLicenseData = {};

      if (formData.daily_limit) {
        data.daily_limit = parseInt(formData.daily_limit);
      } else {
        data.daily_limit = null;
      }

      if (formData.monthly_limit) {
        data.monthly_limit = parseInt(formData.monthly_limit);
      } else {
        data.monthly_limit = null;
      }

      if (formData.expires_at) {
        data.expires_at = formData.expires_at;
      }

      await onUpdate(license.id, data);

      // Reset form
      setFormData({
        daily_limit: license.daily_limit?.toString() || '',
        monthly_limit: license.monthly_limit?.toString() || '',
        expires_at: license.expires_at?.split('T')[0] || '',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to update license');
    } finally {
      setLoading(false);
    }
  };

  if (!open || !license) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
        {/* Header */}
        <div className="border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">Edit License</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* License Info (Read-only) */}
          <div className="space-y-2 p-3 bg-gray-50 rounded">
            <div>
              <div className="text-xs text-gray-600">User</div>
              <div className="font-medium">{license.user_email}</div>
            </div>
            <div>
              <div className="text-xs text-gray-600">Product</div>
              <code className="text-xs bg-gray-200 px-1 py-0.5 rounded">{license.product_upid}</code>
            </div>
            <div>
              <div className="text-xs text-gray-600">Status</div>
              <div className="text-sm">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  license.status === 'active' ? 'bg-green-100 text-green-800' :
                  license.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  license.status === 'expired' ? 'bg-gray-100 text-gray-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {license.status}
                </span>
              </div>
            </div>
          </div>

          {/* Daily Limit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Daily Limit (optional)
            </label>
            <input
              type="number"
              min="0"
              value={formData.daily_limit}
              onChange={(e) =>
                setFormData({ ...formData, daily_limit: e.target.value })
              }
              placeholder="Leave empty for unlimited"
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>

          {/* Monthly Limit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Monthly Limit (optional)
            </label>
            <input
              type="number"
              min="0"
              value={formData.monthly_limit}
              onChange={(e) =>
                setFormData({ ...formData, monthly_limit: e.target.value })
              }
              placeholder="Leave empty for unlimited"
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>

          {/* Expiration Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expiration Date (optional)
            </label>
            <input
              type="date"
              value={formData.expires_at}
              onChange={(e) =>
                setFormData({ ...formData, expires_at: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
            {license.expires_at && (
              <div className="text-xs text-gray-600 mt-1">
                Current: {new Date(license.expires_at).toLocaleDateString()}
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="border-t px-6 py-3 bg-gray-50 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Updating...' : 'Update License'}
          </button>
        </div>
      </div>
    </div>
  );
}
