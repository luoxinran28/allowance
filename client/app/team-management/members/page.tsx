'use client';

import { useEffect, useState } from 'react';
import { useConditionalProtectedRoute } from '@/lib/middleware/routeProtection';
import { apiClient } from '@/lib/api-client';
import { UserPlus } from 'lucide-react';
import { AddMemberModal } from '@/components/team-management/AddMemberModal';
import { EditMemberModal } from '@/components/team-management/EditMemberModal';

// ============================================
// Types
// ============================================

interface Organization {
  id: number;
  name: string;
  org_id: string;
}

interface Team {
  id: number;
  name: string;
  team_id: string;
  organization_id: number;
}

interface TeamMember {
  user_id: number;
  uid: string;
  email: string;
  tier: string;
  role: string;
  products: string[];
}

// ============================================
// Main Page
// ============================================

export default function TeamMembersPage() {
  const { hasAccess } = useConditionalProtectedRoute(
    (perms) => perms.canAccessTeamManagement(),
    '/error/permission-denied'
  );
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<number | ''>('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [availableTeams, setAvailableTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | ''>('');
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(false);
  const [error, setError] = useState('');

  // Modal states
  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false);
  const [editMemberModalOpen, setEditMemberModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  // Load organizations and teams on mount
  useEffect(() => {
    if (!hasAccess) return;

    const loadData = async () => {
      try {
        setLoading(true);
        setError('');

        const [orgsRes, teamsRes] = await Promise.all([
          apiClient.listOrganizations(1, 100),
          apiClient.listTeams(),
        ]);

        // Parse organizations
        let orgsList: Organization[] = [];
        if (Array.isArray(orgsRes.data)) {
          orgsList = orgsRes.data;
        } else if (orgsRes.data?.organizations) {
          orgsList = orgsRes.data.organizations;
        }
        setOrganizations(orgsList);

        const teamsList = Array.isArray(teamsRes.data) ? teamsRes.data : (teamsRes.data?.teams || []);
        setTeams(teamsList);

        // Auto-select first organization if available (for premium/allstar users)
        if (orgsList.length > 0 && !selectedOrgId) {
          setSelectedOrgId(orgsList[0].id);
        }
      } catch (err: any) {
        setError('Failed to load data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [hasAccess]);
  useEffect(() => {
    if (!selectedTeamId) {
      setMembers([]);
      return;
    }

    const loadMembers = async () => {
      try {
        setMembersLoading(true);
        const membersRes = await apiClient.listTeamMembers(selectedTeamId);
        const membersList = Array.isArray(membersRes.data) ? membersRes.data : (membersRes.data?.members || []);
        setMembers(membersList);
      } catch (err: any) {
        console.error('Failed to load team members:', err);
        setMembers([]);
      } finally {
        setMembersLoading(false);
      }
    };

    loadMembers();
  }, [selectedTeamId]);

  // Modal handlers
  const handleAddMember = () => {
    setAddMemberModalOpen(true);
  };

  const handleEditMember = (member: TeamMember) => {
    setSelectedMember(member);
    setEditMemberModalOpen(true);
  };

  const handleRemoveMember = async (member: TeamMember) => {
    if (!confirm(`Are you sure you want to remove ${member.email} from this team?`)) {
      return;
    }

    try {
      await apiClient.removeTeamMember(selectedTeamId as number, member.user_id);
      // Refresh members list
      const membersRes = await apiClient.listTeamMembers(selectedTeamId as number);
      const membersList = Array.isArray(membersRes.data) ? membersRes.data : (membersRes.data?.members || []);
      setMembers(membersList);
    } catch (err: any) {
      setError('Failed to remove team member');
      console.error(err);
    }
  };

  const handleMemberAdded = async () => {
    // Refresh members list
    const membersRes = await apiClient.listTeamMembers(selectedTeamId as number);
    const membersList = Array.isArray(membersRes.data) ? membersRes.data : (membersRes.data?.members || []);
    setMembers(membersList);
  };

  const handleMemberUpdated = async () => {
    // Refresh members list
    const membersRes = await apiClient.listTeamMembers(selectedTeamId as number);
    const membersList = Array.isArray(membersRes.data) ? membersRes.data : (membersRes.data?.members || []);
    setMembers(membersList);
  };
  useEffect(() => {
    if (!selectedOrgId) {
      setAvailableTeams([]);
      setSelectedTeamId('');
      return;
    }

    const orgTeams = teams.filter(team => team.organization_id === selectedOrgId);
    setAvailableTeams(orgTeams);

    // Auto-select first team if available
    if (orgTeams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(orgTeams[0].id);
    } else if (orgTeams.length === 0) {
      setSelectedTeamId('');
    }
  }, [selectedOrgId, teams, selectedTeamId]);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Team Members</h1>
        <p className="text-muted-foreground">
          View and manage team members. Adding members consumes team quota.
        </p>
      </div>

      {error && (
        <div className="border border-red-200 bg-red-50 text-red-700 rounded-lg p-4 mb-6">
          {error}
        </div>
      )}

      {/* Selectors Row */}
      <div className="flex flex-wrap items-center gap-6 mb-6">
        {/* Organization Selector */}
        <div className="flex items-center gap-2">
          <label htmlFor="org-select" className="text-sm font-medium whitespace-nowrap">
            Organization:
          </label>
          <select
            id="org-select"
            value={selectedOrgId}
            onChange={(e) => setSelectedOrgId(e.target.value ? parseInt(e.target.value) : '')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
          >
            <option value="">Select Organization</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </div>

        {/* Team Selector */}
        <div className="flex items-center gap-2">
          <label htmlFor="team-select" className="text-sm font-medium whitespace-nowrap">
            Team:
          </label>
          <select
            id="team-select"
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value ? parseInt(e.target.value) : '')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
            disabled={availableTeams.length === 0}
          >
            <option value="">Select Team</option>
            {availableTeams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading State */}
      {loading && <div className="text-center py-4">Loading organizations and teams...</div>}

      {/* Members Table */}
      {!loading && selectedTeamId && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium">Team Members</h3>
            <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500" onClick={handleAddMember}>
              <UserPlus className="w-4 h-4 mr-2" />
              Add Member
            </button>
          </div>
          <div className="p-6">
            {membersLoading ? (
              <div>Loading members...</div>
            ) : members.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No team members found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Products
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {members.map((member) => (
                      <tr key={member.user_id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {member.uid}
                              </div>
                              <div className="text-sm text-gray-500">
                                {member.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            member.role === 'team_leader'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {member.role === 'team_leader' ? 'Team Leader' : 'Member'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {member.products.join(', ')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button className="text-indigo-600 hover:text-indigo-900" onClick={() => handleEditMember(member)}>
                              Edit
                            </button>
                            <button className="text-red-600 hover:text-red-900" onClick={() => handleRemoveMember(member)}>
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {typeof selectedTeamId === 'number' && selectedTeamId > 0 && (
        <>
          <AddMemberModal
            isOpen={addMemberModalOpen}
            onClose={() => setAddMemberModalOpen(false)}
            teamId={selectedTeamId}
            organizationId={typeof selectedOrgId === 'number' ? selectedOrgId : undefined}
            onMemberAdded={handleMemberAdded}
          />

          <EditMemberModal
            isOpen={editMemberModalOpen}
            onClose={() => setEditMemberModalOpen(false)}
            teamId={selectedTeamId}
            member={selectedMember}
            onMemberUpdated={handleMemberUpdated}
          />
        </>
      )}
    </div>
  );
}
