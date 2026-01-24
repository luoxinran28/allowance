'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { apiClient } from '@/lib/api-client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { PaginationNav } from '@/components/common/PaginationNav';
import { Plus, Trash2, Download } from 'lucide-react';

// ============================================
// Types
// ============================================

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

interface OrgProductLicense {
  id: number;
  organization_id: number;
  product_id: number;
  total_count: number;
  assigned_count: number;
  available_count: number;
  created_by?: number;
  expires_at: string;
}

interface Product {
  id: string;
  name: string;
}

interface Organization {
  id: number;
  name: string;
}

interface RevokeResult {
  id: string;
  revoked_count: number;
  failed_count: number;
  revoked_licenses: Array<{
    key: string;
    status: string;
  }>;
}

interface License {
  id: string;
  key: string;
  product_id: string;
  status: string;
  created_at: string;
  expires_at: string;
  assigned_to?: string;
}

// ============================================
// Tab Components
// ============================================

// Assign to Organization Tab
function AssignToOrgTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedOrganization, setSelectedOrganization] = useState<number | ''>('');
  const [quantity, setQuantity] = useState(1);
  const [expirationDays, setExpirationDays] = useState(365);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<BatchGenerateResponse | OrgProductLicense | null>(null);

  useEffect(() => {
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

        const orgsList = Array.isArray(orgsResponse.data?.organizations)
          ? orgsResponse.data.organizations
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
  }, []);

  const handleGenerateBatch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProduct || quantity < 1 || quantity > 10000 || !selectedOrganization) {
      setError('Please fill in all fields with valid values');
      return;
    }

    try {
      setGenerating(true);
      setError('');

      const response = await apiClient.generateOrgLicenses(
        Number(selectedProduct),
        selectedOrganization as number,
        quantity,
        expirationDays
      );

      if (response.status === 201 || response.status === 200) {
        if (response.data && response.data.licenses) {
          setResult(response.data);
        } else if (response.data && typeof response.data.total_count === 'number') {
          setResult(response.data);
        } else {
          throw new Error('Invalid response format: missing licenses');
        }
      } else {
        throw new Error(`Unexpected status code: ${response.status}`);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to generate batch licenses.';
      setError(errorMsg);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadCSV = () => {
    if (!result || !('licenses' in result) || !result.licenses) return;

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
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {!result ? (
        <div className="bg-white rounded-lg border border-border p-8">
          <form onSubmit={handleGenerateBatch} className="space-y-6">
            {/* Organization Selection */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Organization *
              </label>
              <select
                value={selectedOrganization}
                onChange={(e) => setSelectedOrganization(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-background"
              >
                <option value="">Select an organization...</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Licenses will be assigned to this organization's quota pool
              </p>
            </div>

            {/* Product Selection */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Product *
              </label>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-background"
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
              <label className="block text-sm font-medium text-foreground mb-2">
                Quantity (1-10,000) *
              </label>
              <input
                type="number"
                min="1"
                max="10000"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Math.min(10000, parseInt(e.target.value) || 1)))}
                className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-background"
              />
            </div>

            {/* Expiration Days */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Expiration (Days)
              </label>
              <input
                type="number"
                min="1"
                value={expirationDays}
                onChange={(e) => setExpirationDays(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-background"
              />
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

            {/* Action Button */}
            <button
              type="submit"
              disabled={generating}
              className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Generate Licenses
                </>
              )}
            </button>
          </form>
        </div>
      ) : (
        // Success View
        <div className="bg-white rounded-lg border border-border p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Generation Complete</h2>
            <p className="text-muted-foreground">Licenses have been successfully generated</p>
          </div>

          {/* Results Summary */}
          <div className="bg-muted rounded-lg p-6 mb-6 space-y-3">
            {'licenses' in result ? (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Batch ID:</span>
                  <span className="font-semibold">{(result as BatchGenerateResponse).id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Generated:</span>
                  <span className="font-semibold text-green-600">{(result as BatchGenerateResponse).generated_count.toLocaleString()}</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">License ID:</span>
                  <span className="font-semibold">{(result as OrgProductLicense).id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Quota:</span>
                  <span className="font-semibold text-green-600">{(result as OrgProductLicense).total_count.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Available:</span>
                  <span className="font-semibold text-green-600">{(result as OrgProductLicense).available_count.toLocaleString()}</span>
                </div>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={() => setResult(null)}
              className="flex-1 bg-muted text-foreground font-semibold py-3 px-6 rounded-lg hover:bg-muted/80 transition"
            >
              Generate Another
            </button>
            {'licenses' in result && (
              <button
                onClick={handleDownloadCSV}
                className="flex-1 bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition"
              >
                <Download className="h-4 w-4 mr-2 inline" />
                Download CSV
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Revoke Licenses Tab
function RevokeLicensesTab() {
  const [revokeMode, setRevokeMode] = useState<'keys' | 'batch'>('keys');
  const [licenseKeys, setLicenseKeys] = useState('');
  const [batchId, setBatchId] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<RevokeResult | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

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
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  if (result) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Revocation Complete</h2>
          <p className="text-muted-foreground">Licenses have been successfully revoked</p>
        </div>

        <div className="bg-white rounded-lg border border-border p-8">
          <div className="mb-8 space-y-4">
            <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
              <span className="text-foreground">Successfully Revoked:</span>
              <span className="text-2xl font-bold text-green-600">{result.revoked_count}</span>
            </div>

            {result.failed_count > 0 && (
              <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg">
                <span className="text-foreground">Failed to Revoke:</span>
                <span className="text-2xl font-bold text-red-600">{result.failed_count}</span>
              </div>
            )}
          </div>

          {/* Revoked Licenses List */}
          {result.revoked_licenses.length > 0 && (
            <div className="mb-8">
              <h3 className="font-semibold text-foreground mb-3">Revoked Licenses</h3>
              <div className="bg-muted rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="px-4 py-2 text-left text-foreground">License Key</th>
                      <th className="px-4 py-2 text-left text-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.revoked_licenses.slice(0, 20).map((license, idx) => (
                      <tr key={idx} className="border-b border-border">
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
                <p className="text-xs text-muted-foreground mt-2">
                  ... and {result.revoked_licenses.length - 20} more licenses
                </p>
              )}
            </div>
          )}

          <button
            onClick={() => {
              setLicenseKeys('');
              setBatchId('');
              setReason('');
              setResult(null);
            }}
            className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition"
          >
            Revoke More Licenses
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg border border-border p-8">
        {/* Mode Selector */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-foreground mb-3">
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
              <span className="ml-2 text-foreground">Revoke by License Keys</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                checked={revokeMode === 'batch'}
                onChange={() => setRevokeMode('batch')}
                className="h-4 w-4 text-blue-600"
              />
              <span className="ml-2 text-foreground">Revoke by Batch ID</span>
            </label>
          </div>
        </div>

        {/* Keys Input */}
        {revokeMode === 'keys' && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              License Keys (one per line) *
            </label>
            <textarea
              value={licenseKeys}
              onChange={(e) => setLicenseKeys(e.target.value)}
              placeholder="LICENSE-KEY-001&#10;LICENSE-KEY-002&#10;LICENSE-KEY-003"
              className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent font-mono text-sm bg-background"
              rows={6}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {getKeyList().length} keys entered
            </p>
          </div>
        )}

        {/* Batch ID Input */}
        {revokeMode === 'batch' && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              Batch ID *
            </label>
            <input
              type="text"
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              placeholder="e.g., BATCH-2024-001234"
              className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-background"
            />
            <p className="text-xs text-muted-foreground mt-1">
              All licenses in this batch will be revoked
            </p>
          </div>
        )}

        {/* Reason */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-foreground mb-2">
            Reason for Revocation (optional)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Customer requested refund, License misuse, Duplicate purchase"
            className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-background"
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

        {/* Action Button */}
        <button
          onClick={() => setShowConfirm(true)}
          disabled={
            loading ||
            (revokeMode === 'keys' && getKeyList().length === 0) ||
            (revokeMode === 'batch' && !batchId.trim())
          }
          className="w-full bg-red-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Revoke Licenses
        </button>
      </div>

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

// Export & Reports Tab
function ExportReportsTab() {
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
    loadLicenses();
  }, [page, pageSize, filterStatus, filterProduct]);

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

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg border border-border p-6">
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Filter by Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-background"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="revoked">Revoked</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Filter by Product
            </label>
            <select
              value={filterProduct}
              onChange={(e) => {
                setFilterProduct(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-background"
            >
              <option value="all">All Products</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Page Size
            </label>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value));
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-background"
            >
              <option value="25">25 per page</option>
              <option value="50">50 per page</option>
              <option value="100">100 per page</option>
            </select>
          </div>
        </div>
      </div>

      {/* Export Options */}
      <div className="bg-white rounded-lg border border-border p-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-foreground mb-3">Export Format</h3>
            <div className="space-y-2">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  checked={exportFormat === 'csv'}
                  onChange={() => setExportFormat('csv')}
                  className="h-4 w-4 text-blue-600"
                />
                <span className="ml-2 text-foreground">CSV (Spreadsheet)</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  checked={exportFormat === 'json'}
                  onChange={() => setExportFormat('json')}
                  className="h-4 w-4 text-blue-600"
                />
                <span className="ml-2 text-foreground">JSON (Data Exchange)</span>
              </label>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-3">Selection</h3>
            <p className="text-sm text-muted-foreground mb-2">
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
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={licenses.length > 0 && selectedLicenses.size === licenses.length}
                      onChange={toggleAllOnPage}
                      className="h-4 w-4 text-blue-600"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-foreground font-semibold">License Key</th>
                  <th className="px-4 py-3 text-left text-foreground font-semibold">Product</th>
                  <th className="px-4 py-3 text-left text-foreground font-semibold">Status</th>
                  <th className="px-4 py-3 text-left text-foreground font-semibold">Created</th>
                  <th className="px-4 py-3 text-left text-foreground font-semibold">Expires</th>
                </tr>
              </thead>
              <tbody>
                {licenses.map((license) => (
                  <tr key={license.id} className="border-b border-border hover:bg-muted/50">
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
                    <td className="px-4 py-3">{new Date(license.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">{new Date(license.expires_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {total > pageSize && (
        <div className="flex justify-center">
          <PaginationNav
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* Export Button */}
      <button
        onClick={handleExport}
        disabled={licenses.length === 0}
        className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
      >
        <Download className="h-4 w-4 mr-2" />
        Download as {exportFormat.toUpperCase()}
        {selectedLicenses.size > 0 && ` (${selectedLicenses.size} selected)`}
      </button>
    </div>
  );
}

// ============================================
// Main Page Component
// ============================================

export default function AdminLicensesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuthStore();
  
  // Get tab from URL or default to 'assign'
  const tabParam = searchParams.get('tab');
  const defaultTab = tabParam && ['assign', 'revoke', 'export'].includes(tabParam) ? tabParam : 'assign';

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push('/auth/login');
      return;
    }

    // Strict permission check: allstar only
    if (user.tier !== 'allstar') {
      router.push('/error/permission-denied');
      return;
    }
  }, [isAuthenticated, user, router]);

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', value);
    router.push(`/admin/licenses?${params.toString()}`);
  };

  if (!isAuthenticated || !user || user.tier !== 'allstar') {
    return <div className="p-8 text-center">Redirecting...</div>;
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">License Management</h1>
          <p className="text-muted-foreground">
            Manage organization licenses: assign quotas, revoke licenses, and export data
          </p>
        </div>

        <Tabs value={defaultTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="assign" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Assign to Organization
            </TabsTrigger>
            <TabsTrigger value="revoke" className="flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              Revoke Licenses
            </TabsTrigger>
            <TabsTrigger value="export" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export & Reports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assign">
            <AssignToOrgTab />
          </TabsContent>

          <TabsContent value="revoke">
            <RevokeLicensesTab />
          </TabsContent>

          <TabsContent value="export">
            <ExportReportsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
