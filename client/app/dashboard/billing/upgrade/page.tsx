'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { apiClient } from '@/lib/api-client';

interface PricingTier {
  tier: string;
  price_cents: number;
  monthly_price: number;
  features: string[];
}

export default function UpgradePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [pricing, setPricing] = useState<PricingTier[]>([]);
  const [selectedTier, setSelectedTier] = useState('');
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    const loadPricing = async () => {
      try {
        const response = await apiClient.getPricing();
        if (response.status === 200) {
          setPricing(response.data);
          // Set first available tier as default
          if (response.data.length > 0) {
            setSelectedTier(response.data[0].tier);
          }
        }
      } catch (err) {
        setError('Failed to load pricing information');
        console.error('Pricing load error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPricing();
  }, [isAuthenticated, router]);

  const handleUpgrade = async () => {
    if (!selectedTier) return;

    try {
      setUpgrading(true);
      setError('');

      // Create payment intent
      const intentResponse = await apiClient.createPaymentIntent(selectedTier, 1);

      if (intentResponse.status !== 201) {
        throw new Error('Failed to create payment intent');
      }

      // Redirect to payment page
      router.push(`/dashboard/billing/checkout?tier=${selectedTier}&intent_id=${intentResponse.data.id}`);
    } catch (err) {
      setError('Failed to initiate upgrade. Please try again.');
      console.error('Upgrade error:', err);
    } finally {
      setUpgrading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Upgrade Your Plan</h1>
          <p className="text-gray-600">Choose a plan that fits your needs</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Plan Selector */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {pricing.map((tier) => (
            <div
              key={tier.tier}
              onClick={() => setSelectedTier(tier.tier)}
              className={`rounded-lg border-2 p-6 cursor-pointer transition ${
                selectedTier === tier.tier
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <h3 className="text-2xl font-bold capitalize mb-2">{tier.tier}</h3>
              <div className="text-3xl font-bold text-gray-900 mb-6">
                ${tier.monthly_price}/mo
              </div>

              <ul className="space-y-2 text-sm text-gray-700">
                {tier.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start">
                    <span className="text-green-500 mr-2 font-bold">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex items-center justify-center">
                <input
                  type="radio"
                  name="tier"
                  value={tier.tier}
                  checked={selectedTier === tier.tier}
                  onChange={(e) => setSelectedTier(e.target.value)}
                  className="h-4 w-4 text-blue-600"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        {selectedTier && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">Upgrade Summary</h2>
            <div className="space-y-2 text-gray-700">
              <div className="flex justify-between">
                <span>Selected Plan:</span>
                <span className="font-semibold capitalize">{selectedTier}</span>
              </div>
              <div className="flex justify-between">
                <span>Billing Cycle:</span>
                <span className="font-semibold">Monthly</span>
              </div>
              <div className="flex justify-between pt-4 border-t">
                <span className="font-semibold">Next Billing Date:</span>
                <span className="font-semibold">
                  {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                </span>
              </div>
            </div>
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
            onClick={handleUpgrade}
            disabled={upgrading || !selectedTier}
            className="flex-1 bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {upgrading ? 'Processing...' : 'Proceed to Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}
