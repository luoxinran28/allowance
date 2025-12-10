'use client';

import { useAuthStore } from '@/lib/auth-store';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    setIsLoading(false);
  }, [user, router]);

  if (isLoading || !user) {
    return (
      <div className="p-8">
        <div className="text-center text-muted-foreground">Loading profile...</div>
      </div>
    );
  }

  const getTierLabel = (tier: string) => {
    const tierMap: Record<string, string> = {
      free: 'Free User',
      standard: 'Standard Employee / Team Leader',
      premium: 'Organization Boss',
      allstar: 'System Administrator',
    };
    return tierMap[tier] || tier;
  };

  const getTierColor = (tier: string) => {
    const colorMap: Record<string, string> = {
      free: 'bg-gray-100 text-gray-800',
      standard: 'bg-blue-100 text-blue-800',
      premium: 'bg-purple-100 text-purple-800',
      allstar: 'bg-red-100 text-red-800',
    };
    return colorMap[tier] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      valid: 'bg-green-100 text-green-800',
      expired: 'bg-red-100 text-red-800',
      not_assigned: 'bg-yellow-100 text-yellow-800',
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-8">
      <div className="max-w-3xl">
        <h1 className="text-3xl font-bold mb-8">My Profile</h1>

        <div className="grid gap-6">
          {/* Basic Info Card */}
          <div className="border border-border rounded-lg p-6 bg-card">
            <h2 className="text-lg font-semibold mb-4">Account Information</h2>
            <div className="grid gap-4">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="font-medium text-muted-foreground">Email</span>
                <span className="text-foreground">{user.email}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="font-medium text-muted-foreground">User ID</span>
                <span className="text-foreground font-mono">{user.uid}</span>
              </div>
            </div>
          </div>

          {/* Tier & License Info Card */}
          <div className="border border-border rounded-lg p-6 bg-card">
            <h2 className="text-lg font-semibold mb-4">Permission & License</h2>
            <div className="grid gap-4">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="font-medium text-muted-foreground">Product Tier</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTierColor(user.tier)}`}>
                  {getTierLabel(user.tier)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="font-medium text-muted-foreground">License Status</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(user.licenseStatus)}`}>
                  {user.licenseStatus.replace(/_/g, ' ').toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Organization & Team Info Card */}
          <div className="border border-border rounded-lg p-6 bg-card">
            <h2 className="text-lg font-semibold mb-4">Organization & Teams</h2>
            <div className="grid gap-4">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="font-medium text-muted-foreground">Organization</span>
                <span className="text-foreground">
                  {user.organizationId ? `Organization ID: ${user.organizationId}` : 'Not Assigned'}
                </span>
              </div>
              <div className="flex justify-between items-start py-2">
                <span className="font-medium text-muted-foreground">Teams</span>
                <div className="text-right">
                  {user.teamIds && user.teamIds.length > 0 ? (
                    <div className="flex flex-col items-end gap-1">
                      {user.teamIds.map((teamId) => (
                        <span key={teamId} className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded text-sm">
                          Team ID: {teamId}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">No teams assigned</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Registration Info Card */}
          <div className="border border-border rounded-lg p-6 bg-card">
            <h2 className="text-lg font-semibold mb-4">Registration Details</h2>
            <div className="grid gap-4">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="font-medium text-muted-foreground">Registration Source Product</span>
                <span className="text-foreground">
                  {user.source_upid || 'Not specified'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="font-medium text-muted-foreground">Joined On</span>
                <span className="text-foreground">
                  {new Date(user.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
