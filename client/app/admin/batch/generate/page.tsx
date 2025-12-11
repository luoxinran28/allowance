'use client';

import { useState } from 'react';
import { useConditionalProtectedRoute } from '@/lib/middleware/routeProtection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function GenerateLicensesPage() {
  const { hasAccess } = useConditionalProtectedRoute(
    (perms) => perms.canAccessAdminSection(),
    '/error/permission-denied'
  );
  const [formData, setFormData] = useState({
    organizationId: '',
    productId: '',
    quantity: '10',
    expiryDays: '365',
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
      // TODO: Implement API call to generate licenses
      // const response = await api.generateLicenses(formData);
      setMessage({ type: 'success', text: 'Licenses generated successfully' });
      setFormData({ organizationId: '', productId: '', quantity: '10', expiryDays: '365' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to generate licenses' });
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
      <h1 className="text-3xl font-bold tracking-tight">Generate Licenses</h1>

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

      {/* Generate Form */}
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
          <Label htmlFor="productId">Product</Label>
          <Input
            id="productId"
            name="productId"
            placeholder="Select product"
            value={formData.productId}
            onChange={handleChange}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              name="quantity"
              type="number"
              min="1"
              value={formData.quantity}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiryDays">Expiry Days</Label>
            <Input
              id="expiryDays"
              name="expiryDays"
              type="number"
              min="1"
              value={formData.expiryDays}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Generating...' : 'Generate Licenses'}
        </Button>
      </form>
    </div>
  );
}
