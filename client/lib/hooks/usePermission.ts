'use client';

import { useAuthStore } from '../auth-store';
import { useMemo } from 'react';

/**
 * Hook for tier-based permission checking (Four-Tier System)
 * Tiers: free < standard < premium < allstar (admin)
 * Returns an object with various permission checking utilities
 */
export function usePermission() {
  const { user } = useAuthStore();

  // Map tiers to permissions
  const tierPermissions = useMemo(() => {
    if (!user) return [];

    // Permission matrix: free < standard < premium < allstar
    const permissions: Record<string, string[]> = {
      free: [
        'user:read_self',
        'product:read',
        'team:read',
      ],
      standard: [
        // Team Member permissions
        'user:read_self',
        'user:read_team',
        'product:read',
        'team:read',
        'team:manage_members', // Can add members to OWN teams
      ],
      premium: [
        // Organization Boss permissions
        'user:read_self',
        'user:read_team',
        'user:read_org',
        'product:read',
        'product:assign',
        'team:read',
        'team:create',
        'team:update',
        'team:delete',
        'team:manage_members',
        'org:read',
        'org:manage',
        'license:read',
        'license:manage',
      ],
      allstar: [
        // Admin permissions (full access)
        'admin:*',
        'user:*',
        'product:*',
        'team:*',
        'org:*',
        'license:*',
      ],
    };

    const userTier = user?.tier || 'free';
    const tierHierarchy = ['free', 'standard', 'premium', 'allstar'];
    const userTierIndex = tierHierarchy.indexOf(userTier);

    // Accumulate permissions from all lower tiers
    let accumulated: string[] = [];
    for (let i = 0; i <= userTierIndex; i++) {
      accumulated = accumulated.concat(permissions[tierHierarchy[i]] || []);
    }

    return accumulated;
  }, [user]);

  return {
    // Check if user has a specific permission
    hasPermission: (permission: string): boolean => {
      // Admin (allstar) has everything
      if (user?.tier === 'allstar') return true;
      // Check wildcard match
      if (tierPermissions.includes('admin:*')) return true;
      // Check specific permission
      return tierPermissions.includes(permission);
    },

    // Check if user has any of the permissions in the list
    hasAnyPermission: (permissionList: string[]): boolean => {
      return permissionList.some((p) => this.hasPermission(p));
    },

    // Check if user has all permissions in the list
    hasAllPermissions: (permissionList: string[]): boolean => {
      return permissionList.every((p) => this.hasPermission(p));
    },

    // Tier-based checks
    isFree: (): boolean => user?.tier === 'free',
    isStandard: (): boolean => user?.tier === 'standard',
    isPremium: (): boolean => user?.tier === 'premium',
    isAllstar: (): boolean => user?.tier === 'allstar',
    isAdmin: (): boolean => user?.tier === 'allstar',

    // Tier level comparison
    getTier: (): string => user?.tier || 'free',

    getTierLevel: (): number => {
      const tierLevels: Record<string, number> = {
        free: 1,
        standard: 2,
        premium: 3,
        allstar: 4,
      };
      return tierLevels[user?.tier || 'free'] || 0;
    },

    // Check if user tier is at least the specified level
    isTierAtLeast: (minTier: 'free' | 'standard' | 'premium' | 'allstar'): boolean => {
      const tierLevels: Record<string, number> = {
        free: 1,
        standard: 2,
        premium: 3,
        allstar: 4,
      };
      return (
        tierLevels[user?.tier || 'free'] >= tierLevels[minTier]
      );
    },

    // Sidebar visibility
    canAccessAdminSection: (): boolean => {
      return user?.tier === 'allstar';
    },

    canAccessOrgLicenseSection: (): boolean => {
      return ['premium', 'allstar'].includes(user?.tier || '');
    },

    canAccessTeamManagement: (): boolean => {
      return ['standard', 'premium', 'allstar'].includes(user?.tier || '');
    },

    // Resource operations
    canCreateTeam: (): boolean => {
      return ['premium', 'allstar'].includes(user?.tier || '');
    },

    canDeleteTeam: (): boolean => {
      return ['premium', 'allstar'].includes(user?.tier || '');
    },

    canAddTeamMember: (): boolean => {
      return ['standard', 'premium', 'allstar'].includes(user?.tier || '');
    },

    canManageOrganization: (): boolean => {
      return ['premium', 'allstar'].includes(user?.tier || '');
    },

    // Get all user's permissions
    getPermissions: (): string[] => {
      return [...tierPermissions];
    },

    // Check if user is authenticated
    isAuthenticated: (): boolean => {
      return !!user;
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
