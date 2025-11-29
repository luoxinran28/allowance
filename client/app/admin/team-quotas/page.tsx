'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Edit } from 'lucide-react';

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
  const [quotas, setQuotas] = useState<TeamQuota[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [allocateDialogOpen, setAllocateDialogOpen] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [selectedQuota, setSelectedQuota] = useState<TeamQuota | null>(null);
  
  // Allocate form
  const [teamId, setTeamId] = useState('');
  const [productUpid, setProductUpid] = useState('');
  const [quota, setQuota] = useState('10');

  useEffect(() => {
    loadQuotas();
  }, []);

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

  const handleAllocate = async () => {
    try {
      await apiClient.allocateQuota(parseInt(teamId), productUpid, parseInt(quota));
      setAllocateDialogOpen(false);
      setTeamId('');
      setProductUpid('');
      setQuota('10');
      loadQuotas();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to allocate quota');
    }
  };

  const handleUpdate = async () => {
    if (!selectedQuota) return;
    try {
      await apiClient.updateQuota(selectedQuota.team_id, selectedQuota.upid, parseInt(quota));
      setUpdateDialogOpen(false);
      setSelectedQuota(null);
      setQuota('10');
      loadQuotas();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update quota');
    }
  };

  const openUpdateDialog = (quotaItem: TeamQuota) => {
    setSelectedQuota(quotaItem);
    setQuota(quotaItem.allocated_count.toString());
    setUpdateDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Team Product Quotas</CardTitle>
              <CardDescription>
                Manage quota allocations for teams across products
              </CardDescription>
            </div>
            <Button onClick={() => setAllocateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Allocate Quota
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-4">Team</th>
                  <th className="text-left py-2 px-4">Product</th>
                  <th className="text-left py-2 px-4">UPID</th>
                  <th className="text-right py-2 px-4">Allocated</th>
                  <th className="text-right py-2 px-4">Used</th>
                  <th className="text-right py-2 px-4">Available</th>
                  <th className="text-right py-2 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {quotas.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-4 font-medium">{item.team_name}</td>
                    <td className="py-2 px-4">{item.product_name}</td>
                    <td className="py-2 px-4 font-mono text-xs">{item.upid}</td>
                    <td className="py-2 px-4 text-right">{item.allocated_count}</td>
                    <td className="py-2 px-4 text-right">{item.used_count}</td>
                    <td className="py-2 px-4 text-right">{item.available_count}</td>
                    <td className="py-2 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openUpdateDialog(item)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {quotas.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      No quotas allocated yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Allocate Dialog */}
      <Dialog open={allocateDialogOpen} onOpenChange={setAllocateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Allocate Team Quota</DialogTitle>
            <DialogDescription>
              Assign a quota for a specific product to a team
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="teamId">Team ID</Label>
              <Input
                id="teamId"
                type="number"
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                placeholder="Enter team ID"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="productUpid">Product UPID</Label>
              <Input
                id="productUpid"
                value={productUpid}
                onChange={(e) => setProductUpid(e.target.value)}
                placeholder="e.g., UALLOWANCE0001"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="quota">Quota</Label>
              <Input
                id="quota"
                type="number"
                value={quota}
                onChange={(e) => setQuota(e.target.value)}
                placeholder="10"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAllocateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAllocate}>Allocate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Dialog */}
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Quota</DialogTitle>
            <DialogDescription>
              Update quota for {selectedQuota?.team_name} - {selectedQuota?.product_name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="updateQuota">New Quota</Label>
              <Input
                id="updateQuota"
                type="number"
                value={quota}
                onChange={(e) => setQuota(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
