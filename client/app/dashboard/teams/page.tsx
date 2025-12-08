'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { usePermission } from '@/lib/hooks/usePermission';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, Loader2, Users, Lock } from 'lucide-react';

interface Team {
  id: number;
  name: string;
  organization_id?: number;
  organization_name?: string;
  created_at: string;
  [key: string]: any;
}

interface Organization {
  id: number;
  name: string;
}

export default function TeamsListPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', organization_id: '' });
  const [isCreating, setIsCreating] = useState(false);
  const { canManageOrganization } = usePermission();

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      setLoading(true);
      const [teamsRes, orgsRes] = await Promise.all([
        apiClient.listTeams(),
        apiClient.getUserOrganizations(1, 1000)
      ]);
      setTeams(Array.isArray(teamsRes.data) ? teamsRes.data : []);
      
      const orgsList = Array.isArray(orgsRes.data?.data)
        ? orgsRes.data.data
        : Array.isArray(orgsRes.data)
        ? orgsRes.data
        : [];
      setOrganizations(orgsList);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Team name is required');
      return;
    }
    if (!formData.organization_id) {
      setError('Organization is required');
      return;
    }

    try {
      setIsCreating(true);
      await apiClient.createTeam(formData.name, formData.description, Number(formData.organization_id));
      setFormData({ name: '', description: '', organization_id: '' });
      setShowCreateForm(false);
      await loadTeams();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create team');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teams</h1>
          <p className="text-muted-foreground mt-2">Manage your teams and collaborate with members</p>
        </div>
        {canManageOrganization() ? (
          <Button onClick={() => setShowCreateForm(!showCreateForm)}>
            {showCreateForm ? 'Cancel' : '+ Create Team'}
          </Button>
        ) : (
          <Button disabled variant="outline" className="gap-2">
            <Lock className="h-4 w-4" />
            Premium feature
          </Button>
        )}
      </div>

      {/* Permission Alert */}
      {!canManageOrganization() && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Team creation requires Premium tier. You can still view and join existing teams.
          </AlertDescription>
        </Alert>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Create Form */}
      {showCreateForm && canManageOrganization() && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Team</CardTitle>
            <CardDescription>Set up a new team to collaborate with your members</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div>
                <Label htmlFor="organization">Organization *</Label>
                <Select value={formData.organization_id} onValueChange={(value) => setFormData({ ...formData, organization_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id.toString()}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="name">Team Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Engineering Team"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What's this team for?"
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <Button type="submit" disabled={isCreating}>
                  {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {isCreating ? 'Creating...' : 'Create Team'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Teams Grid */}
      {loading ? (
        <Card>
          <CardContent className="pt-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3" />
            <p className="text-muted-foreground">Loading teams...</p>
          </CardContent>
        </Card>
      ) : teams.length === 0 ? (
        <Card>
          <CardContent className="pt-12 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No teams yet</h3>
            <p className="text-muted-foreground mb-6">
              {canManageOrganization()
                ? 'Create your first team to get started'
                : 'Teams created by your organization will appear here'}
            </p>
            {canManageOrganization() && (
              <Button onClick={() => setShowCreateForm(true)}>Create Team</Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => {
            const org = organizations.find((o) => o.id === team.organization_id);
            return (
              <Card key={team.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="truncate">{team.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {org?.name || `Organization #${team.organization_id}`}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">
                      {new Date(team.created_at).toLocaleDateString()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline" className="w-full">
                    <Link href={`/dashboard/teams/${team.id}`}>View Details →</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
