'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePermission } from '@/lib/hooks/usePermission';

interface NavItem {
  href: string;
  label: string;
  icon: string;
  requiredPermission?: string;
}

const mainNavItems: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: '📊',
  },
  {
    href: '/dashboard/teams',
    label: 'Teams',
    icon: '👥',
  },
  {
    href: '/dashboard/organizations',
    label: 'Organizations',
    icon: '🏢',
  },
  {
    href: '/dashboard/products',
    label: 'Products',
    icon: '📦',
  },
  {
    href: '/dashboard/billing',
    label: 'Billing',
    icon: '💳',
  },
];

const batchNavItems: NavItem[] = [
  {
    href: '/dashboard/batch/generate',
    label: 'Generate Licenses',
    icon: '✨',
  },
  {
    href: '/dashboard/batch/revoke',
    label: 'Revoke Licenses',
    icon: '❌',
  },
  {
    href: '/dashboard/batch/export',
    label: 'Export Licenses',
    icon: '⬇️',
  },
];

const adminNavItems: NavItem[] = [
  {
    href: '/admin/products',
    label: 'Manage Products',
    icon: '📦',
    requiredPermission: 'product:read',
  },
  {
    href: '/admin/users',
    label: 'Manage Users',
    icon: '👤',
    requiredPermission: 'user:read',
  },
  {
    href: '/admin/approvals',
    label: 'Approvals',
    icon: '✅',
    requiredPermission: 'admin:approvals',
  },
];

export default function Sidebar({ isOpen = true }: { isOpen?: boolean }) {
  const pathname = usePathname();
  const { hasPermission, isAdmin } = usePermission();

  const isActive = (href: string): boolean => {
    return pathname === href || pathname.startsWith(href + '/');
  };

  const NavLink = ({ item }: { item: NavItem }) => {
    // Check permission if required
    if (item.requiredPermission && !hasPermission(item.requiredPermission)) {
      return null;
    }

    return (
      <Link
        href={item.href}
        className={`flex items-center gap-3 px-4 py-2 rounded-lg transition ${
          isActive(item.href)
            ? 'bg-blue-100 text-blue-900 font-semibold'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        <span className="text-xl">{item.icon}</span>
        <span>{item.label}</span>
      </Link>
    );
  };

  return (
    <aside
      className={`${
        isOpen ? 'block' : 'hidden'
      } w-64 bg-white border-r border-gray-200 p-4 space-y-6 overflow-y-auto h-[calc(100vh-64px)] sticky top-16`}
    >
      {/* Main Navigation */}
      <nav>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-4">
          Main Menu
        </p>
        <div className="space-y-1">
          {mainNavItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>
      </nav>

      {/* Batch Operations */}
      <nav>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-4">
          Batch Operations
        </p>
        <div className="space-y-1">
          {batchNavItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>
      </nav>

      {/* Admin Section */}
      {isAdmin() && (
        <nav>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-4">
            Administration
          </p>
          <div className="space-y-1">
            {adminNavItems.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </div>
        </nav>
      )}

      {/* Help Section */}
      <nav className="pt-4 border-t">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-4">
          Resources
        </p>
        <div className="space-y-1">
          <a
            href="mailto:support@allowance.example.com"
            className="flex items-center gap-3 px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition"
          >
            <span className="text-xl">💬</span>
            <span>Support</span>
          </a>
          <a
            href="/docs"
            className="flex items-center gap-3 px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition"
          >
            <span className="text-xl">📖</span>
            <span>Documentation</span>
          </a>
        </div>
      </nav>
    </aside>
  );
}
