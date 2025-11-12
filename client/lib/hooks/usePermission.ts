'use client';

import { useAuthStore } from '../auth-store';
import { useMemo } from 'react';

/**
 * Hook for comprehensive permission and role checking
 * Returns an object with various permission checking utilities
 */
export function usePermission() {
  const { user } = useAuthStore();

  const permissions = useMemo(() => {
    if (!user) return [];

    // Map roles to permissions
    // This is a client-side reference - actual permissions validated on backend
    const rolePermissions: Record<string, string[]> = {
      admin: [
        'user:read',
        'user:create',
        'user:update',
        'user:delete',
        'product:read',
        'product:create',
        'product:update',
        'product:delete',
        'team:read',
        'team:create',
        'team:update',
        'team:delete',
        'team:manage_members',
        'org:read',
        'org:create',
        'org:update',
        'org:delete',
        'admin:approvals',
        'admin:settings',
      ],
      team_leader: [
        'user:read',
        'product:read',
        'team:read',
        'team:manage_members',
        'org:read',
      ],
      standard_employee: [
        'user:read',
        'product:read',
        'team:read',
        'org:read',
      ],
      free_user: ['user:read', 'product:read', 'team:read', 'org:read'],
    };

    const userRole = user.roles?.[0] || 'free_user';
    return rolePermissions[userRole] || [];
  }, [user]);

  return {
    // Check if user has a specific permission
    hasPermission: (permission: string): boolean => {
      return permissions.includes(permission);
    },

    // Check if user has any of the permissions in the list
    hasAnyPermission: (permissionList: string[]): boolean => {
      return permissionList.some((p) => permissions.includes(p));
    },

    // Check if user has all permissions in the list
    hasAllPermissions: (permissionList: string[]): boolean => {
      return permissionList.every((p) => permissions.includes(p));
    },

    // Check if user is admin
    isAdmin: (): boolean => {
      return user?.roles?.includes('admin') || false;
    },

    // Check if user is team leader
    isTeamLeader: (): boolean => {
      return user?.roles?.includes('team_leader') || false;
    },

    // Check if user is standard employee
    isStandardEmployee: (): boolean => {
      return user?.roles?.includes('standard_employee') || false;
    },

    // Check if user is on free tier
    isFreeTier: (): boolean => {
      return user?.tier === 'free' || false;
    },

    // Check if user is on premium tier
    isPremiumTier: (): boolean => {
      return user?.tier === 'premium' || false;
    },

    // Get user's current role
    getRole: (): string => {
      return user?.roles?.[0] || 'free_user';
    },

    // Get all user's permissions
    getPermissions: (): string[] => {
      return [...permissions];
    },

    // Check if user can access a resource
    canAccess: (resource: string, action: string = 'read'): boolean => {
      const permission = `${resource}:${action}`;
      return permissions.includes(permission);
    },

    // Check if user is authenticated
    isAuthenticated: (): boolean => {
      return !!user;
    },

    // Get user tier level (numeric for comparison)
    getTierLevel: (): number => {
      const tiers: Record<string, number> = {
        free: 1,
        standard: 2,
        premium: 3,
      };
      return tiers[user?.tier || 'free'] || 0;
    },

    // Check if user tier is at least the specified level
    isTierAtLeast: (minTier: 'free' | 'standard' | 'premium'): boolean => {
      const tiers: Record<string, number> = {
        free: 1,
        standard: 2,
        premium: 3,
      };
      return (
        tiers[user?.tier || 'free'] >= tiers[minTier]
      );
    },
  };
}

/**
 * Legacy: Check if user has a specific permission
 * @deprecated Use usePermission().hasPermission() instead
 */
export function usePermissionCheck(permissionCode: string): boolean {
  const { hasPermission } = usePermission();
  return hasPermission(permissionCode);
}

/**
 * Legacy: Get all user permissions
 * @deprecated Use usePermission().getPermissions() instead
 */
export function useUserPermissions(): string[] {
  const { getPermissions } = usePermission();
  return getPermissions();
}
