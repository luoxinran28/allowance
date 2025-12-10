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
  User,
  BarChart3,
  Plus,
  Trash2,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  external?: boolean;
  visible?: (perms: ReturnType<typeof usePermission>) => boolean;
}

interface NavSection {
  title: string;
  visible: (perms: ReturnType<typeof usePermission>) => boolean;
  items: NavItem[];
}

// Main Navigation (all users)
const mainNavItems: NavItem[] = [
  {
    href: '/dashboard/profile',
    label: 'Profile',
    icon: <User className="h-4 w-4" />,
  },
  {
    href: '/dashboard/billing',
    label: 'Billing',
    icon: <CreditCard className="h-4 w-4" />,
  },
];

// Organization & License (premium/allstar)
const orgLicenseItems: NavItem[] = [
  {
    href: '/dashboard/org-license/products',
    label: 'Products & Licenses',
    icon: <Package className="h-4 w-4" />,
  },
  {
    href: '/dashboard/org-license/assign',
    label: 'Assign Licenses',
    icon: <Users className="h-4 w-4" />,
  },
];

// Team Management (standard/premium/allstar)
const teamMgmtItems: NavItem[] = [
  {
    href: '/dashboard/team-management/quotas',
    label: 'Team & Quotas',
    icon: <BarChart3 className="h-4 w-4" />,
  },
  {
    href: '/dashboard/team-management/members',
    label: 'Team Members',
    icon: <Users className="h-4 w-4" />,
  },
];

// Admin Section (allstar only)
const adminNavItems: NavItem[] = [
  {
    href: '/admin/dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    href: '/admin/products',
    label: 'Products',
    icon: <Package className="h-4 w-4" />,
  },
  {
    href: '/admin/organizations',
    label: 'Organizations',
    icon: <Building2 className="h-4 w-4" />,
  },
  {
    href: '/admin/users',
    label: 'Users',
    icon: <Users className="h-4 w-4" />,
  },
  {
    href: '/admin/batch/generate',
    label: 'Generate Licenses',
    icon: <Plus className="h-4 w-4" />,
  },
  {
    href: '/admin/batch/revoke',
    label: 'Revoke Licenses',
    icon: <Trash2 className="h-4 w-4" />,
  },
  {
    href: '/admin/batch/export',
    label: 'Export Licenses',
    icon: <Download className="h-4 w-4" />,
  },
];

// Help Section (all users)
const helpNavItems: NavItem[] = [
  {
    href: 'mailto:support@allowance.example.com',
    label: 'Support',
    icon: <HelpCircle className="h-4 w-4" />,
    external: true,
  },
  {
    href: '/docs',
    label: 'Documentation',
    icon: <FileText className="h-4 w-4" />,
  },
];

export default function Sidebar({ isOpen = true }: { isOpen?: boolean }) {
  const pathname = usePathname();
  const perms = usePermission();

  const isActive = (href: string): boolean => {
    if (href === '/dashboard') {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(href + '/');
  };

  // Define all sections
  const sections: NavSection[] = [
    {
      title: 'Main Menu',
      visible: () => true,
      items: mainNavItems,
    },
    {
      title: 'Organization & License',
      visible: () => perms.canAccessOrgLicenseSection(),
      items: orgLicenseItems,
    },
    {
      title: 'Team Management',
      visible: () => perms.canAccessTeamManagement(),
      items: teamMgmtItems,
    },
    {
      title: 'Administration',
      visible: () => perms.canAccessAdminSection(),
      items: adminNavItems,
    },
    {
      title: 'Resources',
      visible: () => true,
      items: helpNavItems,
    },
  ];

  const NavLink = ({ item }: { item: NavItem }) => {
    return item.external || item.href.startsWith('http') || item.href.startsWith('mailto:') ? (
      <a href={item.href} className="block" target={item.external ? '_blank' : undefined} rel={item.external ? 'noopener noreferrer' : undefined}>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3"
        >
          {item.icon}
          <span>{item.label}</span>
        </Button>
      </a>
    ) : (
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
      {sections.map((section) =>
        !section.visible(perms) ? null : (
          <nav key={section.title} className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-4">
              {section.title}
            </p>
            <div className="space-y-1">
              {section.items.map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
            </div>
          </nav>
        )
      )}
    </aside>
  );
}
