'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Allowance Dashboard</h1>
          <div className="space-x-4">
            <a href="/dashboard/profile" className="text-blue-600 hover:underline">
              Profile
            </a>
            <a href="/dashboard/products" className="text-blue-600 hover:underline">
              Products
            </a>
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
