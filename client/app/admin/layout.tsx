'use client';

import { useAuthStore } from '@/lib/auth-store';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();

  // In a real app, check admin permissions from API
  const isAdmin = true; // TODO: implement permission checking

  if (!isAdmin && user) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-700 font-medium">Access Denied</p>
        <p className="text-red-600 text-sm mt-2">You don&apos;t have permission to access the admin panel</p>
        <Link href="/dashboard" className="text-blue-600 hover:underline mt-4 inline-block">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Sidebar */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-lg shadow p-6 sticky top-4">
          <h2 className="text-lg font-bold mb-4">Admin Menu</h2>
          <nav className="space-y-2">
            <Link
              href="/admin/users"
              className="block px-4 py-2 rounded hover:bg-blue-50 text-blue-600 font-medium"
            >
              Users
            </Link>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:col-span-3">{children}</div>
    </div>
  );
}
