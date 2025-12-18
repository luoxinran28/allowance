'use client';

import { useAuthStore } from '@/lib/auth-store';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push('/auth/login');
      return;
    }

    // 所有已认证用户都可以访问用户中心（free+）
    // 无需额外权限检查
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated || !user) {
    return <div className="p-8 text-center">Redirecting...</div>;
  }

  return (
    <div className="flex">
      <Sidebar isOpen={true} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
