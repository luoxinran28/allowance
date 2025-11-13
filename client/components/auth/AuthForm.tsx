'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';

interface AuthFormProps {
  mode: 'login' | 'register';
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [upid, setUpid] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Read UPID from meta tag on component mount
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const upidMeta = document.querySelector('meta[name="allowance-upid"]') as HTMLMetaElement;
      if (upidMeta?.content) {
        setUpid(upidMeta.content);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'register') {
        await apiClient.register(email, password);
        setError('');
        router.push(`/auth/activate?email=${email}`);
      } else {
        // Login with UPID if available, otherwise fallback to old login
        const loginPromise = upid
          ? apiClient.loginWithUpid(email, password, upid)
          : apiClient.login(email, password);
        
        const response = await loginPromise;
        const { user, token } = response.data;
        setAuth(user, token);
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-bold mb-6 text-center">
          {mode === 'login' ? 'Sign In' : 'Create Account'}
        </h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {upid && (
          <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4 text-sm">
            Product: {upid}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              minLength={8}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Loading...' : (mode === 'register' ? 'Register' : 'Sign In')}
          </button>
        </form>

        {mode === 'login' && (
          <p className="mt-4 text-center text-sm text-gray-600">
            <Link href="/auth/reset-password" className="text-blue-600 hover:underline">
              Forgot password?
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
