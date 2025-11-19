'use client';

import { AuthForm } from '@/components/auth/AuthForm';

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-muted-foreground mt-2">
            Sign in to your Allowance account to continue
          </p>
        </div>
        <AuthForm mode="login" />
      </div>
    </main>
  );
}
