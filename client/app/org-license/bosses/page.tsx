'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { UserPlus, UserMinus, X, Crown, Building2 } from 'lucide-react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';

// ============================================
// Types
// ============================================

interface Organization {
  id: number;
  name: string;
  org_id: string;
}

interface OrganizationBoss {
  id: number;
  organization_id: number;
  user_id: number;
  notes: string | null;
  assigned_at: string;
  assigned_by: number | null;
  user_email: string;
  user_uid: string;
  user_tier: string;
}

interface BossCandidate {
  id: number;
  uid: string;
  email: string;
  tier: string;
  organization_id: number | null;
}

// ============================================
// Add Boss Modal
// ============================================

interface AddBossModalProps {
  isOpen: boolean;
  onClose: () => void;
  organization: Organization | null;
  onSuccess: () => void;
}

function AddBossModal({ isOpen, onClose, organization, onSuccess }: AddBossModalProps) {
  const [candidates, setCandidates] = useState<BossCandidate[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load candidates when modal opens
  useEffect(() => {
    if (!isOpen || !organization) return;

    const loadCandidates = async () => {
      setLoadingCandidates(true);
      setError('');
      try {
        const response = await apiClient.getBossCandidates(organization.id);
        const candidatesList = Array.isArray(response.data) ? response.data : (response.data?.candidates || []);
        setCandidates(candidatesList);
      } catch (err: any) {
        console.error('Failed to load candidates:', err);
        setError('Failed to load available candidates');
      } finally {
        setLoadingCandidates(false);
      }
    };

    loadCandidates();
  }, [isOpen, organization]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedUserId('');
      setNotes('');
      setError('');
      setSuccess('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !selectedUserId) {
      setError('Please select a user');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await apiClient.addOrganizationBoss(organization.id, selectedUserId as number, notes || undefined);
      setSuccess('Boss added successfully!');
      setSelectedUserId('');
      setNotes('');
      
      // Close modal after short delay
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add boss');
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
            Add Boss to {organization?.name}
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
            {loadingCandidates ? (
              <div className="text-sm text-muted-foreground">Loading candidates...</div>
            ) : candidates.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No available candidates. Users must belong to this organization and not already be a boss.
              </div>
            ) : (
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : '')}
                className="w-full border border-border rounded-md px-3 py-2 bg-background"
              >
                <option value="">Select a user...</option>
                {candidates.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.email} ({candidate.tier})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-2">Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this boss assignment..."
              className="w-full border border-border rounded-md px-3 py-2 bg-background resize-none"
              rows={3}
            />
          </div>

          {/* Info Box */}
          {selectedUserId && (
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm">
                <strong>Note:</strong> Adding this user as boss will:
              </p>
              <ul className="text-sm text-muted-foreground mt-1 list-disc list-inside">
                <li>Upgrade their tier to &quot;premium&quot; if not already</li>
                <li>Grant organization management permissions</li>
                <li>Add them to the organization&apos;s default team</li>
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={loading || !selectedUserId}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Adding...' : 'Add Boss'}
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

export default function OrganizationBossesPage() {
  const { user } = useAuthStore();
  const isAllstar = user?.tier === 'allstar';
  const isPremiumOrAllstar = user?.tier === 'premium' || user?.tier === 'allstar';

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<number | ''>('');
  const [bosses, setBosses] = useState<OrganizationBoss[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [removingBossId, setRemovingBossId] = useState<number | null>(null);

  // Load organizations on mount
  useEffect(() => {
    const loadOrganizations = async () => {
      try {
        setLoading(true);
        setError('');

        const orgsRes = await apiClient.listOrganizations(1, 100);

        // Parse organizations
        let orgsList: Organization[] = [];
        if (Array.isArray(orgsRes.data)) {
          orgsList = orgsRes.data;
        } else if (orgsRes.data?.organizations) {
          orgsList = orgsRes.data.organizations;
        }
        setOrganizations(orgsList);

        // Auto-select first organization if available
        if (orgsList.length > 0 && !selectedOrgId) {
          setSelectedOrgId(orgsList[0].id);
        }
      } catch (err: any) {
        setError('Failed to load organizations');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadOrganizations();
  }, []);

  // Load bosses when organization changes
  const loadBosses = useCallback(async () => {
    if (!selectedOrgId) {
      setBosses([]);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await apiClient.listOrganizationBosses(selectedOrgId as number);
      const bossesList = Array.isArray(response.data) ? response.data : (response.data?.bosses || []);
      setBosses(bossesList);
    } catch (err: any) {
      setError('Failed to load organization bosses');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedOrgId]);

  useEffect(() => {
    if (selectedOrgId) {
      loadBosses();
    }
  }, [selectedOrgId, loadBosses]);

  const handleRemoveBoss = async (userId: number) => {
    if (!selectedOrgId) return;
    
    // Check if this is the last boss
    if (bosses.length <= 1) {
      setError('Cannot remove the last boss. Organizations must have at least one boss.');
      return;
    }

    if (!confirm('Are you sure you want to remove this boss? They will lose premium tier and organization management access.')) {
      return;
    }

    setRemovingBossId(userId);
    setError('');
    setSuccess('');

    try {
      await apiClient.removeOrganizationBoss(selectedOrgId as number, userId);
      setSuccess('Boss removed successfully');
      await loadBosses();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to remove boss');
    } finally {
      setRemovingBossId(null);
    }
  };

  const handleAddSuccess = async () => {
    await loadBosses();
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const selectedOrg = organizations.find(o => o.id === selectedOrgId) || null;

  if (!isPremiumOrAllstar) {
    return (
      <div className="p-8">
        <div className="border border-red-200 bg-red-50 text-red-700 rounded-lg p-4">
          You do not have permission to access this page. Premium or higher tier required.
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <Crown className="h-8 w-8 text-purple-600" />
          Organization Bosses
        </h1>
        <p className="text-muted-foreground">
          Manage organization bosses (premium tier users with organization management permissions).
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

      {/* Organization Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Select Organization</label>
        <div className="flex gap-4 items-center">
          <select
            value={selectedOrgId}
            onChange={(e) => setSelectedOrgId(e.target.value ? Number(e.target.value) : '')}
            className="flex-1 max-w-md border border-border rounded-md px-3 py-2 bg-background"
          >
            <option value="">Select an organization...</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name} ({org.org_id})
              </option>
            ))}
          </select>

          {isAllstar && selectedOrgId && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              <UserPlus className="h-4 w-4" />
              Add Boss
            </button>
          )}
        </div>
      </div>

      {/* Bosses List */}
      {loading ? (
        <div className="flex justify-center items-center py-12 border border-gray-200 rounded-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      ) : !selectedOrgId ? (
        <div className="border border-dashed border-gray-200 rounded-lg p-8 text-center bg-gray-50">
          <Building2 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">
            Select an organization to view its bosses
          </p>
        </div>
      ) : bosses.length === 0 ? (
        <div className="border border-dashed border-gray-200 rounded-lg p-8 text-center bg-gray-50">
          <Crown className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500 mb-4">
            No bosses assigned to this organization
          </p>
          {isAllstar && (
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              <UserPlus className="h-4 w-4" />
              Add First Boss
            </button>
          )}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Email</TableHead>
              <TableHead>UID</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Assigned Date</TableHead>
              <TableHead>Notes</TableHead>
              {isAllstar && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {bosses.map((boss) => (
              <TableRow key={boss.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-purple-500" />
                    <p className="font-medium text-gray-900">
                      {boss.user_email}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="text-gray-500 font-mono">
                  {boss.user_uid}
                </TableCell>
                <TableCell>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${getTierColor(
                      boss.user_tier
                    )}`}
                  >
                    {boss.user_tier}
                  </span>
                </TableCell>
                <TableCell className="text-gray-500">
                  {formatDate(boss.assigned_at)}
                </TableCell>
                <TableCell className="text-gray-500">
                  {boss.notes || '-'}
                </TableCell>
                {isAllstar && (
                  <TableCell>
                    <button
                      onClick={() => handleRemoveBoss(boss.user_id)}
                      disabled={
                        removingBossId === boss.user_id || bosses.length <= 1
                      }
                      className="text-red-600 hover:text-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      title={
                        bosses.length <= 1
                          ? 'Cannot remove the last boss'
                          : 'Remove boss'
                      }
                    >
                      <UserMinus className="h-4 w-4" />
                      {removingBossId === boss.user_id ? '...' : 'Remove'}
                    </button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Permission Note */}
      {!isAllstar && (
        <div className="mt-6 border border-yellow-200 bg-yellow-50 text-yellow-800 rounded-lg p-4 text-sm">
          <strong>Note:</strong> Only Allstar users can add or remove organization bosses. 
          As a Premium user, you can view the boss list for your organization.
        </div>
      )}

      {/* Add Boss Modal */}
      <AddBossModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        organization={selectedOrg}
        onSuccess={handleAddSuccess}
      />
    </div>
  );
}
