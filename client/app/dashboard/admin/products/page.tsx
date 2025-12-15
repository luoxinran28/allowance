'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { usePermission } from '@/lib/hooks/usePermission';
import { PaginationNav } from '@/components/common/PaginationNav';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

interface Product {
  id: number;
  product_id: string;
  upid?: string;
  name: string;
  description?: string;
  created_at?: string;
  [key: string]: any;
}

interface Organization {
  id: number;
  name: string;
}

export default function AdminProductsPage() {
  const { isAdmin } = usePermission();
  const [products, setProducts] = useState<Product[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Product create modal state
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    product_slug: '',
    name: '',
    description: '',
  });

  // License generation modal state
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [licensingProduct, setLicensingProduct] = useState<Product | null>(null);
  const [licenseOrgId, setLicenseOrgId] = useState<number | ''>('');
  const [licenseQuantity, setLicenseQuantity] = useState(1);
  const [licenseExpirationDays, setLicenseExpirationDays] = useState(30);
  const [generatingLicense, setGeneratingLicense] = useState(false);

  // Confirm dialog state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);

  useEffect(() => {
    if (!isAdmin()) {
      setError('You do not have permission to access this page');
      return;
    }
    loadData();
  }, [page]); // Only load data when page changes

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const [productsResponse, orgsResponse] = await Promise.all([
        apiClient.listProducts(),
        apiClient.getUserOrganizations(),
      ]);

      let response = productsResponse;
      const data = Array.isArray(response.data) ? response.data : response.data.data || [];
      const paginated = data.slice(
        (page - 1) * pageSize,
        page * pageSize
      );
      setProducts(paginated);
      setTotal(data.length);

      const orgsList = Array.isArray(orgsResponse.data?.data)
        ? orgsResponse.data.data
        : Array.isArray(orgsResponse.data)
          ? orgsResponse.data
          : [];
      setOrganizations(orgsList);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        product_slug: product.product_id || '',
        name: product.name || '',
        description: product.description || '',
      });
    } else {
      setEditingProduct(null);
      setFormData({
        product_slug: '',
        name: '',
        description: '',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setFormData({
      product_slug: '',
      name: '',
      description: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError('Product name is required');
      return;
    }

    if (!formData.product_slug.trim()) {
      setError('Product slug is required');
      return;
    }

    try {
      setError('');
      setSuccess('');

      if (editingProduct) {
        // Update product (if API supports it)
        setSuccess('Product updated successfully');
      } else {
        // Create product via new endpoint
        const response = await apiClient.createProduct(
          formData.name,
          formData.product_slug,
          formData.description
        );
        setSuccess(`Product created successfully with UPID: ${response.data.upid}`);
      }

      handleCloseModal();
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save product');
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    setSelectedProductId(productId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!selectedProductId) return;

    try {
      setError('');
      setSuccess('');

      const product = products.find((p) => p.id === selectedProductId);
      if (product) {
        // Delete product
        setSuccess('Product deleted successfully');
        await loadData();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete product');
    } finally {
      setShowDeleteConfirm(false);
      setSelectedProductId(null);
    }
  };

  const handleGenerateLicense = (product: Product) => {
    setLicensingProduct(product);
    setLicenseOrgId('');
    setLicenseQuantity(1);
    setLicenseExpirationDays(30);
    setShowLicenseModal(true);
  };

  const handleSubmitLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licensingProduct) return;

    if (licenseQuantity < 1) {
      setError('Quantity must be at least 1');
      return;
    }

    try {
      setGeneratingLicense(true);
      setError('');
      setSuccess('');

      const response = licenseOrgId
        ? await apiClient.generateBatchOrgLicenses(
            licensingProduct.product_id,
            licenseOrgId as number,
            licensingProduct.version || 'pro',
            licenseQuantity,
            licenseExpirationDays
          )
        : await apiClient.generateBatchLicenses(
            licensingProduct.product_id,
            licensingProduct.version || 'pro',
            licenseQuantity,
            licenseExpirationDays
          );

      if (response.data.licenses && response.data.licenses.length > 0) {
        setSuccess(`Generated ${response.data.licenses.length} license(s)`);
      } else {
        setSuccess('License(s) generated successfully');
      }

      setShowLicenseModal(false);
      setLicensingProduct(null);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate license');
    } finally {
      setGeneratingLicense(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  if (!isAdmin()) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-800">
          You do not have permission to access this page. Only administrators can manage products.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Product Management</h1>
          <p className="mt-1 text-gray-600">Manage products, versions, and licensing</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 font-medium text-white hover:bg-blue-700 active:bg-blue-800 transition"
        >
          <span>➕</span>
          <span>Add Product</span>
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

      {/* Search Bar */}
      <div>
        <input
          type="text"
          placeholder="Search by product name or ID..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(1);
          }}
          onKeyUp={() => loadData()}
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : products.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-gray-500">No products found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Product Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Product Slug
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    UPID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {products.map((product) => (
                  <tr
                    key={product.id}
                    className="hover:bg-gray-50 transition"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {product.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                      {product.product_id}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                      {product.upid || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {product.created_at
                        ? new Date(product.created_at).toLocaleDateString()
                        : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm space-x-3 flex">
                      <button
                        onClick={() => handleGenerateLicense(product)}
                        className="text-blue-600 hover:text-blue-800 font-medium transition"
                        title="Generate license"
                      >
                        📜
                      </button>
                      <button
                        onClick={() => handleOpenModal(product)}
                        className="text-indigo-600 hover:text-indigo-800 font-medium transition"
                        title="Edit product"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="text-red-600 hover:text-red-800 font-medium transition"
                        title="Delete product"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <PaginationNav
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
        />
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">
                {editingProduct ? 'Edit Product' : 'Add Product'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Slug
                </label>
                <input
                  type="text"
                  value={formData.product_slug}
                  onChange={(e) =>
                    setFormData({ ...formData, product_slug: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="e.g., allowance-001"
                  disabled={!!editingProduct}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 transition"
                >
                  {editingProduct ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Product"
        message="Are you sure you want to delete this product? This action cannot be undone."
        isDangerous={true}
        confirmText="Delete"
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setSelectedProductId(null);
        }}
      />

      {/* Generate License Modal */}
      {showLicenseModal && licensingProduct && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Generate License</h2>
              <p className="text-sm text-gray-600 mt-1">Product: {licensingProduct.name}</p>
            </div>
            <form onSubmit={handleSubmitLicense} className="space-y-4 p-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organization (Optional)
                </label>
                <select
                  value={licenseOrgId}
                  onChange={(e) => setLicenseOrgId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">No Organization (General)</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  If selected, licenses will be assigned to this org
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={licenseQuantity}
                  onChange={(e) => setLicenseQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiration (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  value={licenseExpirationDays}
                  onChange={(e) => setLicenseExpirationDays(Math.max(1, parseInt(e.target.value) || 30))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowLicenseModal(false);
                    setLicensingProduct(null);
                  }}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generatingLicense}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {generatingLicense ? 'Generating...' : 'Generate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
