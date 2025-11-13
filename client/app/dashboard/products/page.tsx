'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Product, UserLicense } from '@/lib/types';

interface LicenseGeneration {
  productId: string;
  versionName: string;
  daysValid: number;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [licenses, setLicenses] = useState<UserLicense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [generatingLicense, setGeneratingLicense] = useState<string | null>(null);
  const [licenseForm, setLicenseForm] = useState<LicenseGeneration>({
    productId: '',
    versionName: 'pro',
    daysValid: 30,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');

        const [productsRes, licensesRes] = await Promise.all([
          apiClient.listProducts(),
          apiClient.getUserLicenses(),
        ]);

        setProducts(productsRes.data || []);
        setLicenses(licensesRes.data || []);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load products and licenses');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleGenerateLicense = async (productId: string) => {
    if (!licenseForm.versionName || !licenseForm.daysValid) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setGeneratingLicense(productId);
      setError('');
      setSuccess('');

      const response = await apiClient.generateBatchLicenses(
        productId,
        licenseForm.versionName,
        1, // Generate single license
        licenseForm.daysValid
      );

      if (response.data.licenses && response.data.licenses.length > 0) {
        setSuccess(`License generated successfully: ${response.data.licenses[0].license_key}`);
      } else {
        setSuccess('License generated successfully');
      }
      setLicenseForm({ productId: '', versionName: 'pro', daysValid: 30 });

      // Refresh licenses
      const licensesRes = await apiClient.getUserLicenses();
      setLicenses(licensesRes.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate license');
    } finally {
      setGeneratingLicense(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Loading products and licenses...</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-3xl font-bold mb-8">Products & Licenses</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-green-700">{success}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Available Products</h3>
            </div>

            {products.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No products available
              </div>
            ) : (
              <div className="divide-y">
                {products.map((product) => (
                  <div key={product.id} className="p-6 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="text-lg font-semibold">{product.name}</h4>
                        <p className="text-gray-600 text-sm">{product.product_id}</p>
                      </div>
                      <button
                        onClick={() => {
                          setLicenseForm({
                            ...licenseForm,
                            productId: product.product_id,
                          });
                        }}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
                      >
                        Generate License
                      </button>
                    </div>
                    {product.description && (
                      <p className="text-gray-700 text-sm">{product.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* License Generation Form */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Generate License</h3>

            {licenseForm.productId ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleGenerateLicense(licenseForm.productId);
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product
                  </label>
                  <p className="bg-gray-100 px-3 py-2 rounded text-sm">
                    {products.find((p) => p.product_id === licenseForm.productId)?.name}
                  </p>
                </div>

                <div>
                  <label htmlFor="versionName" className="block text-sm font-medium text-gray-700 mb-1">
                    Version
                  </label>
                  <select
                    id="versionName"
                    value={licenseForm.versionName}
                    onChange={(e) =>
                      setLicenseForm({ ...licenseForm, versionName: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="premium">Premium</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="daysValid" className="block text-sm font-medium text-gray-700 mb-1">
                    Valid for (days)
                  </label>
                  <input
                    type="number"
                    id="daysValid"
                    min="1"
                    max="365"
                    value={licenseForm.daysValid}
                    onChange={(e) =>
                      setLicenseForm({ ...licenseForm, daysValid: parseInt(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex space-x-2">
                  <button
                    type="submit"
                    disabled={generatingLicense === licenseForm.productId}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400 text-sm"
                  >
                    {generatingLicense === licenseForm.productId ? 'Generating...' : 'Generate'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLicenseForm({ ...licenseForm, productId: '' })}
                    className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <p className="text-gray-500 text-sm">Select a product to generate a license</p>
            )}
          </div>
        </div>
      </div>

      {/* User Licenses */}
      <div className="mt-8">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Your Licenses</h3>
          </div>

          {licenses.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No licenses yet. Generate one from a product above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      License Key
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Expires
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {licenses.map((license) => {
                    const isExpired = new Date(license.expires_at) < new Date();
                    const isRevoked = !!license.revoked_at;

                    return (
                      <tr key={license.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-mono text-gray-900">
                          {license.license_key.substring(0, 20)}...
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          Product #{license.product_version_id}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {new Date(license.expires_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            isRevoked
                              ? 'bg-red-100 text-red-800'
                              : isExpired
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {isRevoked ? 'Revoked' : isExpired ? 'Expired' : 'Active'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
