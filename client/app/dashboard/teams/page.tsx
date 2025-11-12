'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';

interface Team {
  id: number;
  name: string;
  created_at: string;
  [key: string]: any;
}

export default function TeamsListPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      setLoading(true);
      const response = await apiClient.listTeams();
      setTeams(Array.isArray(response.data) ? response.data : []);
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

    try {
      setIsCreating(true);
      await apiClient.createTeam(formData.name, formData.description);
      setFormData({ name: '', description: '' });
      setShowCreateForm(false);
      await loadTeams();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create team');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Teams</h1>
          <p className="text-gray-600">Manage your teams and collaborate with members</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          {showCreateForm ? 'Cancel' : '+ Create Team'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {showCreateForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Create New Team</h2>
          <form onSubmit={handleCreateTeam} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Team Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Engineering Team"
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
                placeholder="What's this team for?"
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isCreating}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                {isCreating ? 'Creating...' : 'Create Team'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : teams.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No teams yet</h3>
          <p className="text-gray-600 mb-6">Create your first team to get started</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Create Team
          </button>
        </div>
      ) : (
        <div className="grid gap-6">
          {teams.map((team) => (
            <div
              key={team.id}
              className="bg-white rounded-lg shadow hover:shadow-lg transition p-6"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{team.name}</h3>
                  <p className="text-gray-600 text-sm mt-1">
                    Created {new Date(team.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Link
                  href={`/dashboard/teams/${team.id}`}
                  className="bg-blue-100 text-blue-700 px-4 py-2 rounded hover:bg-blue-200 text-sm font-medium"
                >
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
