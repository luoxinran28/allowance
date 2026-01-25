'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useConditionalProtectedRoute } from '@/lib/middleware/routeProtection';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit2, Users, ClipboardList, ChevronDown } from 'lucide-react';

// ============================================
// Types
// ============================================

interface Team {
  id: number;
  name: string;
  team_id: string;
  organization_id: number;
}

interface OrgLicense {
  id: number;
  productId: number;
  upid: string;
  productName: string;
  totalQuota: number;
  usedQuota: number;
  remainingQuota: number;
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

// ============================================
// Allocate Quota Tab
// ============================================

function AllocateQuotaTab() {
  const { user } = useAuthStore();
  const canAllocateQuotas = user?.tier === 'premium' || user?.tier === 'allstar';
  
  const [teams, setTeams] = useState<Team[]>([]);
  const [licenses, setLicenses] = useState<OrgLicense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form state
  const [selectedTeam, setSelectedTeam] = useState<number | ''>('');
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [quotaAmount, setQuotaAmount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  // Edit mode
  const [editingQuota, setEditingQuota] = useState<TeamQuota | null>(null);
  const [existingQuotas, setExistingQuotas] = useState<TeamQuota[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [teamsRes, quotasRes] = await Promise.all([
        apiClient.listTeams(),
        apiClient.listTeamQuotas(),
      ]);
      
      const teamsList = Array.isArray(teamsRes.data) ? teamsRes.data : (teamsRes.data?.teams || []);
      setTeams(teamsList);
      
      const quotasList = Array.isArray(quotasRes.data) ? quotasRes.data : (quotasRes.data?.quotas || []);
      setExistingQuotas(quotasList);
      
      // Load org licenses if user can allocate
      if (canAllocateQuotas) {
        try {
          const orgLicensesRes = await apiClient.getMyOrgLicenses();
          const licensesList = orgLicensesRes.data?.licenses || [];
          const realLicenses: OrgLicense[] = licensesList.map((l: any) => ({
            id: l.id,
            productId: l.product_id,
            upid: l.upid,
            productName: l.product_name || `Product #${l.product_id}`,
            totalQuota: l.total_count,
            usedQuota: l.total_count - l.available_count,
            remainingQuota: l.available_count,
          }));
          setLicenses(realLicenses);
        } catch {
          // Non-fatal - user might not have org licenses
        }
      }
      
    } catch (err: any) {
      setError('Failed to load data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [canAllocateQuotas]);

  const handleAllocateQuota = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam || !selectedProduct || quotaAmount <= 0) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      setSuccess('');

      if (editingQuota) {
        await apiClient.updateQuota(Number(selectedTeam), selectedProduct, quotaAmount);
        setSuccess('Team quota updated successfully');
      } else {
        await apiClient.allocateQuota(Number(selectedTeam), selectedProduct, quotaAmount);
        setSuccess('Team quota allocated successfully');
      }

      // Reset form and reload data
      setSelectedTeam('');
      setSelectedProduct('');
      setQuotaAmount(0);
      setEditingQuota(null);
      setShowForm(false); // Collapse form after success
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to allocate quota');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditQuota = (quota: TeamQuota) => {
    setEditingQuota(quota);
    setSelectedTeam(quota.team_id);
    setSelectedProduct(quota.upid);
    setQuotaAmount(quota.allocated_count);
    setShowForm(true); // Open form when editing
  };

  const handleCancelEdit = () => {
    setEditingQuota(null);
    setSelectedTeam('');
    setSelectedProduct('');
    setQuotaAmount(0);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!canAllocateQuotas) {
    return (
      <div className="border border-dashed border-border rounded-lg p-8 text-center">
        <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">
          You need a Premium or Allstar tier to allocate quotas to teams.
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Contact your administrator to upgrade your account.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="border border-red-200 bg-red-50 text-red-700 rounded-lg p-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="border border-green-200 bg-green-50 text-green-700 rounded-lg p-4">
          {success}
        </div>
      )}

      {/* Collapsible Allocation Form */}
      <div className="border border-border rounded-lg bg-card overflow-hidden">
        <button
          type="button"
          onClick={() => {
            if (editingQuota) {
              // If editing, don't collapse
              return;
            }
            setShowForm(!showForm);
          }}
          className="w-full p-6 flex items-center justify-between hover:bg-muted/50 transition-colors"
        >
          <h3 className="text-lg font-semibold flex items-center gap-2">
            {editingQuota ? <Edit2 className="h-5 w-5" /> : <Plus className="h-5 w-5 text-blue-600" />}
            {editingQuota ? 'Edit Team Quota' : 'Allocate Quota to Team'}
          </h3>
          {!editingQuota && (
            <ChevronDown className={`h-5 w-5 text-muted-foreground transform transition-transform ${showForm ? 'rotate-180' : ''}`} />
          )}
        </button>
        
        {(showForm || editingQuota) && (
          <div className="px-6 pb-6 border-t border-border">
            {licenses.length === 0 ? (
              <p className="text-muted-foreground pt-4">No organization licenses available. Contact your administrator to assign products to your organization.</p>
            ) : teams.length === 0 ? (
              <p className="text-muted-foreground pt-4">No teams available. Create teams first.</p>
            ) : (
              <form onSubmit={handleAllocateQuota} className="space-y-4 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Team</label>
                    <select
                      value={selectedTeam}
                      onChange={(e) => setSelectedTeam(e.target.value ? Number(e.target.value) : '')}
                      className="w-full border border-border rounded-md px-3 py-2 bg-background"
                      disabled={!!editingQuota}
                    >
                      <option value="">Select team...</option>
                      {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Product</label>
                <select
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  className="w-full border border-border rounded-md px-3 py-2 bg-background"
                  disabled={!!editingQuota}
                >
                  <option value="">Select product...</option>
                  {licenses.map((license) => (
                    <option key={license.upid} value={license.upid}>
                      {license.productName} (Available: {license.remainingQuota})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Quota Amount</label>
                <input
                  type="number"
                  min="1"
                  value={quotaAmount || ''}
                  onChange={(e) => setQuotaAmount(Number(e.target.value))}
                  className="w-full border border-border rounded-md px-3 py-2 bg-background"
                  placeholder="Enter quota..."
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Processing...' : (editingQuota ? 'Update Quota' : 'Allocate Quota')}
              </button>
              {editingQuota && (
                <button
                  type="button"
                  onClick={() => {
                    handleCancelEdit();
                    setShowForm(false);
                  }}
                  className="px-4 py-2 border border-border rounded-md hover:bg-muted"
                >
                  Cancel
                </button>
              )}
              {!editingQuota && (
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-border rounded-md hover:bg-muted"
                >
                  Close
                </button>
              )}
            </div>
          </form>
            )}
          </div>
        )}
      </div>

      {/* Existing Allocations Summary */}
      {existingQuotas.length > 0 && (
        <div className="border border-border rounded-lg p-6 bg-card">
          <h3 className="text-lg font-semibold mb-4">Current Allocations</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 font-medium">Team</th>
                  <th className="text-left py-2 px-2 font-medium">Product</th>
                  <th className="text-right py-2 px-2 font-medium">Allocated</th>
                  <th className="text-right py-2 px-2 font-medium">Used</th>
                  <th className="text-right py-2 px-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {existingQuotas.map((quota, idx) => (
                  <tr key={`${quota.team_id}-${quota.upid}-${idx}`} className="border-b border-border last:border-0">
                    <td className="py-2 px-2">{quota.team_name}</td>
                    <td className="py-2 px-2">{quota.product_name || quota.upid}</td>
                    <td className="py-2 px-2 text-right">{quota.allocated_count}</td>
                    <td className="py-2 px-2 text-right">{quota.used_count}</td>
                    <td className="py-2 px-2 text-right">
                      <button
                        onClick={() => handleEditQuota(quota)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// Teams & Quota Usage Tab
// ============================================

function TeamsQuotaUsageTab() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [quotas, setQuotas] = useState<TeamQuota[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError('');
        
        const [teamsRes, quotasRes] = await Promise.all([
          apiClient.listTeams(),
          apiClient.listTeamQuotas(),
        ]);
        
        const teamsList = Array.isArray(teamsRes.data) ? teamsRes.data : (teamsRes.data?.teams || []);
        setTeams(teamsList);
        
        const quotasList = Array.isArray(quotasRes.data) ? quotasRes.data : (quotasRes.data?.quotas || []);
        setQuotas(quotasList);
        
      } catch (err: any) {
        setError('Failed to load data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-red-200 bg-red-50 text-red-700 rounded-lg p-4">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        View team quota allocations and monitor usage across your organization.
      </p>

      {teams.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-8 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No teams in your organization yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {teams.map((team) => {
            const teamQuotas = quotas.filter(q => q.team_id === team.id);
            const totalAllocated = teamQuotas.reduce((sum, q) => sum + q.allocated_count, 0);
            const totalUsed = teamQuotas.reduce((sum, q) => sum + q.used_count, 0);
            
            return (
              <div key={team.id} className="border border-border rounded-lg p-6 bg-card">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">{team.name}</h3>
                    <p className="text-sm text-muted-foreground">ID: {team.team_id}</p>
                  </div>
                  {teamQuotas.length > 0 && (
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Total Usage</p>
                      <p className="font-semibold">{totalUsed} / {totalAllocated}</p>
                    </div>
                  )}
                </div>
                
                {teamQuotas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No quotas allocated to this team</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 px-2 font-medium">Product</th>
                          <th className="text-right py-2 px-2 font-medium">Allocated</th>
                          <th className="text-right py-2 px-2 font-medium">Used</th>
                          <th className="text-right py-2 px-2 font-medium">Available</th>
                          <th className="text-right py-2 px-2 font-medium">Usage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teamQuotas.map((quota, idx) => {
                          const usagePercent = quota.allocated_count > 0 
                            ? Math.round((quota.used_count / quota.allocated_count) * 100) 
                            : 0;
                          const isHighUsage = usagePercent >= 80;
                          
                          return (
                            <tr key={`${quota.upid}-${idx}`} className="border-b border-border last:border-0">
                              <td className="py-2 px-2">{quota.product_name || quota.upid}</td>
                              <td className="py-2 px-2 text-right">{quota.allocated_count}</td>
                              <td className="py-2 px-2 text-right">
                                <span className={isHighUsage ? 'text-red-600' : ''}>
                                  {quota.used_count}
                                </span>
                              </td>
                              <td className="py-2 px-2 text-right text-green-600">
                                {quota.allocated_count - quota.used_count}
                              </td>
                              <td className="py-2 px-2 text-right">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  isHighUsage ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                }`}>
                                  {usagePercent}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================
// Main Page Component
// ============================================

export default function TeamQuotasPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasAccess } = useConditionalProtectedRoute(
    (perms) => perms.canAccessTeamManagement(),
    '/error/permission-denied'
  );
  const { user } = useAuthStore();
  const canAllocateQuotas = user?.tier === 'premium' || user?.tier === 'allstar';
  
  // Get tab from URL or default to 'allocate' if user can allocate, otherwise 'usage'
  const tabParam = searchParams.get('tab');
  const defaultTab = tabParam && ['allocate', 'usage'].includes(tabParam) 
    ? tabParam 
    : (canAllocateQuotas ? 'allocate' : 'usage');

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', value);
    router.push(`/team-management/quotas?${params.toString()}`);
  };

  if (!hasAccess) {
    return null;
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Team & Quotas</h1>
          <p className="text-muted-foreground">
            {canAllocateQuotas 
              ? 'Manage team quota allocations from your organization\'s license pool'
              : 'View team quota allocations and monitor usage'}
          </p>
        </div>

        <Tabs value={defaultTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="allocate" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Allocate Quota to Team
            </TabsTrigger>
            <TabsTrigger value="usage" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Teams & Quota Usage
            </TabsTrigger>
          </TabsList>

          <TabsContent value="allocate">
            <AllocateQuotaTab />
          </TabsContent>

          <TabsContent value="usage">
            <TeamsQuotaUsageTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
