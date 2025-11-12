'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { usePermission } from '@/lib/hooks/usePermission';

export default function Header() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { isAdmin } = usePermission();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  if (!user) {
    return null;
  }

  return (
    <header className="bg-white shadow sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <span className="text-xl font-bold text-gray-900 hidden sm:inline">
              Allowance
            </span>
          </Link>

          {/* Right Side - User Menu */}
          <div className="flex items-center gap-4">
            {/* Current Tier Badge */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-full border border-blue-200">
              <span className="text-xs font-medium text-blue-700">
                Tier: <span className="capitalize font-bold">{user.tier}</span>
              </span>
            </div>

            {/* User Menu Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">
                    {user.email.charAt(0).toUpperCase()}
                  </span>
                </div>
                <svg
                  className={`w-4 h-4 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <div className="px-4 py-2 border-b">
                    <p className="text-sm font-semibold text-gray-900">{user.email}</p>
                    <p className="text-xs text-gray-500">
                      {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                    </p>
                  </div>

                  <Link
                    href="/dashboard/profile"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    View Profile
                  </Link>

                  <Link
                    href="/dashboard/billing"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    Billing & Plans
                  </Link>

                  {isAdmin() && (
                    <>
                      <div className="border-t my-1"></div>
                      <Link
                        href="/admin/users"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        Admin Panel
                      </Link>
                    </>
                  )}

                  <div className="border-t my-1"></div>

                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
