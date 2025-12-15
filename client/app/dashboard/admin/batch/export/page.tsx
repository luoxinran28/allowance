'use client';

import { useState } from 'react';
import { useConditionalProtectedRoute } from '@/lib/middleware/routeProtection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle2, Download } from 'lucide-react';

export default function ExportLicensesPage() {
  const { hasAccess } = useConditionalProtectedRoute(
    (perms) => perms.canAccessAdminSection(),
    '/error/permission-denied'
  );
  const [formData, setFormData] = useState({
    organizationId: '',
    productId: '',
    status: 'all',
    format: 'csv',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      // TODO: Implement API call to export licenses
      // const response = await api.exportLicenses(formData);
      // Download file logic
      setMessage({ type: 'success', text: 'Licenses exported successfully' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to export licenses' });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!hasAccess) {
    return null;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Export Licenses</h1>

      {/* Message Alert */}
      {message && (
        <div className={`flex items-center gap-3 rounded-lg p-4 ${
          message.type === 'success'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Export Form */}
      <form onSubmit={handleSubmit} className="border border-border rounded-lg p-6 space-y-6">
        <div className="space-y-2">
          <Label htmlFor="organizationId">Organization</Label>
          <Input
            id="organizationId"
            name="organizationId"
            placeholder="Select organization"
            value={formData.organizationId}
            onChange={handleChange}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="productId">Product (Optional)</Label>
          <Input
            id="productId"
            name="productId"
            placeholder="Leave empty to export all products"
            value={formData.productId}
            onChange={handleChange}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="status">License Status</Label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="revoked">Revoked</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="format">Export Format</Label>
            <select
              id="format"
              name="format"
              value={formData.format}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background"
            >
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
              <option value="xlsx">Excel</option>
            </select>
          </div>
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          <Download className="h-4 w-4 mr-2" />
          {loading ? 'Exporting...' : 'Export Licenses'}
        </Button>
      </form>
    </div>
  );
}
