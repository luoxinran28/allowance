'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiClient } from '@/lib/api-client';

interface TeamMember {
  user_id: number;
  uid: string;
  email: string;
  tier: string;
  role: string;
  products: string[];
}

interface EditMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: number;
  member: TeamMember | null;
  onMemberUpdated: () => void;
}

export function EditMemberModal({ isOpen, onClose, teamId, member, onMemberUpdated }: EditMemberModalProps) {
  const [role, setRole] = useState<'member' | 'leader'>('member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen && member) {
      setRole(member.role === 'leader' ? 'leader' : 'member');
    }
  }, [isOpen, member]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) {
      setError('No member selected');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await apiClient.updateTeamMemberRole(teamId, member.user_id, role);
      // Note: In a full implementation, you might also need to update products
      // but the current API only supports role updates
      onMemberUpdated();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update team member');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!member) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Team Member</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="border border-red-200 bg-red-50 text-red-700 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          {/* Member Info (Read-only) */}
          <div className="space-y-2">
            <Label>Member Information</Label>
            <div className="border rounded-lg p-3 bg-gray-50">
              <div className="text-sm">
                <div className="font-medium">{member.uid}</div>
                <div className="text-gray-600">{member.email}</div>
                <div className="text-xs text-gray-500">Tier: {member.tier}</div>
              </div>
            </div>
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={(value: 'member' | 'leader') => setRole(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="leader">Team Leader</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Product Selection (Display only for now) */}
          <div className="space-y-2">
            <Label>Current Products</Label>
            <div className="border rounded-lg p-3 bg-gray-50">
              <div className="text-sm text-gray-600">
                {member.products.length > 0 ? member.products.join(', ') : 'No products assigned'}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Product updates not yet implemented in this version
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Member'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}