'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/hooks/useAuth';
import ProductDetailsModal from '@/components/dashboard/ProductDetailsModal';

interface Product {
  id: number;
  upid: string;
  name: string;
  description?: string;
  category?: string;
  tier?: string;
  daily_limit?: number;
  monthly_limit?: number;
  created_at: string;
}

/**
 * Available Products Catalog Page
 * 
 * Displays:
 * - Grid/List of available products
 * - Filters: tier required, category, usage limits
 * - Product details modal with request form
 * - Request license button for each product
 */
export default function AvailableProductsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filters
  const [filters, setFilters] = useState({
    tier: 'all',
    category: 'all',
    search: '',
  });

  // Modal
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Fetch products
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await (apiClient as any).client.get('/products?skip=0&take=100');
        setProducts(response.data.products || []);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load products');
        console.error('Error fetching products:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [isAuthenticated, router]);

  // Apply filters
  useEffect(() => {
    let filtered = products;

    // Filter by tier
    if (filters.tier !== 'all') {
      filtered = filtered.filter((p) => p.tier === filters.tier);
    }

    // Filter by category
    if (filters.category !== 'all') {
      filtered = filtered.filter((p) => p.category === filters.category);
    }

    // Search
    if (filters.search) {
      const query = filters.search.toLowerCase();
      filtered = filtered.filter((p) =>
        p.name.toLowerCase().includes(query) ||
        p.upid.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
      );
    }

    setFilteredProducts(filtered);
  }, [products, filters]);

  // Get unique values for filters
  const uniqueTiers = ['all', ...new Set(products.map((p) => p.tier).filter(Boolean))];
  const uniqueCategories = ['all', ...new Set(products.map((p) => p.category).filter(Boolean))];

  const handleRequestLicense = (product: Product) => {
    // Navigate to request form with product pre-selected
    router.push(`/dashboard/licenses/request?product=${product.upid}`);
  };

  if (!isAuthenticated) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Available Products</h1>
          <p className="text-gray-600 mt-1">Browse and request product licenses</p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              placeholder="Product name or UPID..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Tier Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tier</label>
            <select
              value={filters.tier}
              onChange={(e) => setFilters({ ...filters, tier: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {uniqueTiers.map((tier) => (
                <option key={tier} value={tier}>
                  {tier === 'all' ? 'All Tiers' : tier}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {uniqueCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* View Mode & Results */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-gray-600">
            Showing <span className="font-semibold">{filteredProducts.length}</span> of{' '}
            <span className="font-semibold">{products.length}</span> products
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 rounded ${
                viewMode === 'grid'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 rounded ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12 text-gray-600">Loading products...</div>
      )}

      {/* Products Grid */}
      {!loading && viewMode === 'grid' && (
        <>
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="bg-white border border-gray-200 rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden flex flex-col"
                >
                  {/* Card Content */}
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="mb-3">
                      <code className="text-sm font-mono font-bold text-blue-600 block mb-1">
                        {product.upid}
                      </code>
                      <h3 className="text-lg font-bold text-gray-900">{product.name}</h3>
                    </div>

                    {product.description && (
                      <p className="text-sm text-gray-600 mb-4 flex-1">
                        {product.description.substring(0, 100)}
                        {product.description.length > 100 && '...'}
                      </p>
                    )}

                    {/* Badges */}
                    <div className="flex gap-2 mb-4 flex-wrap">
                      {product.tier && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded font-medium">
                          {product.tier}
                        </span>
                      )}
                      {product.category && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded font-medium">
                          {product.category}
                        </span>
                      )}
                    </div>

                    {/* Limits Preview */}
                    {(product.daily_limit || product.monthly_limit) && (
                      <div className="text-xs text-gray-600 mb-4 space-y-1">
                        {product.daily_limit && <div>Daily: {product.daily_limit}</div>}
                        {product.monthly_limit && <div>Monthly: {product.monthly_limit}</div>}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="px-6 py-4 bg-gray-50 border-t flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedProduct(product);
                        setShowDetailsModal(true);
                      }}
                      className="flex-1 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded border border-blue-200"
                    >
                      Details
                    </button>
                    <button
                      onClick={() => handleRequestLicense(product)}
                      className="flex-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded"
                    >
                      Request
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-600 bg-white rounded-lg">
              <div className="text-4xl mb-2">🔍</div>
              <p>No products found matching your filters.</p>
            </div>
          )}
        </>
      )}

      {/* Products List */}
      {!loading && viewMode === 'list' && (
        <>
          {filteredProducts.length > 0 ? (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Product</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Tier</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Limits</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3">
                        <div>
                          <code className="text-xs font-mono font-bold text-blue-600">
                            {product.upid}
                          </code>
                          <div className="font-medium text-gray-900">{product.name}</div>
                          {product.description && (
                            <div className="text-xs text-gray-600 mt-1">
                              {product.description.substring(0, 60)}...
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        {product.tier ? (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded font-medium">
                            {product.tier}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-xs">
                        {product.daily_limit || product.monthly_limit ? (
                          <div>
                            {product.daily_limit && <div>Daily: {product.daily_limit}</div>}
                            {product.monthly_limit && <div>Monthly: {product.monthly_limit}</div>}
                          </div>
                        ) : (
                          <span className="text-gray-400">Unlimited</span>
                        )}
                      </td>
                      <td className="px-6 py-3 space-x-2">
                        <button
                          onClick={() => {
                            setSelectedProduct(product);
                            setShowDetailsModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Details
                        </button>
                        <button
                          onClick={() => handleRequestLicense(product)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Request
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-600 bg-white rounded-lg">
              <p>No products found matching your filters.</p>
            </div>
          )}
        </>
      )}

      {/* Details Modal */}
      {selectedProduct && (
        <ProductDetailsModal
          open={showDetailsModal}
          product={selectedProduct}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedProduct(null);
          }}
          onRequest={() => {
            handleRequestLicense(selectedProduct);
            setShowDetailsModal(false);
          }}
        />
      )}
    </div>
  );
}
