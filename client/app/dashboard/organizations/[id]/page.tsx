'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

interface Organization {
  id: string;
  name: string;
  created_at: string;
}

export default function OrgDetailsPage() {
  const params = useParams();
  const orgId = params.id as string;

  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    loadOrganization();
  }, [orgId]);

  const loadOrganization = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getOrganization(orgId);
      setOrg(response.data);
      setFormData({
        name: response.data.name || '',
        description: response.data.description || '',
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load organization');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Organization name is required');
      return;
    }

    try {
      setIsSaving(true);
      await apiClient.updateOrganization(orgId, formData);
      await loadOrganization();
      setIsEditing(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save organization');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await apiClient.deleteOrganization(orgId);
      window.location.href = '/dashboard/organizations';
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete organization');
      setDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-700">Organization not found</p>
        <Link
          href="/dashboard/organizations"
          className="text-blue-600 hover:underline mt-4 inline-block"
        >
          Back to Organizations
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <Link
          href="/dashboard/organizations"
          className="text-blue-600 hover:underline text-sm mb-2 inline-block"
        >
          ← Back to Organizations
        </Link>
        <h1 className="text-3xl font-bold">{org.name}</h1>
        <p className="text-gray-600 mt-2">
          Created {new Date(org.created_at).toLocaleDateString()}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
        {isEditing ? (
          <form onSubmit={handleSave} className="space-y-6">
            <h2 className="text-xl font-bold">Edit Organization</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Organization Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isSaving}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div>
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-xl font-bold">Organization Details</h2>
              <button
                onClick={() => setIsEditing(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
              >
                Edit
              </button>
            </div>

            <div className="space-y-4 pb-6 border-b">
              <div>
                <p className="text-sm text-gray-600">Organization Name</p>
                <p className="text-lg font-semibold">{org.name}</p>
              </div>
              {formData.description && (
                <div>
                  <p className="text-sm text-gray-600">Description</p>
                  <p className="text-base">{formData.description}</p>
                </div>
              )}
            </div>

            <div className="mt-6 pt-6">
              <button
                onClick={() => setDeleteConfirm(true)}
                className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700"
              >
                Delete Organization
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={deleteConfirm}
        title="Delete Organization"
        message="Are you sure you want to delete this organization? This action cannot be undone."
        confirmText="Delete"
        isDangerous
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(false)}
      />
    </div>
  );
}
