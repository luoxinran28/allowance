'use client';

import { usePermission } from '@/lib/hooks/usePermission';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Users, Package, Zap, AlertCircle } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAdmin } = usePermission();

  if (!isAdmin()) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Access Denied</strong> - You don't have permission to access the admin panel. Only administrators can access this area.
          </AlertDescription>
        </Alert>
        <Button asChild>
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Sidebar */}
      <div className="lg:col-span-1">
        <Card className="sticky top-4">
          <CardHeader>
            <CardTitle className="text-lg">Administration</CardTitle>
            <CardDescription>System management tools</CardDescription>
          </CardHeader>
          <CardContent>
            <nav className="space-y-2">
              <Button
                variant="ghost"
                className="w-full justify-start gap-2"
                asChild
              >
                <Link href="/admin/users">
                  <Users className="h-4 w-4" />
                  Users
                </Link>
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-2"
                asChild
              >
                <Link href="/admin/products">
                  <Package className="h-4 w-4" />
                  Products
                </Link>
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-2"
                asChild
              >
                <Link href="/admin/team-quotas">
                  <Zap className="h-4 w-4" />
                  Team Quotas
                </Link>
              </Button>
            </nav>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="lg:col-span-3">{children}</div>
    </div>
  );
}
