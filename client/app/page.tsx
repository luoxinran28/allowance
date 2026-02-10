'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Shield, Zap } from 'lucide-react';

export default function Home() {
  const [upid, setUpid] = useState<string | null>(null);
  const [tier, setTier] = useState<string | null>(null);

  useEffect(() => {
    // Read UPID from meta tag
    const upidMeta = document.querySelector('meta[name="allowance-upid"]');
    const tierMeta = document.querySelector('meta[name="allowance-tier"]');
    
    if (upidMeta) {
      setUpid(upidMeta.getAttribute('content'));
    }
    if (tierMeta) {
      setTier(tierMeta.getAttribute('content'));
    }
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">
              A
            </div>
            <span className="text-lg font-semibold hidden sm:inline">Allowance</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/auth/login">Sign In</Link>
            </Button>
            <Button asChild className="hidden sm:inline-flex">
              <Link href="/auth/login">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight">
            Authorization & User Management
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A comprehensive system for managing user accounts, tiers, and licenses with enterprise-grade security.
          </p>
          
          {/* Product Info Card */}
          {upid && (
            <Card className="max-w-md mx-auto">
              <CardHeader>
                <CardTitle className="text-base">Product Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Product ID:</span>
                  <span className="text-sm font-mono font-semibold">{upid}</span>
                </div>
                {tier && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Tier:</span>
                    <span className="text-sm font-semibold capitalize">{tier}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/auth/login">Sign In</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/auth/login">Create Account</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-3 gap-8">
          <Card>
            <CardHeader>
              <Shield className="h-8 w-8 mb-2 text-primary" />
              <CardTitle>Secure Authentication</CardTitle>
              <CardDescription>Enterprise-grade security with JWT tokens and password hashing</CardDescription>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader>
              <Zap className="h-8 w-8 mb-2 text-primary" />
              <CardTitle>Tier-Based Access</CardTitle>
              <CardDescription>Manage access tiers for different user types</CardDescription>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader>
              <CheckCircle2 className="h-8 w-8 mb-2 text-primary" />
              <CardTitle>License Management</CardTitle>
              <CardDescription>Track and manage product licenses and subscriptions</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/50 py-8">
        <div className="container text-center text-sm text-muted-foreground">
          <p>&copy; 2024 Allowance. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
