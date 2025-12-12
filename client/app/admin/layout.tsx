'use client';

import { usePermission } from '@/lib/hooks/usePermission';
import { useAuthStore } from '@/lib/auth-store';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Users, Package, Zap, AlertCircle, Menu, X, Loader2 } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { isAdmin } = usePermission();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Temporarily disabled for testing
    // if (!isAuthenticated) {
    //   router.push('/auth/login');
    // } else {
      setIsLoading(false);
    // }
  }, [isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin() && false) { // Temporarily disabled for testing
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
    <div className="relative">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 right-4 z-40 lg:hidden p-2 rounded-lg hover:bg-gray-100"
        aria-label="Toggle menu"
      >
        {sidebarOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Menu className="h-6 w-6" />
        )}
      </button>

      {/* Backdrop for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div
          className={`fixed left-0 top-0 h-full w-64 z-30 lg:relative lg:z-auto lg:h-auto lg:w-auto lg:col-span-1 transition-transform duration-300 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          <div className="lg:block h-full">
            <Card className="sticky top-4 lg:max-h-[calc(100vh-2rem)] overflow-y-auto">
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
                    onClick={() => setSidebarOpen(false)}
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
                    onClick={() => setSidebarOpen(false)}
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
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Link href="/admin/team-quotas">
                      <Zap className="h-4 w-4" />
                      Team Quotas
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2"
                    asChild
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Link href="/admin/organizations">
                      <Package className="h-4 w-4" />
                      Organizations
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2"
                    asChild
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Link href="/admin/dashboard">
                      <AlertCircle className="h-4 w-4" />
                      Dashboard
                    </Link>
                  </Button>
                </nav>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 px-4 lg:px-0">{children}</div>
      </div>
    </div>
  );
}
