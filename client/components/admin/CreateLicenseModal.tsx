'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';

interface CreateLicenseModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (data: CreateLicenseData) => Promise<void>;
}

interface CreateLicenseData {
  user_id: number;
  product_upid: string;
  days_valid: number;
  daily_limit?: number;
  monthly_limit?: number;
}

interface User {
  id: number;
  email: string;
  uid: string;
}

interface Product {
  id: number;
  upid: string;
  name: string;
}

/**
 * Modal to create a new license
 * 
 * Form fields:
 * - User selection (search by email)
 * - Product selection (from available products)
 * - Days valid (30, 60, 90, 365, custom)
 * - Daily limit (optional)
 * - Monthly limit (optional)
 */
export default function CreateLicenseModal({
  open,
  onClose,
  onCreate,
}: CreateLicenseModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    user_id: '',
    product_upid: '',
    days_valid: '30',
    daily_limit: '',
    monthly_limit: '',
  });

  // Dropdowns
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  // Fetch products on mount
  useEffect(() => {
    if (!open) return;

    const fetchProducts = async () => {
      try {
        const response = await (apiClient as any).client.get('/products?skip=0&take=100');
        setProducts(response.data.products || []);
      } catch (err) {
        console.error('Error fetching products:', err);
      }
    };

    fetchProducts();
  }, [open]);

  // Fetch users when searching
  useEffect(() => {
    if (!open || userSearch.length < 2) {
      setUsers([]);
      return;
    }

    const fetchUsers = async () => {
      try {
        setUsersLoading(true);
        const response = await (apiClient as any).client.get(
          `/admin/users?search=${encodeURIComponent(userSearch)}&take=10`
        );
        setUsers(response.data.users || []);
      } catch (err) {
        console.error('Error fetching users:', err);
      } finally {
        setUsersLoading(false);
      }
    };

    const timer = setTimeout(fetchUsers, 300); // Debounce
    return () => clearTimeout(timer);
  }, [userSearch, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.user_id) {
      setError('Please select a user');
      return;
    }
    if (!formData.product_upid) {
      setError('Please select a product');
      return;
    }
    if (!formData.days_valid) {
      setError('Please enter days valid');
      return;
    }

    try {
      setLoading(true);

      const data: CreateLicenseData = {
        user_id: parseInt(formData.user_id),
        product_upid: formData.product_upid,
        days_valid: parseInt(formData.days_valid),
      };

      if (formData.daily_limit) {
        data.daily_limit = parseInt(formData.daily_limit);
      }
      if (formData.monthly_limit) {
        data.monthly_limit = parseInt(formData.monthly_limit);
      }

      await onCreate(data);

      // Reset form
      setFormData({
        user_id: '',
        product_upid: '',
        days_valid: '30',
        daily_limit: '',
        monthly_limit: '',
      });
      setUserSearch('');
    } catch (err: any) {
      setError(err.message || 'Failed to create license');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
        {/* Header */}
        <div className="border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">Create License</h2>
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

          {/* User Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              User <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Search by email (min 2 chars)..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded mb-2"
            />
            {userSearch && (
              <div className="border border-gray-200 rounded max-h-48 overflow-y-auto">
                {usersLoading ? (
                  <div className="p-2 text-gray-500 text-sm">Searching...</div>
                ) : users.length > 0 ? (
                  users.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, user_id: user.id.toString() });
                        setUserSearch(user.email);
                        setUsers([]);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50"
                    >
                      <div className="font-medium">{user.email}</div>
                      <div className="text-xs text-gray-500">{user.uid}</div>
                    </button>
                  ))
                ) : (
                  <div className="p-2 text-gray-500 text-sm">No users found</div>
                )}
              </div>
            )}
            {formData.user_id && (
              <div className="text-sm text-green-600">
                Selected: User #{formData.user_id}
              </div>
            )}
          </div>

          {/* Product Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.product_upid}
              onChange={(e) =>
                setFormData({ ...formData, product_upid: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded"
            >
              <option value="">Select a product...</option>
              {products.map((product) => (
                <option key={product.id} value={product.upid}>
                  {product.name} ({product.upid})
                </option>
              ))}
            </select>
          </div>

          {/* Days Valid */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Days Valid <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2 mb-2">
              {[30, 60, 90, 365].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, days_valid: days.toString() })
                  }
                  className={`px-3 py-1 rounded text-sm ${
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
              onChange={(e) =>
                setFormData({ ...formData, days_valid: e.target.value })
              }
              placeholder="Or enter custom days"
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
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
            {loading ? 'Creating...' : 'Create License'}
          </button>
        </div>
      </div>
    </div>
  );
}
