'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

interface OrgProductLicense {
  id: number;
  organization_id: number;
  product_id: number;
  total_count: number;
  assigned_count: number;
  available_count: number;
  expires_at: string;
}

interface TeamMemberLicenseAssignment {
  id: number;
  org_license_id: number;
  group_id: number;
  user_id: number;
  license_key: string;
  assigned_at: string;
  revoked_at?: string;
}

interface TeamMember {
  user_id: number;
  email: string;
  role: string;
}

export default function TeamLicensesPage() {
  const params = useParams();
  const teamId = Number(params.id);

  const [orgLicenses, setOrgLicenses] = useState<OrgProductLicense[]>([]);
  const [assignments, setAssignments] = useState<TeamMemberLicenseAssignment[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal state for assignment
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState<OrgProductLicense | null>(null);
  const [selectedMember, setSelectedMember] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  // Revoke confirmation
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<TeamMemberLicenseAssignment | null>(null);

  useEffect(() => {
    loadTeamLicenses();
    loadTeamMembers();
  }, [teamId]);

  const loadTeamLicenses = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiClient.getTeamLicenses(teamId);
      setOrgLicenses(response.data.org_licenses || []);
      setAssignments(response.data.team_member_assignments || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load team licenses');
    } finally {
      setLoading(false);
    }
  };

  const loadTeamMembers = async () => {
    try {
      const response = await apiClient.listTeamMembers(teamId);
      setTeamMembers(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      console.error('Failed to load team members');
    }
  };

  const handleOpenAssignModal = (license: OrgProductLicense) => {
    // Check if license has available slots
    if (license.available_count <= 0) {
      setError('No available licenses to assign');
      return;
    }
    setSelectedLicense(license);
    setSelectedMember('');
    setShowAssignModal(true);
  };

  const handleCloseAssignModal = () => {
    setShowAssignModal(false);
    setSelectedLicense(null);
    setSelectedMember('');
  };

  const handleAssignLicense = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedLicense || !selectedMember) {
      setError('Please select a license and member');
      return;
    }

    try {
      setIsAssigning(true);
      setError('');
      setSuccess('');

      const userId = Number(selectedMember);
      await apiClient.assignLicenseToTeamMember(teamId, selectedLicense.id, userId);

      setSuccess('License assigned successfully');
      handleCloseAssignModal();
      await loadTeamLicenses();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to assign license');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRevokeClick = (assignment: TeamMemberLicenseAssignment) => {
    setSelectedAssignment(assignment);
    setShowRevokeConfirm(true);
  };

  const handleRevokeLicense = async () => {
    if (!selectedAssignment) return;

    try {
      setError('');
      setSuccess('');

      await apiClient.revokeLicenseFromTeamMember(teamId, selectedAssignment.id);
      setSuccess('License revoked successfully');
      setShowRevokeConfirm(false);
      setSelectedAssignment(null);
      await loadTeamLicenses();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to revoke license');
    }
  };

  const getTeamMemberEmail = (userId: number): string => {
    const member = teamMembers.find((m) => m.user_id === userId);
    return member?.email || `User ${userId}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href={`/dashboard/teams/${teamId}`} className="text-blue-600 hover:underline text-sm mb-2 inline-block">
            ← Back to Team
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">License Management</h1>
          <p className="mt-1 text-gray-600">Manage team licenses and assignments</p>
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

      {/* Organization Licenses Section */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900">Organization Licenses</h2>
          <p className="text-sm text-gray-600 mt-1">Available licenses from your organization</p>
        </div>

        {orgLicenses.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-gray-500">No licenses available for your team</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Product ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Assigned
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Available
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Expires
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orgLicenses.map((license) => (
                  <tr key={license.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      Product {license.product_id}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {license.total_count}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {license.assigned_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        license.available_count > 0
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {license.available_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(license.expires_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => handleOpenAssignModal(license)}
                        disabled={license.available_count <= 0}
                        className={`px-3 py-1 rounded font-medium transition ${
                          license.available_count > 0
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        Assign
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Team Member Assignments Section */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900">Member Assignments</h2>
          <p className="text-sm text-gray-600 mt-1">Licenses assigned to team members</p>
        </div>

        {assignments.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-gray-500">No licenses assigned yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Team Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    License Key
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Assigned Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {assignments.map((assignment) => (
                  <tr key={assignment.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {getTeamMemberEmail(assignment.user_id)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                      {assignment.license_key}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(assignment.assigned_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        assignment.revoked_at
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {assignment.revoked_at ? 'Revoked' : 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {!assignment.revoked_at && (
                        <button
                          onClick={() => handleRevokeClick(assignment)}
                          className="text-red-600 hover:text-red-800 font-medium transition"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assign License Modal */}
      {showAssignModal && selectedLicense && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Assign License to Member</h2>
            </div>
            <form onSubmit={handleAssignLicense} className="space-y-4 p-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  License Pool
                </label>
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-300">
                  <p className="text-sm font-medium text-gray-900">
                    Product {selectedLicense.product_id}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Available: {selectedLicense.available_count} / {selectedLicense.total_count}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Team Member
                </label>
                <select
                  value={selectedMember}
                  onChange={(e) => setSelectedMember(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  required
                >
                  <option value="">-- Choose a member --</option>
                  {teamMembers.map((member) => (
                    <option key={member.user_id} value={member.user_id}>
                      {member.email} ({member.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseAssignModal}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAssigning || !selectedMember}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:bg-gray-400 transition"
                >
                  {isAssigning ? 'Assigning...' : 'Assign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Revoke Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showRevokeConfirm}
        title="Revoke License"
        message={`Are you sure you want to revoke this license from ${
          selectedAssignment ? getTeamMemberEmail(selectedAssignment.user_id) : 'this member'
        }?`}
        isDangerous={true}
        confirmText="Revoke"
        onConfirm={handleRevokeLicense}
        onCancel={() => {
          setShowRevokeConfirm(false);
          setSelectedAssignment(null);
        }}
      />
    </div>
  );
}
