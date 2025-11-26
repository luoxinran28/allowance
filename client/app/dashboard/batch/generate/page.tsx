'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { apiClient } from '@/lib/api-client';

interface BatchGenerateResponse {
  id: string;
  status: string;
  total_licenses: number;
  generated_count: number;
  error_count: number;
  created_at: string;
  licenses: Array<{
    key: string;
    expiration_date: string;
  }>;
}

interface Product {
  id: string;
  name: string;
}

interface Organization {
  id: number;
  name: string;
}

export default function BatchGeneratePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedOrganization, setSelectedOrganization] = useState<number | ''>('');
  const [quantity, setQuantity] = useState(1);
  const [expirationDays, setExpirationDays] = useState(365);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<BatchGenerateResponse | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    const loadData = async () => {
      try {
        const [productsResponse, orgsResponse] = await Promise.all([
          apiClient.getProducts(),
          apiClient.getUserOrganizations(),
        ]);

        if (productsResponse.status === 200) {
          setProducts(productsResponse.data);
          if (productsResponse.data.length > 0) {
            setSelectedProduct(productsResponse.data[0].id);
          }
        }

        const orgsList = Array.isArray(orgsResponse.data?.data)
          ? orgsResponse.data.data
          : Array.isArray(orgsResponse.data)
            ? orgsResponse.data
            : [];
        setOrganizations(orgsList);
        if (orgsList.length > 0) {
          setSelectedOrganization(orgsList[0].id);
        }
      } catch (err) {
        setError('Failed to load data');
        console.error('Data load error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isAuthenticated, router]);

  const handleGenerateBatch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProduct || quantity < 1 || quantity > 10000 || !selectedOrganization) {
      setError('Please fill in all fields with valid values');
      return;
    }

    try {
      setGenerating(true);
      setError('');

      // Generate org licenses (version not needed for org license pools)
      const response = await apiClient.generateOrgLicenses(
        Number(selectedProduct),
        selectedOrganization as number,
        quantity,
        expirationDays
      );

      if (response.status === 201) {
        setResult(response.data);
      } else {
        throw new Error('Failed to generate licenses');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate batch licenses. Please try again.');
      console.error('Batch generation error:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadCSV = () => {
    if (!result?.licenses) return;

    const csv =
      'License Key,Expiration Date\n' +
      result.licenses.map((l) => `${l.key},${l.expiration_date}`).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `batch_licenses_${result.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Generate Batch Licenses</h1>
          <p className="text-gray-600">Create multiple licenses in one operation (up to 10,000)</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {!result ? (
          <div className="bg-white rounded-lg shadow p-8">
            <form onSubmit={handleGenerateBatch} className="space-y-6">
              {/* Organization Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization (Optional) *
                </label>
                <select
                  value={selectedOrganization}
                  onChange={(e) => setSelectedOrganization(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                >
                  <option value="">Select an organization...</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Licenses will be assigned to the selected organization and available for team leads to assign to members
                </p>
              </div>

              {/* Product Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product *
                </label>
                <select
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                >
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity (1-10,000) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Math.min(10000, parseInt(e.target.value) || 1)))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Leave a few seconds per 100 licenses for generation</p>
              </div>

              {/* Expiration Days */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expiration (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  value={expirationDays}
                  onChange={(e) => setExpirationDays(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">How many days before licenses expire</p>
              </div>

              {/* Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Generation Summary</h3>
                <div className="text-sm text-blue-800 space-y-1">
                  {selectedOrganization && (
                    <p>• Organization: <span className="font-semibold">{organizations.find(o => o.id === selectedOrganization)?.name}</span></p>
                  )}
                  <p>• Product: <span className="font-semibold capitalize">{products.find(p => p.id === selectedProduct)?.name}</span></p>
                  <p>• Quantity: <span className="font-semibold">{quantity.toLocaleString()} licenses</span></p>
                  <p>• Expires in: <span className="font-semibold">{expirationDays} days</span></p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="flex-1 bg-gray-300 text-gray-900 font-semibold py-3 px-6 rounded-lg hover:bg-gray-400 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generating}
                  className="flex-1 bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {generating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Generating...
                    </>
                  ) : (
                    'Generate Licenses'
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
          // Success View
          <div className="bg-white rounded-lg shadow p-8">
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
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Batch Generation Complete</h2>
              <p className="text-gray-600">Your licenses have been successfully generated</p>
            </div>

            {/* Results Summary */}
            <div className="bg-gray-50 rounded-lg p-6 mb-6 space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Batch ID:</span>
                <span className="font-semibold text-gray-900">{result.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Generated:</span>
                <span className="font-semibold text-green-600">{result.generated_count.toLocaleString()}</span>
              </div>
              {result.error_count > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Errors:</span>
                  <span className="font-semibold text-red-600">{result.error_count}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Generated At:</span>
                <span className="font-semibold text-gray-900">
                  {new Date(result.created_at).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Licenses Preview */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Licenses Preview (First 10)</h3>
              <div className="bg-gray-50 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-200 border-b">
                    <tr>
                      <th className="px-4 py-2 text-left text-gray-700">License Key</th>
                      <th className="px-4 py-2 text-left text-gray-700">Expires</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.licenses.slice(0, 10).map((license, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-100">
                        <td className="px-4 py-2 font-mono text-xs">{license.key}</td>
                        <td className="px-4 py-2">
                          {new Date(license.expiration_date).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {result.licenses.length > 10 && (
                <p className="text-xs text-gray-500 mt-2">
                  ... and {result.licenses.length - 10} more licenses in the CSV file
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => router.push('/dashboard/batch/generate')}
                className="flex-1 bg-gray-300 text-gray-900 font-semibold py-3 px-6 rounded-lg hover:bg-gray-400 transition"
              >
                Generate Another Batch
              </button>
              <button
                onClick={handleDownloadCSV}
                className="flex-1 bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition"
              >
                Download CSV
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
