'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiClient } from '@/lib/api-client';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: number;
  organizationId?: number;
  onMemberAdded: () => void;
}

interface User {
  id: number;
  uid: string;
  email: string;
  tier: string;
  source_upid?: string;
}

interface TeamQuota {
  team_id: number;
  product_id: number;
  upid: string;
  product_name: string;
  allocated_count: number;
  used_count: number;
}

export function AddMemberModal({ isOpen, onClose, teamId, organizationId, onMemberAdded }: AddMemberModalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | ''>('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [role, setRole] = useState<'member' | 'leader'>('member');
  const [teamQuotas, setTeamQuotas] = useState<TeamQuota[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchEmail, setSearchEmail] = useState('');

  // Load users and team quotas when modal opens
  // Note: organizationId is used to filter users from the same organization
  useEffect(() => {
    if (isOpen && teamId) {
      loadData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, teamId, organizationId]);

  // Auto-select user's source_upid product when user is selected
  useEffect(() => {
    if (typeof selectedUserId === 'number' && selectedUserId > 0) {
      const selectedUser = users.find(u => u.id === selectedUserId);
      if (selectedUser?.source_upid) {
        // Check if this product has available quota
        const quota = teamQuotas.find(q => q.upid === selectedUser.source_upid);
        if (quota && quota.allocated_count > quota.used_count) {
          setSelectedProducts([selectedUser.source_upid]);
        }
      }
    }
  }, [selectedUserId, users, teamQuotas]);

  const loadData = async () => {
    try {
      setDataLoading(true);
      setError('');
      
      // Load available users (those not already in team)
      const [usersRes, quotasRes] = await Promise.all([
        apiClient.listUsers(1, 100),
        apiClient.getTeamQuotas(teamId),
      ]);
      
      const usersList = Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data?.users || []);
      setUsers(usersList);
      
      const quotasList = Array.isArray(quotasRes.data) ? quotasRes.data : (quotasRes.data?.quotas || []);
      setTeamQuotas(quotasList);
    } catch (err: any) {
      console.error('Failed to load data:', err);
      setError('Failed to load users or quotas');
    } finally {
      setDataLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (typeof selectedUserId !== 'number' || selectedUserId <= 0) {
      setError('Please select a user');
      return;
    }
    
    if (selectedProducts.length === 0) {
      setError('Please select at least one product');
      return;
    }

    // Validate quotas before submitting
    for (const upid of selectedProducts) {
      const quota = teamQuotas.find(q => q.upid === upid);
      if (!quota) {
        setError(`Team has no quota for product ${upid}`);
        return;
      }
      if (quota.used_count >= quota.allocated_count) {
        setError(`No available quota for product ${quota.product_name || upid}`);
        return;
      }
    }

    setLoading(true);
    setError('');
    try {
      await apiClient.addTeamMember(teamId, selectedUserId, selectedProducts, role);
      onMemberAdded();
      handleClose();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string; error?: string } } };
      setError(error.response?.data?.message || error.response?.data?.error || 'Failed to add team member');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Reset form
    setSelectedUserId('');
    setSelectedProducts([]);
    setRole('member');
    setSearchEmail('');
    setError('');
    onClose();
  };

  const handleProductToggle = (productUpid: string) => {
    setSelectedProducts(prev =>
      prev.includes(productUpid)
        ? prev.filter(p => p !== productUpid)
        : [...prev, productUpid]
    );
  };

  // Filter users by search email
  const filteredUsers = users.filter(user => 
    searchEmail === '' || user.email.toLowerCase().includes(searchEmail.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Team Member</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="border border-red-200 bg-red-50 text-red-700 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          {dataLoading ? (
            <div className="text-center py-4">Loading...</div>
          ) : (
            <>
              {/* User Selection */}
              <div className="space-y-2">
                <Label htmlFor="user-search">Search User by Email</Label>
                <Input
                  id="user-search"
                  type="text"
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  placeholder="Type to filter by email..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="user-select">Select User</Label>
                <Select 
                  value={selectedUserId.toString()} 
                  onValueChange={(value) => setSelectedUserId(value ? parseInt(value) : '')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredUsers.length === 0 ? (
                      <div className="p-2 text-sm text-gray-500">No users found</div>
                    ) : (
                      filteredUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.email} ({user.uid}) - {user.tier}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {typeof selectedUserId === 'number' && selectedUserId > 0 && (
                  <div className="text-xs text-gray-500">
                    {users.find(u => u.id === selectedUserId)?.source_upid && (
                      <span>User registered with product: {users.find(u => u.id === selectedUserId)?.source_upid}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Role Selection */}
              <div className="space-y-2">
                <Label htmlFor="role">Role in Team</Label>
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

              {/* Product Selection with Quota Info */}
              <div className="space-y-2">
                <Label>Assign Products (with Team Quota)</Label>
                <div className="border rounded-lg p-3 max-h-48 overflow-y-auto">
                  {teamQuotas.length === 0 ? (
                    <div className="text-sm text-gray-500">
                      No quotas allocated to this team. Please allocate quotas first.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {teamQuotas.map((quota) => {
                        const available = quota.allocated_count - quota.used_count;
                        const isDisabled = available <= 0;
                        return (
                          <label 
                            key={quota.upid} 
                            className={`flex items-center justify-between p-2 rounded ${
                              isDisabled ? 'bg-gray-100 text-gray-400' : 'hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={selectedProducts.includes(quota.upid)}
                                onChange={() => handleProductToggle(quota.upid)}
                                disabled={isDisabled}
                                className="rounded border-gray-300"
                              />
                              <span className="text-sm">{quota.product_name || quota.upid}</span>
                            </div>
                            <span className={`text-xs ${available > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {available} / {quota.allocated_count} available
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  Each product assigned will consume 1 quota from the team allocation.
                </p>
              </div>
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || dataLoading || !selectedUserId || selectedProducts.length === 0}
            >
              {loading ? 'Adding...' : 'Add Member'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}