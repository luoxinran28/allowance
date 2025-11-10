'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { apiClient } from '@/lib/api-client';

interface Subscription {
  id: number;
  user_id: number;
  tier: string;
  status: string;
  started_at: string;
  expires_at: string;
  auto_renew: boolean;
  period_months: number;
}

interface PricingTier {
  tier: string;
  price_cents: number;
  monthly_price: number;
  features: string[];
}

export default function BillingPage() {
  const { user, isAuthenticated } = useAuthStore();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [pricing, setPricing] = useState<PricingTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const loadBillingData = async () => {
      try {
        setLoading(true);

        // Fetch current subscription
        const subResponse = await apiClient.getCurrentSubscription();
        if (subResponse.status === 200) {
          setSubscription(subResponse.data);
        }

        // Fetch pricing
        const pricingResponse = await apiClient.getPricing();
        if (pricingResponse.status === 200) {
          setPricing(pricingResponse.data);
        }
      } catch (err) {
        setError('Failed to load billing information');
        console.error('Billing load error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadBillingData();
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <Link href="/auth/login" className="text-blue-500 hover:underline">
            Sign in to view billing
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-lg">Loading billing information...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Billing & Subscription</h1>
          <p className="text-gray-600">Manage your subscription and billing information</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Current Subscription */}
        {subscription && (
          <div className="bg-white rounded-lg shadow-md p-8 mb-12">
            <h2 className="text-2xl font-bold mb-6">Current Plan</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <div className="text-sm text-gray-500 uppercase tracking-wider mb-2">
                  Current Tier
                </div>
                <div className="text-4xl font-bold text-blue-600 capitalize mb-4">
                  {subscription.tier}
                </div>
                <div className="space-y-3 text-gray-700">
                  <div>
                    <span className="text-sm font-semibold">Status:</span>
                    <span className="ml-2 inline-block px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800 capitalize">
                      {subscription.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-semibold">Renewal:</span>
                    <span className="ml-2">
                      {subscription.auto_renew ? 'Auto-renewal enabled' : 'No auto-renewal'}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-semibold">Expires:</span>
                    <span className="ml-2">
                      {new Date(subscription.expires_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col justify-center space-y-4">
                {subscription.tier !== 'enterprise' && (
                  <Link
                    href="/dashboard/billing/upgrade"
                    className="inline-block bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition text-center"
                  >
                    Upgrade Plan
                  </Link>
                )}

                {subscription.tier !== 'free' && (
                  <Link
                    href="/dashboard/billing/downgrade"
                    className="inline-block bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-gray-700 transition text-center"
                  >
                    Downgrade Plan
                  </Link>
                )}

                <button
                  onClick={() => {
                    // Toggle auto-renewal
                    apiClient.toggleAutoRenew(!subscription.auto_renew);
                  }}
                  className="inline-block bg-gray-200 text-gray-800 font-semibold py-3 px-6 rounded-lg hover:bg-gray-300 transition"
                >
                  {subscription.auto_renew ? 'Disable Auto-renewal' : 'Enable Auto-renewal'}
                </button>

                {subscription.status === 'active' && (
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to cancel your subscription?')) {
                        apiClient.cancelSubscription();
                      }
                    }}
                    className="inline-block bg-red-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-red-700 transition"
                  >
                    Cancel Subscription
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Pricing Plans */}
        {pricing.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Available Plans</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {pricing.map((tier) => (
                <div
                  key={tier.tier}
                  className={`rounded-lg shadow-md p-8 flex flex-col ${
                    subscription?.tier === tier.tier
                      ? 'border-2 border-blue-600 bg-blue-50'
                      : 'bg-white'
                  }`}
                >
                  <h3 className="text-2xl font-bold mb-2 capitalize">{tier.tier}</h3>
                  <div className="text-3xl font-bold text-gray-900 mb-6">
                    ${tier.monthly_price}/mo
                  </div>

                  <ul className="space-y-3 mb-8 flex-grow">
                    {tier.features.map((feature, idx) => (
                      <li key={idx} className="text-gray-700 flex items-start">
                        <span className="text-green-500 mr-3 font-bold">✓</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {subscription?.tier === tier.tier ? (
                    <button disabled className="w-full bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg cursor-not-allowed">
                      Current Plan
                    </button>
                  ) : (
                    <Link
                      href={`/dashboard/billing/checkout?tier=${tier.tier}`}
                      className="w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition text-center"
                    >
                      Select Plan
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Billing History */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold mb-6">Billing History</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Description</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Amount</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">December 1, 2024</td>
                  <td className="py-3 px-4">Monthly subscription - Pro</td>
                  <td className="py-3 px-4">$9.99</td>
                  <td className="py-3 px-4">
                    <span className="inline-block px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                      Paid
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
