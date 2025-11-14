'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/hooks/useAuth';
import { StatusBadge } from '@/components/common/StatusBadge';

interface License {
  id: number;
  user_id: number;
  product_upid: string;
  status: 'active' | 'pending' | 'expired' | 'revoked';
  created_at: string;
  expires_at: string;
  daily_limit: number | null;
  monthly_limit: number | null;
  current_usage?: number;
}

interface LicenseSummary {
  total_licenses: number;
  active_count: number;
  expiring_soon_count: number;
  expired_count: number;
}

/**
 * User's License View Page
 * 
 * Displays:
 * - All assigned licenses (active, pending, expired, revoked)
 * - License summary statistics
 * - Individual license cards with:
 *   - Product UPID
 *   - Status badge
 *   - Expiration date
 *   - Usage metrics (if applicable)
 *   - Download/Copy license buttons
 */
export default function MyLicensesPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  // State
  const [licenses, setLicenses] = useState<License[]>([]);
  const [summary, setSummary] = useState<LicenseSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'all' | 'active' | 'expiring' | 'expired'>('all');

  // Fetch licenses
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    const fetchLicenses = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get user's licenses
        const licenseResponse = await (apiClient as any).client.get('/user/licenses');
        setLicenses(licenseResponse.data.licenses || []);

        // Get license summary
        const summaryResponse = await (apiClient as any).client.get('/licenses/summary');
        setSummary(summaryResponse.data);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load licenses');
        console.error('Error fetching licenses:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLicenses();
  }, [isAuthenticated, router]);

  // Filter licenses based on tab
  const getFilteredLicenses = () => {
    const now = new Date();

    switch (selectedTab) {
      case 'active':
        return licenses.filter((l) => l.status === 'active');
      case 'expiring':
        return licenses.filter((l) => {
          const expiresDate = new Date(l.expires_at);
          const daysUntilExpiry = (expiresDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
          return l.status === 'active' && daysUntilExpiry > 0 && daysUntilExpiry <= 30;
        });
      case 'expired':
        return licenses.filter((l) => l.status === 'expired' || l.status === 'revoked');
      default:
        return licenses;
    }
  };

  const filteredLicenses = getFilteredLicenses();

  const handleCopyToClipboard = (upid: string) => {
    navigator.clipboard.writeText(upid);
    alert('Product UPID copied to clipboard!');
  };

  const handleDownloadCertificate = (license: License) => {
    // This would typically generate a PDF or text file
    const text = `LICENSE CERTIFICATE
    
Product UPID: ${license.product_upid}
Status: ${license.status}
Issued: ${new Date(license.created_at).toLocaleDateString()}
Expires: ${new Date(license.expires_at).toLocaleDateString()}
${license.daily_limit ? `Daily Limit: ${license.daily_limit}` : 'Daily Limit: Unlimited'}
${license.monthly_limit ? `Monthly Limit: ${license.monthly_limit}` : 'Monthly Limit: Unlimited'}`;

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', `license-${license.product_upid}-${license.id}.txt`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (!isAuthenticated) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">My Licenses</h1>
        <p className="text-gray-600 mt-1">View and manage your assigned product licenses</p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded shadow">
            <div className="text-sm text-gray-600">Total Licenses</div>
            <div className="text-3xl font-bold text-gray-900">{summary.total_licenses}</div>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <div className="text-sm text-gray-600">Active</div>
            <div className="text-3xl font-bold text-green-600">{summary.active_count}</div>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <div className="text-sm text-gray-600">Expiring Soon</div>
            <div className="text-3xl font-bold text-yellow-600">{summary.expiring_soon_count}</div>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <div className="text-sm text-gray-600">Expired</div>
            <div className="text-3xl font-bold text-gray-600">{summary.expired_count}</div>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="flex gap-8 px-6">
          {(['all', 'active', 'expiring', 'expired'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`py-4 font-medium text-sm border-b-2 ${
                selectedTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8 text-gray-600">Loading licenses...</div>
      )}

      {/* Licenses Grid */}
      {!loading && (
        <>
          {filteredLicenses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredLicenses.map((license) => {
                const expiresDate = new Date(license.expires_at);
                const now = new Date();
                const daysLeft = Math.ceil((expiresDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

                return (
                  <div
                    key={license.id}
                    className="bg-white border border-gray-200 rounded-lg shadow hover:shadow-lg transition-shadow p-6 space-y-4"
                  >
                    {/* Header */}
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-sm text-gray-600">Product UPID</div>
                        <code className="block text-xl font-mono font-bold text-gray-900 mt-1">
                          {license.product_upid}
                        </code>
                      </div>
                      <StatusBadge status={license.status} />
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4 py-3 border-y">
                      <div>
                        <div className="text-xs text-gray-600">Issued</div>
                        <div className="font-medium">
                          {new Date(license.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600">Expires</div>
                        <div className={`font-medium ${daysLeft < 0 ? 'text-red-600' : daysLeft < 7 ? 'text-orange-600' : ''}`}>
                          {expiresDate.toLocaleDateString()}
                          {daysLeft >= 0 && license.status === 'active' && (
                            <div className="text-xs text-gray-600">{daysLeft} days left</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Limits */}
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="text-xs font-semibold text-gray-700 mb-2">Usage Limits</div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Daily:</span>
                          <span className="font-medium">
                            {license.daily_limit ? `${license.daily_limit} requests` : 'Unlimited'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Monthly:</span>
                          <span className="font-medium">
                            {license.monthly_limit ? `${license.monthly_limit} requests` : 'Unlimited'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => handleCopyToClipboard(license.product_upid)}
                        className="flex-1 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded border border-blue-200"
                      >
                        Copy UPID
                      </button>
                      <button
                        onClick={() => handleDownloadCertificate(license)}
                        className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded border border-gray-300"
                      >
                        Download
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-600">
              {licenses.length === 0 ? (
                <div>
                  <div className="text-4xl mb-2">📭</div>
                  <p>No licenses yet. <a href="/dashboard/licenses/request" className="text-blue-600 hover:underline">Request a license</a></p>
                </div>
              ) : (
                <p>No {selectedTab} licenses found.</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
