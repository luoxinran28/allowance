'use client';

import { useEffect, useState } from 'react';
import { useConditionalProtectedRoute } from '@/lib/middleware/routeProtection';

interface TeamMember {
  id: number;
  email: string;
  name: string;
  tier: string;
  joinedDate: string;
}

export default function TeamMembersPage() {
  const { hasAccess } = useConditionalProtectedRoute(
    (perms) => perms.canAccessTeamManagement(),
    '/error/permission-denied'
  );
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!hasAccess) return;

    const loadMembers = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Mock data
        const mockMembers: TeamMember[] = [
          {
            id: 1,
            email: 'member1@allowance.test',
            name: 'Eve Developer',
            tier: 'standard',
            joinedDate: '2025-09-15',
          },
          {
            id: 2,
            email: 'member2@allowance.test',
            name: 'Frank Designer',
            tier: 'standard',
            joinedDate: '2025-09-16',
          },
          {
            id: 3,
            email: 'member3@allowance.test',
            name: 'Grace Engineer',
            tier: 'standard',
            joinedDate: '2025-09-17',
          },
        ];

        setMembers(mockMembers);
      } catch (err: any) {
        setError('Failed to load team members');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadMembers();
  }, [hasAccess]);

  const getTierColor = (tier: string) => {
    const colorMap: Record<string, string> = {
      free: 'bg-gray-100 text-gray-800',
      standard: 'bg-blue-100 text-blue-800',
      premium: 'bg-purple-100 text-purple-800',
      allstar: 'bg-red-100 text-red-800',
    };
    return colorMap[tier] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center text-muted-foreground">Loading team members...</div>
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="border border-red-200 bg-red-50 text-red-700 rounded-lg p-4">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Team Members</h1>
        <p className="text-muted-foreground mb-8">
          View and manage your team members
        </p>

        {members.length === 0 ? (
          <div className="border border-dashed border-border rounded-lg p-8 text-center">
            <p className="text-muted-foreground">No team members yet</p>
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted border-b border-border">
                <tr>
                  <th className="text-left px-6 py-3 font-semibold text-sm">Email</th>
                  <th className="text-left px-6 py-3 font-semibold text-sm">Name</th>
                  <th className="text-left px-6 py-3 font-semibold text-sm">Tier</th>
                  <th className="text-left px-6 py-3 font-semibold text-sm">Joined</th>
                  <th className="text-left px-6 py-3 font-semibold text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm">{member.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium">{member.name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTierColor(member.tier)}`}>
                        {member.tier}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-muted-foreground">
                        {new Date(member.joinedDate).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
