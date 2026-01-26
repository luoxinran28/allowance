'use client';

import { useEffect, useState, useCallback } from 'react';
import { useConditionalProtectedRoute } from '@/lib/middleware/routeProtection';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { UserPlus, UserMinus, X, Users, Crown, ChevronDown } from 'lucide-react';

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

interface TeamQuota {
  team_id: number;
  team_name: string;
  product_id: number;
  upid: string;
  product_name: string;
  allocated_count: number;
  used_count: number;
}

interface AvailableUser {
  id: number;
  uid: string;
  email: string;
  tier: string;
  organization_id: number | null;
  source_upid: string | null;
}

// ============================================
// Add Member Modal
// ============================================

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: Team | null;
  quotas: TeamQuota[];
  onSuccess: () => void;
}

function AddMemberModal({ isOpen, onClose, team, quotas, onSuccess }: AddMemberModalProps) {
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | ''>('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Get available products from team quotas (only those with remaining quota)
  const availableProducts = quotas.filter(q => 
    q.team_id === team?.id && q.allocated_count > q.used_count
  );

  // Load available users when modal opens
  useEffect(() => {
    if (!isOpen || !team) return;

    const loadUsers = async () => {
      setLoadingUsers(true);
      setError('');
      try {
        // Load all users from admin endpoint
        const response = await apiClient.listUsers(1, 100);
        const users = response.data?.data || [];
        
        // Filter to show users who can be added:
        // - Users in the same organization OR users not assigned to any organization
        // - Exclude users already in this team (we'll check via team members)
        const membersRes = await apiClient.listTeamMembers(team.id);
        const existingMemberIds = new Set(
          (Array.isArray(membersRes.data) ? membersRes.data : []).map((m: TeamMember) => m.user_id)
        );

        const filteredUsers = users.filter((u: any) => 
          !existingMemberIds.has(u.id) && 
          (u.organization_id === team.organization_id || u.organization_id === null)
        );

        setAvailableUsers(filteredUsers);
      } catch (err: any) {
        console.error('Failed to load users:', err);
        setError('Failed to load available users');
      } finally {
        setLoadingUsers(false);
      }
    };

    loadUsers();
  }, [isOpen, team]);

  // Auto-select source_upid product when user is selected
  useEffect(() => {
    if (!selectedUserId) {
      setSelectedProducts([]);
      return;
    }

    const user = availableUsers.find(u => u.id === selectedUserId);
    if (user?.source_upid) {
      // Check if source_upid product has available quota
      const hasQuota = availableProducts.some(p => p.upid === user.source_upid);
      if (hasQuota) {
        setSelectedProducts([user.source_upid]);
      }
    }
  }, [selectedUserId, availableUsers, availableProducts]);

  const handleProductToggle = (upid: string) => {
    setSelectedProducts(prev => 
      prev.includes(upid) 
        ? prev.filter(p => p !== upid)
        : [...prev, upid]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team || !selectedUserId || selectedProducts.length === 0) {
      setError('Please select a user and at least one product');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await apiClient.addTeamMember(team.id, selectedUserId as number, selectedProducts, 'member');
      setSuccess('Member added successfully!');
      setSelectedUserId('');
      setSelectedProducts([]);
      
      // Close modal after short delay
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background border border-border rounded-lg w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add Member to {team?.name}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="border border-red-200 bg-red-50 text-red-700 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="border border-green-200 bg-green-50 text-green-700 rounded-lg p-3 text-sm">
              {success}
            </div>
          )}

          {/* User Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Select User</label>
            {loadingUsers ? (
              <div className="text-sm text-muted-foreground">Loading users...</div>
            ) : availableUsers.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No available users to add. Users must belong to the same organization or have no organization assigned.
              </div>
            ) : (
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : '')}
                className="w-full border border-border rounded-md px-3 py-2 bg-background"
              >
                <option value="">Select a user...</option>
                {availableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.email} ({user.tier})
                    {user.source_upid && ` - Source: ${user.source_upid}`}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Product Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Select Products to Assign
              <span className="text-muted-foreground font-normal ml-1">(consumes quota)</span>
            </label>
            {availableProducts.length === 0 ? (
              <div className="text-sm text-muted-foreground border border-dashed border-border rounded-lg p-4">
                No products with available quota. Please allocate quotas to this team first.
              </div>
            ) : (
              <div className="space-y-2">
                {availableProducts.map((product) => {
                  const remaining = product.allocated_count - product.used_count;
                  const isSelected = selectedProducts.includes(product.upid);
                  return (
                    <label
                      key={product.upid}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        isSelected 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-border hover:border-blue-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleProductToggle(product.upid)}
                        className="w-4 h-4"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{product.product_name || product.upid}</div>
                        <div className="text-xs text-muted-foreground">
                          Available: {remaining} / {product.allocated_count}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected User Info */}
          {selectedUserId && (
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm">
                <strong>Note:</strong> Adding this user to the team will:
              </p>
              <ul className="text-sm text-muted-foreground mt-1 list-disc list-inside">
                <li>Consume {selectedProducts.length} quota(s) from the team</li>
                {availableUsers.find(u => u.id === selectedUserId)?.tier === 'free' && (
                  <li>Upgrade user tier from free to standard</li>
                )}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={loading || !selectedUserId || selectedProducts.length === 0}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Adding...' : 'Add Member'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-border rounded-md hover:bg-muted"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================
// Main Page
// ============================================

export default function TeamMembersPage() {
  const { hasAccess } = useConditionalProtectedRoute(
    (perms) => perms.canAccessTeamManagement(),
    '/error/permission-denied'
  );
  const { user } = useAuthStore();
  const canManageMembers = user?.tier === 'standard' || user?.tier === 'premium' || user?.tier === 'allstar';
  const canPromoteToLeader = user?.tier === 'premium' || user?.tier === 'allstar';

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<number | ''>('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [filteredTeams, setFilteredTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | ''>('');
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [quotas, setQuotas] = useState<TeamQuota[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<number | null>(null);
  const [promotingMemberId, setPromotingMemberId] = useState<number | null>(null);
  const [demotingMemberId, setDemotingMemberId] = useState<number | null>(null);

  // Load organizations and teams on mount
  useEffect(() => {
    if (!hasAccess) return;

    const loadData = async () => {
      try {
        setLoading(true);
        setError('');

        const [orgsRes, teamsRes, quotasRes] = await Promise.all([
          apiClient.listOrganizations(1, 100),
          apiClient.listTeams(),
          apiClient.listTeamQuotas(),
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

        const quotasList = Array.isArray(quotasRes.data) ? quotasRes.data : (quotasRes.data?.quotas || []);
        setQuotas(quotasList);

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

  // Filter teams when organization changes
  useEffect(() => {
    if (selectedOrgId) {
      const filtered = teams.filter(t => t.organization_id === selectedOrgId);
      setFilteredTeams(filtered);
      // Auto-select first team of the org
      if (filtered.length > 0) {
        setSelectedTeamId(filtered[0].id);
      } else {
        setSelectedTeamId('');
      }
    } else {
      setFilteredTeams(teams);
      if (teams.length > 0 && !selectedTeamId) {
        setSelectedTeamId(teams[0].id);
      }
    }
  }, [selectedOrgId, teams]);

  // Load members when team changes
  const loadMembers = useCallback(async () => {
    if (!selectedTeamId) {
      setMembers([]);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await apiClient.listTeamMembers(selectedTeamId as number);
      const membersList = Array.isArray(response.data) ? response.data : [];
      setMembers(membersList);
    } catch (err: any) {
      setError('Failed to load team members');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedTeamId]);

  useEffect(() => {
    if (selectedTeamId) {
      loadMembers();
    }
  }, [selectedTeamId, loadMembers]);

  const handleRemoveMember = async (userId: number) => {
    if (!selectedTeamId) return;
    
    if (!confirm('Are you sure you want to remove this member from the team? This will release their quota allocation.')) {
      return;
    }

    setRemovingMemberId(userId);
    setError('');
    setSuccess('');

    try {
      await apiClient.removeTeamMember(selectedTeamId as number, userId);
      setSuccess('Member removed successfully');
      
      // Reload members and quotas
      await loadMembers();
      const quotasRes = await apiClient.listTeamQuotas();
      const quotasList = Array.isArray(quotasRes.data) ? quotasRes.data : (quotasRes.data?.quotas || []);
      setQuotas(quotasList);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to remove member');
    } finally {
      setRemovingMemberId(null);
    }
  };

  const handlePromoteToLeader = async (userId: number) => {
    if (!selectedTeamId) return;
    
    if (!confirm('Are you sure you want to promote this member to Team Leader? The current leader (if any) will be demoted.')) {
      return;
    }

    setPromotingMemberId(userId);
    setError('');
    setSuccess('');

    try {
      await apiClient.promoteTeamMemberToLead(selectedTeamId as number, userId);
      setSuccess('Member promoted to Team Leader successfully');
      await loadMembers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to promote member');
    } finally {
      setPromotingMemberId(null);
    }
  };

  const handleDemoteLeader = async (userId: number) => {
    if (!selectedTeamId) return;
    
    if (!confirm('Are you sure you want to demote this Team Leader to a regular member?')) {
      return;
    }

    setDemotingMemberId(userId);
    setError('');
    setSuccess('');

    try {
      await apiClient.demoteTeamLead(selectedTeamId as number, userId);
      setSuccess('Team Leader demoted to member successfully');
      await loadMembers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to demote leader');
    } finally {
      setDemotingMemberId(null);
    }
  };

  const handleAddSuccess = async () => {
    await loadMembers();
    // Reload quotas as they may have changed
    const quotasRes = await apiClient.listTeamQuotas();
    const quotasList = Array.isArray(quotasRes.data) ? quotasRes.data : (quotasRes.data?.quotas || []);
    setQuotas(quotasList);
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

  const getRoleColor = (role: string) => {
    const colorMap: Record<string, string> = {
      leader: 'bg-yellow-100 text-yellow-800',
      admin: 'bg-red-100 text-red-800',
      member: 'bg-gray-100 text-gray-800',
    };
    return colorMap[role] || 'bg-gray-100 text-gray-800';
  };

  const selectedTeam = teams.find(t => t.id === selectedTeamId) || null;
  const teamQuotas = quotas.filter(q => q.team_id === selectedTeamId);

  if (!hasAccess) {
    return null;
  }

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

      {success && (
        <div className="border border-green-200 bg-green-50 text-green-700 rounded-lg p-4 mb-6">
          {success}
        </div>
      )}

      {/* Organization and Team Selection */}
      <div className="mb-6 space-y-4">
        {/* Organization Filter (for premium/allstar users) */}
        {(user?.tier === 'premium' || user?.tier === 'allstar') && organizations.length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-2">Filter by Organization</label>
            <select
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value ? Number(e.target.value) : '')}
              className="w-full max-w-md border border-border rounded-md px-3 py-2 bg-background"
            >
              <option value="">All Organizations</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Team Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">Select Team</label>
          <div className="flex gap-4 items-center">
            <select
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value ? Number(e.target.value) : '')}
              className="flex-1 max-w-md border border-border rounded-md px-3 py-2 bg-background"
            >
              <option value="">Select a team...</option>
              {filteredTeams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>

            {canManageMembers && selectedTeamId && (
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <UserPlus className="h-4 w-4" />
                Add Member
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Team Quota Summary */}
      {selectedTeamId && teamQuotas.length > 0 && (
        <div className="mb-6 border border-border rounded-lg p-4 bg-muted/30">
          <h3 className="text-sm font-semibold mb-2">Team Quota Summary</h3>
          <div className="flex flex-wrap gap-4">
            {teamQuotas.map((quota) => (
              <div key={quota.upid} className="text-sm">
                <span className="font-medium">{quota.product_name || quota.upid}:</span>
                <span className="ml-2 text-muted-foreground">
                  {quota.used_count} / {quota.allocated_count} used
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Members List */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : !selectedTeamId ? (
        <div className="border border-dashed border-border rounded-lg p-8 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Select a team to view its members</p>
        </div>
      ) : members.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-8 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">No members in this team yet</p>
          {canManageMembers && (
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <UserPlus className="h-4 w-4" />
              Add First Member
            </button>
          )}
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="text-left px-6 py-3 font-semibold text-sm">Email</th>
                <th className="text-left px-6 py-3 font-semibold text-sm">UID</th>
                <th className="text-left px-6 py-3 font-semibold text-sm">Tier</th>
                <th className="text-left px-6 py-3 font-semibold text-sm">Role</th>
                <th className="text-left px-6 py-3 font-semibold text-sm">Products</th>
                {canManageMembers && (
                  <th className="text-left px-6 py-3 font-semibold text-sm">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.user_id} className="border-b border-border hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm">{member.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-muted-foreground font-mono">{member.uid}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTierColor(member.tier)}`}>
                      {member.tier}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 ${getRoleColor(member.role)}`}>
                      {member.role === 'leader' && <Crown className="h-3 w-3" />}
                      {member.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {member.products && member.products.length > 0 ? (
                        member.products.map((p) => (
                          <span key={p} className="px-2 py-0.5 bg-muted rounded text-xs">
                            {p}
                          </span>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </div>
                  </td>
                  {canManageMembers && (
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {/* Promote/Demote buttons - only for premium/allstar */}
                        {canPromoteToLeader && member.role !== 'leader' && member.role !== 'admin' && (
                          <button
                            onClick={() => handlePromoteToLeader(member.user_id)}
                            disabled={promotingMemberId === member.user_id}
                            className="text-sm text-yellow-600 hover:text-yellow-700 font-medium disabled:opacity-50 flex items-center gap-1"
                            title="Promote to Team Leader"
                          >
                            <Crown className="h-4 w-4" />
                            {promotingMemberId === member.user_id ? '...' : 'Promote'}
                          </button>
                        )}
                        {canPromoteToLeader && member.role === 'leader' && (
                          <button
                            onClick={() => handleDemoteLeader(member.user_id)}
                            disabled={demotingMemberId === member.user_id}
                            className="text-sm text-orange-600 hover:text-orange-700 font-medium disabled:opacity-50 flex items-center gap-1"
                            title="Demote to Member"
                          >
                            <ChevronDown className="h-4 w-4" />
                            {demotingMemberId === member.user_id ? '...' : 'Demote'}
                          </button>
                        )}
                        {/* Remove button */}
                        <button
                          onClick={() => handleRemoveMember(member.user_id)}
                          disabled={removingMemberId === member.user_id}
                          className="text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50 flex items-center gap-1"
                        >
                          <UserMinus className="h-4 w-4" />
                          {removingMemberId === member.user_id ? '...' : 'Remove'}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Member Modal */}
      <AddMemberModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        team={selectedTeam}
        quotas={quotas}
        onSuccess={handleAddSuccess}
      />
    </div>
  );
}
