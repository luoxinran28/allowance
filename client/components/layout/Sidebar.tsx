'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePermission } from '@/lib/hooks/usePermission';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Users,
  Building2,
  Package,
  CreditCard,
  Zap,
  XCircle,
  Download,
  HelpCircle,
  FileText,
  CheckCircle2,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  requiredPermission?: string;
}

const mainNavItems: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    href: '/dashboard/teams',
    label: 'Teams',
    icon: <Users className="h-4 w-4" />,
  },
  {
    href: '/dashboard/organizations',
    label: 'Organizations',
    icon: <Building2 className="h-4 w-4" />,
  },
  {
    href: '/dashboard/products',
    label: 'Products',
    icon: <Package className="h-4 w-4" />,
  },
  {
    href: '/dashboard/billing',
    label: 'Billing',
    icon: <CreditCard className="h-4 w-4" />,
  },
];

const licenseNavItems: NavItem[] = [
  {
    href: '/dashboard/licenses/mine',
    label: 'My Licenses',
    icon: <Package className="h-4 w-4" />,
  },
  {
    href: '/dashboard/licenses/request',
    label: 'Request License',
    icon: <FileText className="h-4 w-4" />,
  },
  {
    href: '/dashboard/licenses/assign',
    label: 'Assign Licenses',
    icon: <Users className="h-4 w-4" />,
    requiredPermission: 'team:manage',
  },
];

const batchNavItems: NavItem[] = [
  {
    href: '/dashboard/batch/generate',
    label: 'Generate Licenses',
    icon: <Zap className="h-4 w-4" />,
  },
  {
    href: '/dashboard/batch/revoke',
    label: 'Revoke Licenses',
    icon: <XCircle className="h-4 w-4" />,
  },
  {
    href: '/dashboard/batch/export',
    label: 'Export Licenses',
    icon: <Download className="h-4 w-4" />,
  },
];

const adminNavItems: NavItem[] = [
  {
    href: '/admin/products',
    label: 'Manage Products',
    icon: <Package className="h-4 w-4" />,
    requiredPermission: 'product:read',
  },
  {
    href: '/admin/users',
    label: 'Manage Users',
    icon: <Users className="h-4 w-4" />,
    requiredPermission: 'user:read',
  },
  {
    href: '/admin/approvals',
    label: 'Approvals',
    icon: <CheckCircle2 className="h-4 w-4" />,
    requiredPermission: 'admin:approvals',
  },
];

export default function Sidebar({ isOpen = true }: { isOpen?: boolean }) {
  const pathname = usePathname();
  const { hasPermission, isAdmin } = usePermission();

  const isActive = (href: string): boolean => {
    if (href === '/dashboard') {
      // Exact match for dashboard root only
      return pathname === href;
    }
    // For other routes, check if pathname starts with href
    return pathname === href || pathname.startsWith(href + '/');
  };

  const NavLink = ({ item }: { item: NavItem }) => {
    // Check permission if required
    if (item.requiredPermission && !hasPermission(item.requiredPermission)) {
      return null;
    }

    return (
      <Button
        variant={isActive(item.href) ? 'default' : 'ghost'}
        className="w-full justify-start gap-3"
        asChild
      >
        <Link href={item.href}>
          {item.icon}
          <span>{item.label}</span>
        </Link>
      </Button>
    );
  };

  return (
    <aside
      className={`${
        isOpen ? 'block' : 'hidden'
      } w-64 border-r border-border bg-card p-4 space-y-6 overflow-y-auto h-[calc(100vh-64px)] sticky top-16`}
    >
      {/* Main Navigation */}
      <nav className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-4">
          Main Menu
        </p>
        <div className="space-y-1">
          {mainNavItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>
      </nav>

      {/* License Management */}
      <nav className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-4">
          License Management
        </p>
        <div className="space-y-1">
          {licenseNavItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>
      </nav>

      {/* Batch Operations */}
      <nav className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-4">
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
        <nav className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-4">
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
      <nav className="pt-4 border-t border-border space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-4">
          Resources
        </p>
        <div className="space-y-1">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3"
            asChild
          >
            <a href="mailto:support@allowance.example.com">
              <HelpCircle className="h-4 w-4" />
              <span>Support</span>
            </a>
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3"
            asChild
          >
            <a href="/docs">
              <FileText className="h-4 w-4" />
              <span>Documentation</span>
            </a>
          </Button>
        </div>
      </nav>
    </aside>
  );
}
