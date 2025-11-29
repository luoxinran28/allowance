'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

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
  const [success, setSuccess] = useState('');
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
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'register') {
        // Use UPID from meta tag or default
        const sourceUpid = upid || process.env.NEXT_PUBLIC_PRODUCT_UPID || 'UALLOWANCE0001';
        await apiClient.register(email, password, sourceUpid);
        setSuccess('Registration successful! Check your email to activate your account.');
        setTimeout(() => {
          router.push(`/auth/activate?email=${encodeURIComponent(email)}`);
        }, 2000);
      } else {
        // Login with UPID if available
        const response = await apiClient.login(email, password, upid || undefined);
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
      <Card>
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </CardTitle>
          <CardDescription>
            {mode === 'login'
              ? 'Enter your credentials to access your account'
              : 'Register for a new account to get started'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-4 border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          {upid && (
            <div className="mb-4 p-3 rounded-lg border border-border bg-muted">
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold">Product:</span> {upid}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder={mode === 'register' ? 'Min. 8 characters' : 'Enter your password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                disabled={loading}
              />
              {mode === 'register' && (
                <p className="text-xs text-muted-foreground">
                  Password must be at least 8 characters long
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Loading...' : (mode === 'register' ? 'Create Account' : 'Sign In')}
            </Button>
          </form>

          <div className="mt-6 space-y-3">
            {mode === 'login' && (
              <>
                <p className="text-center text-sm text-muted-foreground">
                  <Link href="/auth/reset-password" className="text-primary hover:underline font-medium">
                    Forgot your password?
                  </Link>
                </p>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-background text-muted-foreground">or</span>
                  </div>
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  Don't have an account?{' '}
                  <Link href="/auth/login" className="text-primary hover:underline font-medium">
                    Create one
                  </Link>
                </p>
              </>
            )}
            {mode === 'register' && (
              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link href="/auth/login" className="text-primary hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
