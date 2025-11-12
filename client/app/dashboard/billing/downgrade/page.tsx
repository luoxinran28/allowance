'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { apiClient } from '@/lib/api-client';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

interface PricingTier {
  tier: string;
  price_cents: number;
  monthly_price: number;
  features: string[];
}

interface CurrentSubscription {
  tier: string;
  monthly_price: number;
  next_billing_date: string;
  billing_cycle_days: number;
}

export default function DowngradePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [pricing, setPricing] = useState<PricingTier[]>([]);
  const [currentSub, setCurrentSub] = useState<CurrentSubscription | null>(null);
  const [selectedTier, setSelectedTier] = useState('');
  const [loading, setLoading] = useState(true);
  const [downgrading, setDowngrading] = useState(false);
  const [error, setError] = useState('');
  const [prorationAmount, setProrationAmount] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        const [pricingRes, subRes] = await Promise.all([
          apiClient.getPricing(),
          apiClient.getCurrentSubscription(),
        ]);

        if (pricingRes.status === 200) {
          setPricing(pricingRes.data);
        }

        if (subRes.status === 200) {
          setCurrentSub(subRes.data);
          // Default selected tier to free or first available lower tier
          const currentTierIndex = pricingRes.data.findIndex(
            (t: PricingTier) => t.tier === subRes.data.tier
          );
          if (currentTierIndex > 0) {
            setSelectedTier(pricingRes.data[0].tier);
          }
        }
      } catch (err) {
        setError('Failed to load subscription information');
        console.error('Data load error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isAuthenticated, router]);

  // Calculate pro-ration credit
  useEffect(() => {
    if (!currentSub || !selectedTier) {
      setProrationAmount(0);
      return;
    }

    try {
      // Get selected tier price
      const newTier = pricing.find((t) => t.tier === selectedTier);
      if (!newTier || !currentSub) {
        setProrationAmount(0);
        return;
      }

      const currentPrice = currentSub.monthly_price * 100; // in cents
      const newPrice = newTier.monthly_price * 100;

      // Calculate days remaining in cycle
      const nextBilling = new Date(currentSub.next_billing_date);
      const today = new Date();
      const daysRemaining = Math.ceil(
        (nextBilling.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      const cycleRatio = daysRemaining / currentSub.billing_cycle_days;

      // Pro-ration credit = (current price - new price) * days remaining / cycle days
      const credit = (currentPrice - newPrice) * cycleRatio;
      setProrationAmount(Math.round(credit) / 100);
    } catch (err) {
      console.error('Proration calculation error:', err);
      setProrationAmount(0);
    }
  }, [selectedTier, currentSub, pricing]);

  const handleDowngrade = async () => {
    if (!selectedTier || !currentSub) return;

    try {
      setDowngrading(true);
      setError('');

      const response = await apiClient.downgradeTier(selectedTier);

      if (response.status === 200) {
        // Success - redirect to dashboard
        router.push('/dashboard?message=downgrade_successful');
      } else {
        throw new Error('Failed to downgrade subscription');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to process downgrade. Please try again.');
      console.error('Downgrade error:', err);
    } finally {
      setDowngrading(false);
      setShowConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!currentSub) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
            No active subscription found. You may be on a free plan.
          </div>
        </div>
      </div>
    );
  }

  const availableTiers = pricing.filter(
    (t) => pricing.findIndex((x) => x.tier === currentSub.tier) > pricing.findIndex((x) => x.tier === t.tier)
  );

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Downgrade Your Plan</h1>
          <p className="text-gray-600">
            Your current plan: <span className="font-semibold capitalize">{currentSub.tier}</span>
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {availableTiers.length === 0 ? (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded">
            You are already on the lowest available plan.
          </div>
        ) : (
          <>
            {/* Plan Selector */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {availableTiers.map((tier) => (
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

            {/* Summary with Pro-ration */}
            {selectedTier && (
              <div className="bg-white rounded-lg shadow p-6 mb-8">
                <h2 className="text-xl font-bold mb-4">Downgrade Summary</h2>
                <div className="space-y-3 text-gray-700">
                  <div className="flex justify-between">
                    <span>Current Plan:</span>
                    <span className="font-semibold capitalize">{currentSub.tier}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>New Plan:</span>
                    <span className="font-semibold capitalize">{selectedTier}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Current Monthly Cost:</span>
                    <span className="font-semibold">${currentSub.monthly_price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>New Monthly Cost:</span>
                    <span className="font-semibold">
                      ${pricing.find((t) => t.tier === selectedTier)?.monthly_price.toFixed(2)}
                    </span>
                  </div>

                  {prorationAmount > 0 && (
                    <div className="pt-3 border-t">
                      <div className="flex justify-between bg-green-50 p-3 rounded text-green-900">
                        <span className="font-semibold">Pro-ration Credit:</span>
                        <span className="font-bold">${prorationAmount.toFixed(2)}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Credit applied on {new Date(currentSub.next_billing_date).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  <div className="flex justify-between pt-4 border-t font-semibold">
                    <span>Effective Date:</span>
                    <span>{new Date(currentSub.next_billing_date).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Warning Message */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8">
              <h3 className="font-semibold text-amber-900 mb-2">Important Information</h3>
              <ul className="text-sm text-amber-800 space-y-1">
                <li>• Your downgrade will take effect on your next billing date</li>
                <li>• Features not available in the new plan will be disabled</li>
                <li>• Active licenses may be affected based on your new plan limits</li>
                <li>• You can upgrade at any time</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => router.back()}
                className="flex-1 bg-gray-300 text-gray-900 font-semibold py-3 px-6 rounded-lg hover:bg-gray-400 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowConfirm(true)}
                disabled={downgrading || !selectedTier}
                className="flex-1 bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {downgrading ? 'Processing...' : 'Confirm Downgrade'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showConfirm}
        title="Confirm Downgrade"
        message={`Are you sure you want to downgrade from ${currentSub.tier} to ${selectedTier}? This change will take effect on your next billing date. ${
          prorationAmount > 0 ? `You will receive a credit of $${prorationAmount.toFixed(2)}.` : ''
        }`}
        confirmText="Downgrade"
        cancelText="Cancel"
        isLoading={downgrading}
        isDangerous={true}
        onConfirm={handleDowngrade}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}
