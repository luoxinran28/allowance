'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { apiClient } from '@/lib/api-client';
import { User } from '@/lib/types';

export default function ProfilePage() {
  const { user, setAuth } = useAuthStore();
  const [profile, setProfile] = useState<User | null>(user);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    email: user?.email || '',
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await apiClient.getUserProfile();
        const userData = response.data;
        setProfile(userData);
        setFormData({ email: userData.email });
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const response = await apiClient.updateProfile(formData);
      const updatedUser = response.data;

      setProfile(updatedUser);
      setAuth(updatedUser, localStorage.getItem('token') || '');
      setSuccess('Profile updated successfully');
      setIsEditing(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !profile) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">Failed to load profile. Please try again.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-3xl font-bold mb-8">My Profile</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-green-700">{success}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Summary Cards */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Account Status</h3>
            <div className="space-y-3">
              <div>
                <p className="text-gray-600 text-sm">Current Tier</p>
                <p className="text-2xl font-bold text-blue-600">{profile.tier}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Status</p>
                <p className="text-lg font-semibold">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    profile.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : profile.status === 'inactive'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {profile.status.charAt(0).toUpperCase() + profile.status.slice(1)}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Member Since</p>
                <p className="text-lg font-semibold">
                  {new Date(profile.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">User ID</h3>
            <p className="font-mono text-sm bg-gray-100 p-2 rounded break-all">{profile.uid}</p>
          </div>
        </div>

        {/* Profile Edit Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">Profile Details</h3>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Edit Profile
                </button>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={loading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({ email: profile.email });
                      setError('');
                    }}
                    disabled={loading}
                    className="bg-gray-300 text-gray-700 px-6 py-2 rounded hover:bg-gray-400 disabled:bg-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-gray-600 text-sm">Email Address</p>
                  <p className="text-lg font-semibold">{profile.email}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
