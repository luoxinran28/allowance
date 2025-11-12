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
  role: string;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; memberId?: number }>({
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
      setMembers(Array.isArray(membersRes.data) ? membersRes.data : []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load team');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberEmail.trim()) {
      setError('Email is required');
      return;
    }

    try {
      setIsAdding(true);
      // Extract user_id or use email as identifier
      // Since API expects user_id, this is simplified - adjust based on actual API
      await apiClient.addTeamMember(teamId, 0); // API needs updating or use email lookup
      setNewMemberEmail('');
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
        <button
          onClick={() => setShowAddMember(!showAddMember)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          {showAddMember ? 'Cancel' : '+ Add Member'}
        </button>
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
                Member Email
              </label>
              <input
                type="email"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="member@example.com"
                required
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isAdding}
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
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Role</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.user_id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{member.email}</td>
                    <td className="px-6 py-4 text-sm">
                      <RoleTag role={member.role} />
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => setDeleteConfirm({ show: true, memberId: member.user_id })}
                        className="text-red-600 hover:text-red-800 font-medium"
                      >
                        Remove
                      </button>
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
    </div>
  );
}
