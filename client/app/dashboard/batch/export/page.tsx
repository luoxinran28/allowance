'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { apiClient } from '@/lib/api-client';
import { PaginationNav } from '@/components/common/PaginationNav';

interface License {
  id: string;
  key: string;
  product_id: string;
  status: string;
  created_at: string;
  expires_at: string;
  assigned_to?: string;
}

export default function BatchExportPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [licenses, setLicenses] = useState<License[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterProduct, setFilterProduct] = useState('all');
  const [selectedLicenses, setSelectedLicenses] = useState<Set<string>>(new Set());
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    loadLicenses();
  }, [isAuthenticated, router, page, pageSize, filterStatus, filterProduct]);

  const loadLicenses = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getLicenses(page, pageSize, {
        status: filterStatus === 'all' ? undefined : filterStatus,
        product_id: filterProduct === 'all' ? undefined : filterProduct,
      });

      if (response.status === 200) {
        setLicenses(response.data.licenses);
        setTotal(response.data.total);
      }
    } catch (err) {
      setError('Failed to load licenses');
      console.error('Licenses load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleLicense = (licenseId: string) => {
    const newSelected = new Set(selectedLicenses);
    if (newSelected.has(licenseId)) {
      newSelected.delete(licenseId);
    } else {
      newSelected.add(licenseId);
    }
    setSelectedLicenses(newSelected);
  };

  const toggleAllOnPage = () => {
    const newSelected = new Set(selectedLicenses);
    if (newSelected.size === licenses.length) {
      licenses.forEach((l) => newSelected.delete(l.id));
    } else {
      licenses.forEach((l) => newSelected.add(l.id));
    }
    setSelectedLicenses(newSelected);
  };

  const handleExport = () => {
    const toExport = selectedLicenses.size > 0
      ? licenses.filter((l) => selectedLicenses.has(l.id))
      : licenses;

    if (toExport.length === 0) {
      setError('No licenses to export');
      return;
    }

    if (exportFormat === 'csv') {
      exportCSV(toExport);
    } else {
      exportJSON(toExport);
    }
  };

  const exportCSV = (licensesToExport: License[]) => {
    const csv =
      'License Key,Product ID,Status,Created,Expires,Assigned To\n' +
      licensesToExport
        .map(
          (l) =>
            `"${l.key}","${l.product_id}","${l.status}","${new Date(l.created_at).toLocaleDateString()}","${new Date(l.expires_at).toLocaleDateString()}","${l.assigned_to || 'N/A'}"`
        )
        .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `licenses_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = (licensesToExport: License[]) => {
    const json = JSON.stringify(
      {
        exported_at: new Date().toISOString(),
        total_licenses: licensesToExport.length,
        filters: {
          status: filterStatus,
          product: filterProduct,
        },
        licenses: licensesToExport,
      },
      null,
      2
    );

    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `licenses_export_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading && licenses.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Export Licenses</h1>
          <p className="text-gray-600">Download your licenses in CSV or JSON format</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="revoked">Revoked</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Product
              </label>
              <select
                value={filterProduct}
                onChange={(e) => {
                  setFilterProduct(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              >
                <option value="all">All Products</option>
                <option value="product-001">Product 1</option>
                <option value="product-002">Product 2</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Page Size
              </label>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(parseInt(e.target.value));
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              >
                <option value="25">25 per page</option>
                <option value="50">50 per page</option>
                <option value="100">100 per page</option>
              </select>
            </div>
          </div>
        </div>

        {/* Export Options */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Export Format</h3>
              <div className="space-y-2">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    checked={exportFormat === 'csv'}
                    onChange={() => setExportFormat('csv')}
                    className="h-4 w-4 text-blue-600"
                  />
                  <span className="ml-2 text-gray-700">CSV (Spreadsheet)</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    checked={exportFormat === 'json'}
                    onChange={() => setExportFormat('json')}
                    className="h-4 w-4 text-blue-600"
                  />
                  <span className="ml-2 text-gray-700">JSON (Data Exchange)</span>
                </label>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Selection</h3>
              <p className="text-sm text-gray-600 mb-2">
                {selectedLicenses.size > 0
                  ? `${selectedLicenses.size} license(s) selected`
                  : 'Export all licenses on current page or select specific ones'}
              </p>
              <button
                onClick={() => setSelectedLicenses(new Set())}
                className="text-sm text-blue-600 hover:underline"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>

        {/* Licenses Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={
                        licenses.length > 0 && selectedLicenses.size === licenses.length
                      }
                      onChange={toggleAllOnPage}
                      className="h-4 w-4 text-blue-600"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-gray-700 font-semibold">
                    License Key
                  </th>
                  <th className="px-4 py-3 text-left text-gray-700 font-semibold">
                    Product
                  </th>
                  <th className="px-4 py-3 text-left text-gray-700 font-semibold">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-gray-700 font-semibold">
                    Created
                  </th>
                  <th className="px-4 py-3 text-left text-gray-700 font-semibold">
                    Expires
                  </th>
                </tr>
              </thead>
              <tbody>
                {licenses.map((license) => (
                  <tr key={license.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedLicenses.has(license.id)}
                        onChange={() => toggleLicense(license.id)}
                        className="h-4 w-4 text-blue-600"
                      />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{license.key}</td>
                    <td className="px-4 py-3">{license.product_id}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          license.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : license.status === 'revoked'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {license.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {new Date(license.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {new Date(license.expires_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {total > pageSize && (
          <div className="mb-6 flex justify-center">
            <PaginationNav
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => router.back()}
            className="flex-1 bg-gray-300 text-gray-900 font-semibold py-3 px-6 rounded-lg hover:bg-gray-400 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={licenses.length === 0}
            className="flex-1 bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 16v-4m0 0V8m0 4h4m-4 0H8"
              />
            </svg>
            Download as {exportFormat.toUpperCase()}
            {selectedLicenses.size > 0 && ` (${selectedLicenses.size} selected)`}
          </button>
        </div>
      </div>
    </div>
  );
}
