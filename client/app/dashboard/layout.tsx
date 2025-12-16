'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, initialize } = useAuthStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // Initialize auth store from localStorage
    initialize();
    
    // After initialize is called, wait for state to update before checking auth
    const checkAuthTimer = setTimeout(() => {
      setAuthChecked(true);
    }, 150);
    
    return () => clearTimeout(checkAuthTimer);
  }, [initialize]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (authChecked && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [authChecked, isAuthenticated, router]);

  if (!authChecked) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Sidebar isOpen={isSidebarOpen} />
        <main className="flex-1 p-8">
          <Button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="lg:hidden fixed bottom-4 right-4 rounded-full shadow-lg h-12 w-12 p-0"
            title="Toggle sidebar"
          >
            <Menu className="h-6 w-6" />
          </Button>
          {children}
        </main>
      </div>
    </div>
  );
}
