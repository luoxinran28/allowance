'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { usePermission } from '@/lib/hooks/usePermission';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

interface TeamMember {
  user_id: number;
  email: string;
  uid: string;
  role: string;
}

interface Team {
  id: number;
  name: string;
  organization_id: number;
  created_at: string;
  [key: string]: any;
}

export default function AdminTeamDetailsPage() {
  const params = useParams();
  const teamId = Number(params.id);
  const { isAdmin } = usePermission();

  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Leader assignment state
  const [leaderConfirm, setLeaderConfirm] = useState<{
    show: boolean;
    memberId?: number;
    memberEmail?: string;
  }>({
    show: false,
  });

  useEffect(() => {
    if (!isAdmin()) {
      setError('You do not have permission to access this page');
      return;
    }
    loadTeamData();
  }, [teamId, isAdmin]);

  const loadTeamData = async () => {
    try {
      setLoading(true);
      setError('');
      console.log('Loading team data for team ID:', teamId);
      
      const [teamRes, membersRes] = await Promise.all([
        apiClient.getTeam(teamId),
        apiClient.listTeamMembers(teamId),
      ]);

      console.log('Team response:', teamRes);
      console.log('Members response:', membersRes);

      if (!teamRes.data) {
        throw new Error('Team data is empty');
      }

      setTeam(teamRes.data);
      const membersList = Array.isArray(membersRes.data) 
        ? membersRes.data 
        : Array.isArray(membersRes.data?.members)
        ? membersRes.data.members
        : [];
      setMembers(membersList);
    } catch (err: any) {
      console.error('Team load error details:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to load team';
      setError(errorMsg);
      setTeam(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePromoteToLeader = async () => {
    if (!leaderConfirm.memberId) return;

    try {
      setError('');
      setSuccess('');
      await apiClient.promoteTeamMemberToLead(teamId, leaderConfirm.memberId);
      setSuccess(`${leaderConfirm.memberEmail} has been promoted to Team Leader`);
      setLeaderConfirm({ show: false });
      await loadTeamData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to promote member');
    }
  };

  const handleDemoteLeader = async (memberId: number, memberEmail: string) => {
    try {
      setError('');
      setSuccess('');
      await apiClient.demoteTeamLead(teamId, memberId);
      setSuccess(`${memberEmail} has been demoted from Team Leader`);
      await loadTeamData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to demote member');
    }
  };

  if (!isAdmin()) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-800">
          You do not have permission to access this page.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 text-center">
        <p className="text-yellow-800">Team not found</p>
        <Link href="/admin/teams" className="text-blue-600 hover:text-blue-800 mt-4 inline-block">
          ← Back to Teams
        </Link>
      </div>
    );
  }

  const teamLeader = members.find((m) => m.role === 'leader');
  const nonLeaderMembers = members.filter((m) => m.role !== 'leader');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/admin/teams" className="text-blue-600 hover:text-blue-800">
              ← Teams
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mt-2">{team.name}</h1>
          <p className="text-gray-600 mt-1">Team ID: {team.id}</p>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      {/* Team Leader Section */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Team Leader</h2>
        {teamLeader ? (
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div>
              <p className="font-medium text-gray-900">{teamLeader.email}</p>
              <p className="text-sm text-gray-600">{teamLeader.uid}</p>
            </div>
            <button
              onClick={() => handleDemoteLeader(teamLeader.user_id, teamLeader.email)}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 text-sm font-medium transition"
            >
              Demote from Leader
            </button>
          </div>
        ) : (
          <p className="text-gray-600 text-center py-8">
            {members.length === 0 
              ? 'No members in team yet' 
              : 'No team leader assigned. Select a member below to promote.'}
          </p>
        )}
      </div>

      {/* Team Members Section */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          Team Members ({nonLeaderMembers.length})
        </h2>

        {nonLeaderMembers.length === 0 ? (
          <p className="text-gray-600 text-center py-8">No regular members yet</p>
        ) : (
          <div className="space-y-3">
            {nonLeaderMembers.map((member) => (
              <div
                key={member.user_id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                <div>
                  <p className="font-medium text-gray-900">{member.email}</p>
                  <p className="text-sm text-gray-600">{member.uid}</p>
                </div>
                <button
                  onClick={() => setLeaderConfirm({
                    show: true,
                    memberId: member.user_id,
                    memberEmail: member.email
                  })}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm font-medium transition"
                >
                  Promote to Leader
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={leaderConfirm.show}
        title="Promote to Team Leader"
        message={`Promote ${leaderConfirm.memberEmail} to Team Leader? ${
          teamLeader ? `The current leader (${teamLeader.email}) will be demoted to member.` : ''
        }`}
        isDangerous={false}
        confirmText="Promote"
        onConfirm={handlePromoteToLeader}
        onCancel={() => setLeaderConfirm({ show: false })}
      />
    </div>
  );
}
