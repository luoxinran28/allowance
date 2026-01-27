'use client';

import { useAuthStore } from '@/lib/auth-store';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';

export default function TeamManagementLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialized(true);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isInitialized) return;

    if (!isAuthenticated || !user) {
      router.push('/auth/login');
      return;
    }

    // 权限检查：standard+ 用户
    if (user.tier !== 'standard' && user.tier !== 'premium' && user.tier !== 'allstar') {
      router.push('/error/permission-denied');
      return;
    }
  }, [isAuthenticated, user, router, isInitialized]);

  if (!isInitialized) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (!isAuthenticated || !user || (user.tier !== 'standard' && user.tier !== 'premium' && user.tier !== 'allstar')) {
    return <div className="p-8 text-center">Redirecting...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar isOpen={true} />
        <main className="flex-1 ml-64">{children}</main>
      </div>
    </div>
  );
}
