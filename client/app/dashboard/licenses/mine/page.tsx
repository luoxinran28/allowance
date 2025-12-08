'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Download, AlertCircle } from 'lucide-react';
import { Loader2 } from 'lucide-react';

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
  const getFilteredLicenses = (tab: 'all' | 'active' | 'expiring' | 'expired') => {
    const now = new Date();

    switch (tab) {
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
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Licenses</h1>
        <p className="text-muted-foreground mt-2">View and manage your assigned product licenses</p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Licenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.total_licenses}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-600">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.active_count}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-yellow-600">Expiring Soon</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.expiring_soon_count}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Expired</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.expired_count}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      {!loading && (
        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">All Licenses</TabsTrigger>
            <TabsTrigger value="active">Active ({licenses.filter(l => l.status === 'active').length})</TabsTrigger>
            <TabsTrigger value="expiring">Expiring ({getFilteredLicenses('expiring').length})</TabsTrigger>
            <TabsTrigger value="expired">Expired ({getFilteredLicenses('expired').length})</TabsTrigger>
          </TabsList>

          {['all', 'active', 'expiring', 'expired'].map((tabValue) => {
            const filteredLicenses = getFilteredLicenses(tabValue as 'all' | 'active' | 'expiring' | 'expired');
            return (
            <TabsContent key={tabValue} value={tabValue} className="space-y-6">
              {filteredLicenses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredLicenses.map((license) => {
                    const expiresDate = new Date(license.expires_at);
                    const now = new Date();
                    const daysLeft = Math.ceil((expiresDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    const isExpired = daysLeft < 0;
                    const isExpiringSoon = daysLeft > 0 && daysLeft <= 30;

                    return (
                      <Card key={license.id} className={isExpired ? 'opacity-75' : ''}>
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <CardDescription>Product UPID</CardDescription>
                              <code className="block text-sm font-mono font-bold break-all">
                                {license.product_upid}
                              </code>
                            </div>
                            <Badge variant={
                              license.status === 'active' && !isExpired ? 'default' : 
                              isExpiringSoon ? 'secondary' : 'destructive'
                            }>
                              {isExpired ? 'Expired' : isExpiringSoon ? 'Expiring' : 'Active'}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Expiration Info */}
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground text-xs">Issued</p>
                              <p className="font-medium">{new Date(license.created_at).toLocaleDateString()}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs">Expires</p>
                              <p className={`font-medium ${isExpired ? 'text-red-600' : isExpiringSoon ? 'text-yellow-600' : ''}`}>
                                {expiresDate.toLocaleDateString()}
                              </p>
                              {daysLeft >= 0 && license.status === 'active' && !isExpired && (
                                <p className="text-xs text-muted-foreground">{daysLeft} days left</p>
                              )}
                            </div>
                          </div>

                          {/* Usage Limits */}
                          <div className="bg-muted p-3 rounded space-y-1 text-sm">
                            <p className="text-xs font-semibold">Usage Limits</p>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Daily:</span>
                              <span className="font-medium">
                                {license.daily_limit ? `${license.daily_limit}` : 'Unlimited'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Monthly:</span>
                              <span className="font-medium">
                                {license.monthly_limit ? `${license.monthly_limit}` : 'Unlimited'}
                              </span>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2 pt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 gap-1"
                              onClick={() => {
                                navigator.clipboard.writeText(license.product_upid);
                                alert('Copied to clipboard!');
                              }}
                            >
                              <Copy className="h-4 w-4" />
                              Copy
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 gap-1"
                              onClick={() => handleDownloadCertificate(license)}
                            >
                              <Download className="h-4 w-4" />
                              Download
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card>
                  <CardContent className="pt-8 text-center">
                    <p className="text-muted-foreground">
                      {licenses.length === 0 
                        ? 'No licenses yet. Contact your organization to request one.' 
                        : 'No licenses in this category.'}
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            );
          })}
        </Tabs>
      )}

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="pt-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3" />
            <p className="text-muted-foreground">Loading licenses...</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
