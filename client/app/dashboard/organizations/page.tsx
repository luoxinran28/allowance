'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { usePermission } from '@/lib/hooks/usePermission';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Loader2, Building2, Lock, Search } from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  created_at: string;
}

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { canManageOrganization } = usePermission();

  useEffect(() => {
    loadOrganizations();
  }, [page, searchQuery]);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      let response;

      if (searchQuery.trim()) {
        response = await apiClient.searchOrganizations(searchQuery, page, pageSize);
      } else {
        response = await apiClient.getUserOrganizations(page, pageSize);
      }

      // Handle both paginated and flat array responses
      const data = Array.isArray(response.data) ? response.data : response.data.data || [];
      setOrgs(data);
      setTotal(response.data.total || data.length);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Organization name is required');
      return;
    }

    try {
      setIsCreating(true);
      await apiClient.createOrganization(formData.name, formData.description);
      setFormData({ name: '', description: '' });
      setShowCreateForm(false);
      setPage(1);
      await loadOrganizations();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create organization');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organizations</h1>
          <p className="text-muted-foreground mt-2">Manage your organizations and team structures</p>
        </div>
        <Button 
          disabled={!canManageOrganization()}
          onClick={() => canManageOrganization() && setShowCreateForm(!showCreateForm)}
          variant={!canManageOrganization() ? 'outline' : 'default'}
          className="gap-2"
        >
          {!canManageOrganization() && <Lock className="h-4 w-4" />}
          Create Organization
        </Button>
      </div>

      {/* Permission Alert */}
      {!canManageOrganization() && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Organization creation requires Premium tier. You can still view and use organizations created by your team.
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
            <CardTitle>Create New Organization</CardTitle>
            <CardDescription>Set up a new organization to manage teams and licenses</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateOrg} className="space-y-4">
              <div>
                <Label htmlFor="name">Organization Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Acme Corporation"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What does this organization do?"
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <Button type="submit" disabled={isCreating}>
                  {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {isCreating ? 'Creating...' : 'Create Organization'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search organizations..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Organizations Grid */}
      {loading ? (
        <Card>
          <CardContent className="pt-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3" />
            <p className="text-muted-foreground">Loading organizations...</p>
          </CardContent>
        </Card>
      ) : orgs.length === 0 ? (
        <Card>
          <CardContent className="pt-12 text-center">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No organizations</h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery
                ? 'No organizations match your search'
                : canManageOrganization()
                ? 'Create your first organization to get started'
                : 'Organizations created by your team will appear here'}
            </p>
            {!searchQuery && canManageOrganization() && (
              <Button onClick={() => setShowCreateForm(true)}>Create Organization</Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {orgs.map((org) => (
              <Card key={org.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="truncate">{org.name}</CardTitle>
                      <CardDescription className="mt-1 text-xs">
                        Created {new Date(org.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <Building2 className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </div>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline" className="w-full">
                    <Link href={`/dashboard/organizations/${org.id}`}>View Details →</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Page {page} of {totalPages} · Showing {(page - 1) * pageSize + 1}-
                    {Math.min(page * pageSize, total)} of {total}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
