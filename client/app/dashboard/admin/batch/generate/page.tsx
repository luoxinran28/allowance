'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useConditionalProtectedRoute } from '@/lib/middleware/routeProtection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface Organization {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  upid?: string;
}

export default function GenerateLicensesPage() {
  const { hasAccess } = useConditionalProtectedRoute(
    (perms) => perms.canAccessAdminSection(),
    '/error/permission-denied'
  );
  
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  
  const [formData, setFormData] = useState({
    organizationId: '',
    productId: '',
    quantity: '10',
    expiryDays: '365',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [orgsRes, productsRes] = await Promise.all([
        apiClient.listOrganizations(),
        apiClient.listProducts(),
      ]);
      setOrganizations(orgsRes.data || []);
      setProducts(productsRes.data || []);
    } catch (error) {
      console.error('Failed to load organizations or products:', error);
      setMessage({ type: 'error', text: 'Failed to load organizations or products' });
    } finally {
      setLoadingData(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.organizationId) {
      setMessage({ type: 'error', text: 'Please select an organization' });
      return;
    }
    
    if (!formData.productId) {
      setMessage({ type: 'error', text: 'Please select a product' });
      return;
    }

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
          {loadingData ? (
            <div className="text-gray-500">Loading organizations...</div>
          ) : (
            <select
              id="organizationId"
              name="organizationId"
              value={formData.organizationId}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              required
            >
              <option value="">-- Select organization --</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="productId">Product</Label>
          {loadingData ? (
            <div className="text-gray-500">Loading products...</div>
          ) : (
            <select
              id="productId"
              name="productId"
              value={formData.productId}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              required
            >
              <option value="">-- Select product --</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} {product.upid && `(${product.upid})`}
                </option>
              ))}
            </select>
          )}
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

        <Button type="submit" disabled={loading || loadingData} className="w-full">
          {loading ? 'Generating...' : 'Generate Licenses'}
        </Button>
      </form>
    </div>
  );
}
