'use client';

import { useAuthStore } from '@/lib/auth-store';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // 给 AuthInitializer 足够的时间来加载 localStorage 数据
    const timer = setTimeout(() => {
      setIsInitialized(true);
    }, 50);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // 只在初始化完成后检查认证状态
    if (!isInitialized) return;

    if (!isAuthenticated || !user) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, user, router, isInitialized]);

  // 等待初始化完成
  if (!isInitialized) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  // 检查认证状态
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
