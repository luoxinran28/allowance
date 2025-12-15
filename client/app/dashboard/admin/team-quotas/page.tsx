'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Edit } from 'lucide-react';
import { AdminDetailOverlay } from '@/components/admin/AdminDetailOverlay';

interface TeamQuota {
  id: number;
  team_id: number;
  team_name: string;
  product_id: number;
  product_name: string;
  upid: string;
  allocated_count: number;
  used_count: number;
  available_count: number;
}

export default function TeamQuotasPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedQuotaId = searchParams.get('selected_id') ? parseInt(searchParams.get('selected_id')!) : null;

  const [quotas, setQuotas] = useState<TeamQuota[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Overlay state
  const [selectedQuota, setSelectedQuota] = useState<TeamQuota | null>(null);
  const [overlayMode, setOverlayMode] = useState<'view' | 'allocate' | 'update'>('view');
  
  // Allocate form
  const [teamId, setTeamId] = useState('');
  const [productUpid, setProductUpid] = useState('');
  const [quota, setQuota] = useState('10');

  useEffect(() => {
    loadQuotas();
  }, []);

  useEffect(() => {
    // Sync selected quota when selectedQuotaId changes
    if (selectedQuotaId && quotas.length > 0) {
      const found = quotas.find(q => q.id === selectedQuotaId);
      if (found) {
        setSelectedQuota(found);
        setOverlayMode('view');
      }
    } else {
      setSelectedQuota(null);
    }
  }, [selectedQuotaId, quotas]);

  const loadQuotas = async () => {
    try {
      setLoading(true);
      const response = await apiClient.listTeamQuotas();
      setQuotas(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load team quotas');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAllocateOverlay = () => {
    setTeamId('');
    setProductUpid('');
    setQuota('10');
    setOverlayMode('allocate');
    router.push('?selected_id=new');
  };

  const handleOpenEditOverlay = (quotaItem: TeamQuota) => {
    setSelectedQuota(quotaItem);
    setQuota(quotaItem.allocated_count.toString());
    setOverlayMode('update');
    router.push(`?selected_id=${quotaItem.id}`);
  };

  const handleCloseOverlay = () => {
    router.push('');
    setSelectedQuota(null);
    setError('');
    setSuccess('');
  };

  const handleAllocate = async () => {
    try {
      await apiClient.allocateQuota(parseInt(teamId), productUpid, parseInt(quota));
      setSuccess('Quota allocated successfully');
      setTimeout(() => {
        handleCloseOverlay();
        loadQuotas();
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to allocate quota');
    }
  };

  const handleUpdate = async () => {
    if (!selectedQuota) return;
    try {
      await apiClient.updateQuota(selectedQuota.team_id, selectedQuota.upid, parseInt(quota));
      setSuccess('Quota updated successfully');
      setTimeout(() => {
        handleCloseOverlay();
        loadQuotas();
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update quota');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Product Quotas</h1>
          <p className="text-gray-600 mt-1">Manage quota allocations for teams across products</p>
        </div>
        <Button onClick={handleOpenAllocateOverlay}>
          <Plus className="h-4 w-4 mr-2" />
          Allocate Quota
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      {/* Quotas Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Team</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Product</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">UPID</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Allocated</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Used</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Available</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {quotas.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 transition">
                <td className="px-6 py-4 font-medium text-gray-900">{item.team_name}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{item.product_name}</td>
                <td className="px-6 py-4 text-sm font-mono text-gray-600">{item.upid}</td>
                <td className="px-6 py-4 text-sm text-right text-gray-900">{item.allocated_count}</td>
                <td className="px-6 py-4 text-sm text-right text-gray-600">{item.used_count}</td>
                <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">{item.available_count}</td>
                <td className="px-6 py-4 text-sm text-right">
                  <button
                    onClick={() => handleOpenEditOverlay(item)}
                    className="text-blue-600 hover:text-blue-800 transition"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {quotas.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  No quotas allocated yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Overlay for Allocate/Update */}
      <AdminDetailOverlay
        isOpen={!!selectedQuota || (searchParams.get('selected_id') === 'new' && overlayMode === 'allocate')}
        title={
          overlayMode === 'allocate'
            ? 'Allocate Team Quota'
            : `Update Quota - ${selectedQuota?.team_name} / ${selectedQuota?.product_name}`
        }
        onClose={handleCloseOverlay}
        size="md"
        showFooter={true}
        footerContent={
          <div className="flex gap-3">
            <button
              onClick={handleCloseOverlay}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition font-medium"
            >
              Cancel
            </button>
            <button
              onClick={overlayMode === 'allocate' ? handleAllocate : handleUpdate}
              className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition font-medium"
            >
              {overlayMode === 'allocate' ? 'Allocate' : 'Update'}
            </button>
          </div>
        }
      >
        {overlayMode === 'allocate' ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="teamId" className="text-sm font-medium">Team ID</Label>
              <Input
                id="teamId"
                type="number"
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                placeholder="Enter team ID"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="productUpid" className="text-sm font-medium">Product UPID</Label>
              <Input
                id="productUpid"
                value={productUpid}
                onChange={(e) => setProductUpid(e.target.value)}
                placeholder="e.g., UALLOWANCE0001"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="quota" className="text-sm font-medium">Quota Amount</Label>
              <Input
                id="quota"
                type="number"
                value={quota}
                onChange={(e) => setQuota(e.target.value)}
                placeholder="10"
                className="mt-1"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg bg-gray-50 p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 font-medium">Team</p>
                  <p className="text-gray-900 font-mono">{selectedQuota?.team_name}</p>
                </div>
                <div>
                  <p className="text-gray-600 font-medium">Product</p>
                  <p className="text-gray-900">{selectedQuota?.product_name}</p>
                </div>
                <div>
                  <p className="text-gray-600 font-medium">UPID</p>
                  <p className="text-gray-900 font-mono">{selectedQuota?.upid}</p>
                </div>
                <div>
                  <p className="text-gray-600 font-medium">Currently Used</p>
                  <p className="text-gray-900">{selectedQuota?.used_count} / {selectedQuota?.allocated_count}</p>
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="updateQuota" className="text-sm font-medium">New Quota Amount</Label>
              <Input
                id="updateQuota"
                type="number"
                value={quota}
                onChange={(e) => setQuota(e.target.value)}
                placeholder="10"
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-2">
                Current: {selectedQuota?.allocated_count}, Used: {selectedQuota?.used_count}, Available: {selectedQuota?.available_count}
              </p>
            </div>
          </div>
        )}
      </AdminDetailOverlay>
    </div>
  );
}
