'use client';

import { useState } from 'react';
import { useConditionalProtectedRoute } from '@/lib/middleware/routeProtection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function RevokeLicensesPage() {
  const { hasAccess } = useConditionalProtectedRoute(
    (perms) => perms.canAccessAdminSection(),
    '/error/permission-denied'
  );
  const [formData, setFormData] = useState({
    licenseKeyPattern: '',
    organizationId: '',
    reason: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      // TODO: Implement API call to revoke licenses
      // const response = await api.revokeLicenses(formData);
      setMessage({ type: 'success', text: 'Licenses revoked successfully' });
      setFormData({ licenseKeyPattern: '', organizationId: '', reason: '' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to revoke licenses' });
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
      <h1 className="text-3xl font-bold tracking-tight">Revoke Licenses</h1>

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

      {/* Revoke Form */}
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
          <Label htmlFor="licenseKeyPattern">License Key Pattern</Label>
          <Input
            id="licenseKeyPattern"
            name="licenseKeyPattern"
            placeholder="e.g., LIC-* or specific license key"
            value={formData.licenseKeyPattern}
            onChange={handleChange}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reason">Revocation Reason</Label>
          <textarea
            id="reason"
            name="reason"
            placeholder="Enter the reason for revoking these licenses"
            value={formData.reason}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background"
            rows={4}
          />
        </div>

        <Button type="submit" disabled={loading} variant="destructive" className="w-full">
          {loading ? 'Revoking...' : 'Revoke Licenses'}
        </Button>
      </form>
    </div>
  );
}
