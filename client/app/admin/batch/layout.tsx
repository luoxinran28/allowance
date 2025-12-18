'use client';

import { useAuthStore } from '@/lib/auth-store';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';

export default function AdminBatchLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push('/auth/login');
      return;
    }

    // 严格权限检查：仅 allstar 用户
    if (user.tier !== 'allstar') {
      router.push('/error/permission-denied');
      return;
    }
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated || !user || user.tier !== 'allstar') {
    return <div className="p-8 text-center">Redirecting...</div>;
  }

  return children;
}
