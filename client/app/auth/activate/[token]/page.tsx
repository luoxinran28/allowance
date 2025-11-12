'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import Link from 'next/link';

export default function ActivatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const activate = async () => {
      if (!token) {
        setStatus('error');
        setMessage('No activation token provided');
        return;
      }

      try {
        setStatus('loading');
        await apiClient.activate(token);
        setStatus('success');
        setMessage('Account activated successfully! Redirecting to login...');
        
        // Redirect to login after 2 seconds
        setTimeout(() => {
          router.push('/auth/login');
        }, 2000);
      } catch (err: any) {
        setStatus('error');
        setMessage(
          err.response?.data?.error || 
          err.message || 
          'Failed to activate account. Token may be expired.'
        );
      }
    };

    activate();
  }, [token, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow p-8">
          {status === 'loading' && (
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
              <h1 className="text-2xl font-bold mb-2">Activating Account</h1>
              <p className="text-gray-600">Please wait while we verify your email...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="bg-green-100 rounded-full p-3">
                  <svg
                    className="w-8 h-8 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              </div>
              <h1 className="text-2xl font-bold mb-2 text-green-700">Account Activated!</h1>
              <p className="text-gray-600 mb-4">{message}</p>
              <Link
                href="/auth/login"
                className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                Go to Login
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="bg-red-100 rounded-full p-3">
                  <svg
                    className="w-8 h-8 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
              </div>
              <h1 className="text-2xl font-bold mb-2 text-red-700">Activation Failed</h1>
              <p className="text-gray-600 mb-6">{message}</p>
              <div className="space-y-3">
                <Link
                  href="/auth/login"
                  className="block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 text-center"
                >
                  Back to Login
                </Link>
                <p className="text-sm text-gray-600">
                  Need help?{' '}
                  <Link href="/auth/login" className="text-blue-600 hover:underline">
                    Try logging in
                  </Link>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
