'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

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
      <main className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <h2 className="text-lg font-semibold">Activating Account</h2>
            <p className="text-sm text-muted-foreground">Please wait while we activate your account...</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (success) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center pb-3">
            <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-green-600">Account Activated!</CardTitle>
            <CardDescription className="text-base text-foreground font-medium mt-2">
              Your account has been successfully activated
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              You can now sign in to your account and start using Allowance.
            </p>
            <Button asChild className="w-full">
              <Link href="/auth/login">Sign In to Account</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-3">
          <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-red-600">Activation Failed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="space-y-3">
            <Button asChild className="w-full" variant="default">
              <Link href="/auth/login">Back to Sign In</Link>
            </Button>
            <Button asChild className="w-full" variant="outline">
              <Link href="/auth/login">Register Again</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

export default function ActivatePage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </main>
    }>
      <ActivateForm />
    </Suspense>
  );
}