'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { RoleTag } from '@/components/common/RoleTag';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

interface TeamMember {
  user_id: number;
  email: string;
  uid: string;
  role: string;
}

interface OrgMember {
  id: number;
  email: string;
  uid: string;
}

interface Team {
  id: number;
  name: string;
  created_at: string;
}

export default function TeamDetailsPage() {
  const params = useParams();
  const teamId = Number(params.id);

  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; memberId?: number }>({
    show: false,
  });
  const [promoteConfirm, setPromoteConfirm] = useState<{
    show: boolean;
    memberId?: number;
    memberEmail?: string;
    action?: 'promote' | 'demote';
  }>({
    show: false,
  });

  useEffect(() => {
    loadTeamData();
  }, [teamId]);

  const loadTeamData = async () => {
    try {
      setLoading(true);
      const [teamRes, membersRes] = await Promise.all([
        apiClient.getTeam(teamId),
        apiClient.listTeamMembers(teamId),
      ]);
      setTeam(teamRes.data);
      
      const membersList = Array.isArray(membersRes.data) ? membersRes.data : [];
      setMembers(membersList);

      // Get current user's role
      const currentUser = membersList.find((m: any) => m.role);
      if (currentUser) {
        setCurrentUserRole(currentUser.role);
      }

      // Load organization members
      try {
        const usersRes = await apiClient.listUsers();
        const allUsers = Array.isArray(usersRes.data?.users)
          ? usersRes.data.users
          : Array.isArray(usersRes.data)
          ? usersRes.data
          : [];

        // Filter to only show users not already in team
        const existingUserIds = new Set(membersList.map((m: any) => m.user_id));
        const availableUsers = allUsers.filter(
          (u: any) => !existingUserIds.has(u.id)
        );
        setOrgMembers(availableUsers);
      } catch (err) {
        console.error('Failed to load org members');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load team');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId) {
      setError('Please select a member');
      return;
    }

    try {
      setIsAdding(true);
      setError('');
      const userId = Number(selectedMemberId);
      // For now, pass empty array - full product selection will be added later
      await apiClient.addTeamMember(teamId, userId, [], 'member');
      setSelectedMemberId('');
      setShowAddMember(false);
      await loadTeamData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add member');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!deleteConfirm.memberId) return;

    try {
      await apiClient.removeTeamMember(teamId, deleteConfirm.memberId);
      setDeleteConfirm({ show: false });
      await loadTeamData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to remove member');
    }
  };

  const handlePromoteTeamMember = async () => {
    if (!promoteConfirm.memberId) return;

    try {
      if (promoteConfirm.action === 'promote') {
        await apiClient.promoteTeamMemberToLead(teamId, promoteConfirm.memberId);
        setError('');
      } else if (promoteConfirm.action === 'demote') {
        await apiClient.demoteTeamLead(teamId, promoteConfirm.memberId);
        setError('');
      }
      setPromoteConfirm({ show: false });
      await loadTeamData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update member role');
    }
  };

  const isTeamAdmin = currentUserRole === 'admin';

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-700">Team not found</p>
        <Link href="/dashboard/teams" className="text-blue-600 hover:underline mt-4 inline-block">
          Back to Teams
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <Link href="/dashboard/teams" className="text-blue-600 hover:underline text-sm mb-2 inline-block">
            ← Back to Teams
          </Link>
          <h1 className="text-3xl font-bold">{team.name}</h1>
          <p className="text-gray-600 mt-2">
            Created {new Date(team.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href={`/dashboard/teams/${teamId}/licenses`}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
          >
            Manage Licenses
          </Link>
          {(currentUserRole === 'leader' || isTeamAdmin) && (
            <button
              onClick={() => setShowAddMember(!showAddMember)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              {showAddMember ? 'Cancel' : '+ Add Member'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {showAddMember && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Add Team Member</h2>
          <form onSubmit={handleAddMember} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Member from Organization
              </label>
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">-- Choose a member --</option>
                {orgMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.email} ({member.uid})
                  </option>
                ))}
              </select>
              {orgMembers.length === 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  All organization members are already in this team
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isAdding || !selectedMemberId}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                {isAdding ? 'Adding...' : 'Add Member'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddMember(false)}
                className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold">Team Members ({members.length})</h2>
        </div>

        {members.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p>No members in this team yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">UID</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Role</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.user_id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{member.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{member.uid}</td>
                    <td className="px-6 py-4 text-sm">
                      <RoleTag role={member.role} />
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2 flex-wrap">
                        {isTeamAdmin && (
                          <>
                            {member.role !== 'leader' ? (
                              <button
                                onClick={() =>
                                  setPromoteConfirm({
                                    show: true,
                                    memberId: member.user_id,
                                    memberEmail: member.email,
                                    action: 'promote',
                                  })
                                }
                                className="text-green-600 hover:text-green-800 font-medium"
                                title="Promote to Team Lead"
                              >
                                Promote
                              </button>
                            ) : (
                              <button
                                onClick={() =>
                                  setPromoteConfirm({
                                    show: true,
                                    memberId: member.user_id,
                                    memberEmail: member.email,
                                    action: 'demote',
                                  })
                                }
                                className="text-yellow-600 hover:text-yellow-800 font-medium"
                                title="Demote from Team Lead"
                              >
                                Demote
                              </button>
                            )}
                            <button
                              onClick={() => setDeleteConfirm({ show: true, memberId: member.user_id })}
                              className="text-red-600 hover:text-red-800 font-medium"
                            >
                              Remove
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={deleteConfirm.show}
        title="Remove Team Member"
        message="Are you sure you want to remove this member from the team?"
        confirmText="Remove"
        isDangerous
        onConfirm={handleRemoveMember}
        onCancel={() => setDeleteConfirm({ show: false })}
      />

      <ConfirmDialog
        isOpen={promoteConfirm.show}
        title={promoteConfirm.action === 'promote' ? 'Promote to Team Lead' : 'Demote from Team Lead'}
        message={
          promoteConfirm.action === 'promote'
            ? `Promote ${promoteConfirm.memberEmail} to Team Lead? They will be able to assign licenses to team members.`
            : `Demote ${promoteConfirm.memberEmail} from Team Lead? They will lose license management permissions.`
        }
        confirmText={promoteConfirm.action === 'promote' ? 'Promote' : 'Demote'}
        isDangerous={promoteConfirm.action === 'demote'}
        onConfirm={handlePromoteTeamMember}
        onCancel={() => setPromoteConfirm({ show: false })}
      />
    </div>
  );
}
