'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { apiClient } from '@/lib/api-client';

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  
  const tier = searchParams.get('tier') || '';
  const intentId = searchParams.get('intent_id') || '';

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    // Simulate payment processing
    const processPayment = async () => {
      if (!intentId) {
        setError('No payment intent provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(false);
        // In production, would integrate with Stripe here
      } catch (err) {
        setError('Failed to load checkout');
        setLoading(false);
      }
    };

    processPayment();
  }, [isAuthenticated, router, intentId]);

  const handleConfirmPayment = async () => {
    if (!intentId) return;

    try {
      setProcessing(true);
      setError('');

      // Confirm payment
      const response = await apiClient.confirmPayment(intentId);

      if (response.status === 200) {
        // Redirect to success page
        router.push('/dashboard/billing/success');
      } else {
        setError('Payment failed. Please try again.');
      }
    } catch (err) {
      setError('Failed to process payment. Please try again.');
      console.error('Payment error:', err);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading checkout...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-bold mb-6">Payment</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Order Summary */}
        <div className="bg-gray-50 rounded-lg p-6 mb-8">
          <h2 className="font-semibold mb-4">Order Summary</h2>
          <div className="space-y-2 text-sm text-gray-700">
            <div className="flex justify-between">
              <span>Plan:</span>
              <span className="font-semibold capitalize">{tier}</span>
            </div>
            <div className="flex justify-between">
              <span>Billing Period:</span>
              <span className="font-semibold">1 Month</span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span className="font-semibold">Total:</span>
              <span className="font-semibold">$9.99</span>
            </div>
          </div>
        </div>

        {/* Payment Method (Mock) */}
        <div className="border border-gray-300 rounded-lg p-4 mb-8">
          <label className="flex items-center">
            <input type="radio" name="payment" defaultChecked className="mr-3" />
            <span>Credit Card (Demo Mode)</span>
          </label>
          <p className="text-xs text-gray-500 mt-2">
            This is a demo. Use test card: 4242 4242 4242 4242
          </p>
        </div>

        {/* Mock Card Form */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-semibold mb-2">Card Number</label>
            <input
              type="text"
              placeholder="4242 4242 4242 4242"
              className="w-full border border-gray-300 rounded px-3 py-2"
              defaultValue="4242 4242 4242 4242"
              disabled
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Expiry</label>
              <input
                type="text"
                placeholder="MM/YY"
                className="w-full border border-gray-300 rounded px-3 py-2"
                defaultValue="12/25"
                disabled
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">CVC</label>
              <input
                type="text"
                placeholder="123"
                className="w-full border border-gray-300 rounded px-3 py-2"
                defaultValue="123"
                disabled
              />
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-500 text-center mb-6">
          By clicking "Complete Payment", you agree to our Terms of Service
        </p>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => router.back()}
            className="flex-1 bg-gray-300 text-gray-900 font-semibold py-2 px-4 rounded hover:bg-gray-400 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmPayment}
            disabled={processing}
            className="flex-1 bg-blue-600 text-white font-semibold py-2 px-4 rounded hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? 'Processing...' : 'Complete Payment'}
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-6">
          Your payment information is secure and encrypted
        </p>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen">Loading...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
