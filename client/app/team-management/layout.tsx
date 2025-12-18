'use client';

import { useAuthStore } from '@/lib/auth-store';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';

export default function TeamManagementLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push('/auth/login');
      return;
    }

    // 权限检查：standard+ 用户
    if (user.tier !== 'standard' && user.tier !== 'premium' && user.tier !== 'allstar') {
      router.push('/error/permission-denied');
      return;
    }
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated || !user || (user.tier !== 'standard' && user.tier !== 'premium' && user.tier !== 'allstar')) {
    return <div className="p-8 text-center">Redirecting...</div>;
  }

  return (
    <div className="flex">
      <Sidebar isOpen={true} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
