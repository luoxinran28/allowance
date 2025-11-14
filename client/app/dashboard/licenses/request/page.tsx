'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/hooks/useAuth';
import { StatusBadge } from '@/components/common/StatusBadge';

interface Product {
  id: number;
  upid: string;
  name: string;
  description?: string;
  daily_limit?: number;
  monthly_limit?: number;
}

interface LicenseRequest {
  id: number;
  product_upid: string;
  status: 'pending' | 'approved' | 'rejected' | 'assigned';
  justification: string;
  required_by: string;
  created_at: string;
  approved_at?: string;
}

/**
 * License Request Form Page
 * 
 * Allows employees to:
 * - Submit new license requests
 * - Specify product, justification, required-by date
 * - View history of previous requests with status
 */
export default function RequestLicensePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  // Form state
  const [formData, setFormData] = useState({
    product_upid: '',
    justification: '',
    required_by: '',
  });

  // Fetch state
  const [products, setProducts] = useState<Product[]>([]);
  const [previousRequests, setPreviousRequests] = useState<LicenseRequest[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'form' | 'history'>('form');

  // Fetch products and requests
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    const fetchData = async () => {
      try {
        setProductsLoading(true);
        const productsResponse = await (apiClient as any).client.get('/products?skip=0&take=100');
        setProducts(productsResponse.data.products || []);

        // In a real app, we'd fetch user's previous requests from /license-requests/mine
        // For now, we'll use an empty array since this endpoint may not exist yet
        setPreviousRequests([]);
      } catch (err: any) {
        console.error('Error fetching data:', err);
      } finally {
        setProductsLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validation
    if (!formData.product_upid) {
      setError('Please select a product');
      return;
    }
    if (!formData.justification.trim()) {
      setError('Please provide justification for your request');
      return;
    }
    if (!formData.required_by) {
      setError('Please specify a required-by date');
      return;
    }

    // Validate date
    const requiredDate = new Date(formData.required_by);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (requiredDate < today) {
      setError('Required-by date must be in the future');
      return;
    }

    try {
      setSubmitting(true);

      // Submit request
      await (apiClient as any).client.post('/license-requests', {
        product_upid: formData.product_upid,
        justification: formData.justification,
        required_by: formData.required_by,
      });

      setSuccess(true);
      setFormData({
        product_upid: '',
        justification: '',
        required_by: '',
      });

      // Show success message and redirect after delay
      setTimeout(() => {
        setSelectedTab('history');
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit request');
      console.error('Error submitting request:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return <div className="text-center py-8">Loading...</div>;
  }

  const selectedProduct = products.find((p) => p.upid === formData.product_upid);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Request a License</h1>
        <p className="text-gray-600 mt-1">Submit a request for a new product license</p>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="flex gap-8 px-6">
          {(['form', 'history'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`py-4 font-medium text-sm border-b-2 ${
                selectedTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab === 'form' ? 'New Request' : 'Request History'}
            </button>
          ))}
        </div>
      </div>

      {/* Form Tab */}
      {selectedTab === 'form' && (
        <div className="max-w-2xl">
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-8 space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="p-4 bg-green-50 border border-green-200 rounded text-green-700">
                ✓ Request submitted successfully! You'll be notified when it's reviewed.
              </div>
            )}

            {/* Product Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Product <span className="text-red-500">*</span>
              </label>
              {productsLoading ? (
                <div className="text-gray-500">Loading products...</div>
              ) : (
                <select
                  value={formData.product_upid}
                  onChange={(e) =>
                    setFormData({ ...formData, product_upid: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a product...</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.upid}>
                      {product.name} ({product.upid})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Product Info */}
            {selectedProduct && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                <div className="text-sm text-gray-700">
                  {selectedProduct.description && (
                    <p className="mb-2">{selectedProduct.description}</p>
                  )}
                  <div className="space-y-1">
                    {selectedProduct.daily_limit && (
                      <div>Daily Limit: <span className="font-medium">{selectedProduct.daily_limit} requests</span></div>
                    )}
                    {selectedProduct.monthly_limit && (
                      <div>Monthly Limit: <span className="font-medium">{selectedProduct.monthly_limit} requests</span></div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Justification */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Justification <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.justification}
                onChange={(e) =>
                  setFormData({ ...formData, justification: e.target.value })
                }
                placeholder="Explain why you need this license and how you'll use it..."
                rows={5}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="text-xs text-gray-600 mt-1">
                {formData.justification.length}/500 characters
              </div>
            </div>

            {/* Required By Date */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Required By Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.required_by}
                onChange={(e) =>
                  setFormData({ ...formData, required_by: e.target.value })
                }
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="text-xs text-gray-600 mt-1">
                When do you need this license by?
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => setFormData({ product_upid: '', justification: '', required_by: '' })}
                className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
              >
                Clear
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* History Tab */}
      {selectedTab === 'history' && (
        <div className="space-y-4">
          {previousRequests.length > 0 ? (
            <div className="space-y-4">
              {previousRequests.map((request) => (
                <div
                  key={request.id}
                  className="bg-white border border-gray-200 rounded-lg p-6"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <code className="text-lg font-mono font-bold text-gray-900">
                        {request.product_upid}
                      </code>
                      <div className="text-sm text-gray-600 mt-1">
                        Requested: {new Date(request.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <StatusBadge status={request.status} />
                  </div>
                  <div className="text-gray-700">{request.justification}</div>
                  <div className="text-sm text-gray-600 mt-2">
                    Required by: {new Date(request.required_by).toLocaleDateString()}
                  </div>
                  {request.approved_at && (
                    <div className="text-sm text-green-600 mt-2">
                      Approved on: {new Date(request.approved_at).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-600 bg-white rounded-lg">
              <div className="text-4xl mb-2">📋</div>
              <p>No previous requests. Submit your first one above!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
