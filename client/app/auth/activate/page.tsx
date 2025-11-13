'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';

function ActivateForm() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const activateAccount = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setError('No activation token provided');
        setLoading(false);
        return;
      }

      try {
        await apiClient.activate(token);
        setSuccess(true);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to activate account');
      } finally {
        setLoading(false);
      }
    };

    activateAccount();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md mx-auto">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h1 className="text-xl font-semibold mb-2">Activating Account</h1>
            <p className="text-gray-600">Please wait while we activate your account...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          {success ? (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-green-600 mb-2">Account Activated!</h1>
              <p className="text-gray-600 mb-6">
                Your account has been successfully activated. You can now sign in to your account.
              </p>
              <Link
                href="/auth/login"
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 inline-block"
              >
                Sign In
              </Link>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-red-600 mb-2">Activation Failed</h1>
              <p className="text-gray-600 mb-6">{error}</p>
              <div className="space-y-3">
                <Link
                  href="/auth/login"
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 inline-block text-center"
                >
                  Back to Sign In
                </Link>
                <p className="text-sm text-gray-500">
                  Need a new activation link? <Link href="/auth/login" className="text-blue-600 hover:underline">Register again</Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ActivatePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md mx-auto">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <ActivateForm />
    </Suspense>
  );
}