'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { usePermission } from '@/lib/hooks/usePermission';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

interface Product {
  id: number;
  name: string;
  upid: string;
}

interface Organization {
  id: number;
  name: string;
}

interface OrgProductLicense {
  id: number;
  organization_id: number;
  product_id: number;
  total_count: number;
  assigned_count: number;
  available_count: number;
  expires_at: string;
}

export default function AdminOrgLicensesPage() {
  const { isAdmin } = usePermission();
  const [products, setProducts] = useState<Product[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [orgLicenses, setOrgLicenses] = useState<OrgProductLicense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Generate license form state
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [formData, setFormData] = useState({
    productId: '',
    organizationId: '',
    count: 5,
    expiresInDays: 30,
  });
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!isAdmin()) {
      setError('You do not have permission to access this page');
      return;
    }
    loadData();
  }, [isAdmin]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      // Load products
      const productsRes = await apiClient.getProducts();
      setProducts(Array.isArray(productsRes.data) ? productsRes.data : []);

      // Load organizations (assuming there's an endpoint)
      try {
        const orgsRes = await (apiClient as any).listOrganizations?.();
        setOrganizations(Array.isArray(orgsRes?.data) ? orgsRes.data : []);
      } catch (err) {
        console.error('Failed to load organizations');
      }

      // Load org licenses
      try {
        const licensesRes = await (apiClient as any).getOrgLicenses?.();
        setOrgLicenses(Array.isArray(licensesRes?.data) ? licensesRes.data : []);
      } catch (err) {
        console.error('Failed to load org licenses');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenGenerateModal = () => {
    setFormData({
      productId: '',
      organizationId: '',
      count: 5,
      expiresInDays: 30,
    });
    setShowGenerateModal(true);
  };

  const handleCloseGenerateModal = () => {
    setShowGenerateModal(false);
  };

  const handleGenerateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.productId || !formData.organizationId || formData.count <= 0) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setIsGenerating(true);
      setError('');
      setSuccess('');

      await apiClient.generateOrgLicenses(
        Number(formData.productId),
        Number(formData.organizationId),
        formData.count,
        formData.expiresInDays
      );

      setSuccess(`Generated ${formData.count} licenses successfully`);
      handleCloseGenerateModal();
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate licenses');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isAdmin()) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-800">
          You do not have permission to access this page. Only administrators can manage organization licenses.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Organization License Management</h1>
          <p className="mt-1 text-gray-600">Manage product licenses assigned to organizations</p>
        </div>
        <button
          onClick={handleOpenGenerateModal}
          className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2.5 font-medium text-white hover:bg-green-700 active:bg-green-800 transition"
        >
          <span>➕</span>
          <span>Generate Licenses</span>
        </button>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      {/* Org Licenses Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : orgLicenses.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-gray-500">No organization licenses found</p>
            <p className="text-sm text-gray-400 mt-2">Create licenses using the button above</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Organization
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Assigned
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Available
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Expires
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Progress
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orgLicenses.map((license) => {
                  const progressPercent = (license.assigned_count / license.total_count) * 100;
                  const isExpired = new Date(license.expires_at) < new Date();

                  return (
                    <tr
                      key={license.id}
                      className={`hover:bg-gray-50 transition ${isExpired ? 'opacity-60' : ''}`}
                    >
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        Org {license.organization_id}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        Product {license.product_id}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {license.total_count}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {license.assigned_count}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          license.available_count > 0
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {license.available_count}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <span className={isExpired ? 'text-red-600 font-medium' : ''}>
                          {new Date(license.expires_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-600">
                            {Math.round(progressPercent)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Generate License Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Generate Organization Licenses</h2>
            </div>
            <form onSubmit={handleGenerateSubmit} className="space-y-4 p-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product <span className="text-red-600">*</span>
                </label>
                <select
                  value={formData.productId}
                  onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  required
                >
                  <option value="">-- Select a product --</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.upid})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organization <span className="text-red-600">*</span>
                </label>
                <select
                  value={formData.organizationId}
                  onChange={(e) => setFormData({ ...formData, organizationId: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  required
                >
                  <option value="">-- Select an organization --</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Licenses <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  value={formData.count}
                  onChange={(e) => setFormData({ ...formData, count: Math.max(1, Number(e.target.value)) })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  min="1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiration (Days) <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  value={formData.expiresInDays}
                  onChange={(e) => setFormData({ ...formData, expiresInDays: Math.max(1, Number(e.target.value)) })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  min="1"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseGenerateModal}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="flex-1 rounded-lg bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700 disabled:bg-gray-400 transition"
                >
                  {isGenerating ? 'Generating...' : 'Generate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
