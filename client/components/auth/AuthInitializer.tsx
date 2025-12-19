'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/auth-store';

/**
 * 在应用启动时初始化认证状态
 * 从 localStorage 恢复用户信息和令牌
 * 这是必要的，以确保在路由保护中可以正确检查认证状态
 */
export function AuthInitializer() {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // 这是一个纯粹的初始化组件，不渲染任何 UI
  return null;
}
