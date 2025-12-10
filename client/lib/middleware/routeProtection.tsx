'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePermission } from '@/lib/hooks/usePermission';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredTier?: 'free' | 'standard' | 'premium' | 'allstar';
  fallbackUrl?: string;
}

/**
 * 路由保护组件：根据用户权限检查是否允许访问页面
 */
export function ProtectedRoute({
  children,
  requiredTier = 'free',
  fallbackUrl = '/dashboard',
}: ProtectedRouteProps) {
  const router = useRouter();
  const perms = usePermission();

  useEffect(() => {
    // 如果用户没有所需的权限等级，重定向
    if (!perms.isTierAtLeast(requiredTier)) {
      router.push(fallbackUrl);
    }
  }, [perms, requiredTier, fallbackUrl, router]);

  // 权限检查
  if (!perms.isTierAtLeast(requiredTier)) {
    return null;
  }

  return <>{children}</>;
}

/**
 * Hook：用于在页面或组件中进行路由保护
 */
export function useProtectRoute(requiredTier: 'free' | 'standard' | 'premium' | 'allstar' = 'free') {
  const router = useRouter();
  const perms = usePermission();

  useEffect(() => {
    if (!perms.isTierAtLeast(requiredTier)) {
      router.push('/error/permission-denied');
    }
  }, [perms, requiredTier, router]);

  return {
    hasAccess: perms.isTierAtLeast(requiredTier),
    userTier: perms.getTier(),
  };
}

/**
 * Hook：根据条件进行路由保护
 */
export function useConditionalProtectedRoute(
  checkPermission: (perms: ReturnType<typeof usePermission>) => boolean,
  fallbackUrl: string = '/error/permission-denied'
) {
  const router = useRouter();
  const perms = usePermission();

  useEffect(() => {
    if (!checkPermission(perms)) {
      router.push(fallbackUrl);
    }
  }, [perms, checkPermission, fallbackUrl, router]);

  return {
    hasAccess: checkPermission(perms),
  };
}
