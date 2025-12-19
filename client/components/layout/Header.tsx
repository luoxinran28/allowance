'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Menu, X, LogOut, Settings, User } from 'lucide-react';

export default function Header() {
  const router = useRouter();
  const { user, logout, isAuthenticated } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  // Only render if authenticated
  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <header className="border-b border-border bg-background sticky top-0 z-50">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo/Brand */}
        <Link href="/user/profile" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">A</span>
          </div>
          <span className="text-lg font-semibold hidden sm:inline">
            Allowance
          </span>
        </Link>

        {/* Right Side - Tier Badge and User Menu */}
        <div className="flex items-center gap-4">
          {/* Current Tier Badge */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-muted">
            <span className="text-xs font-medium text-muted-foreground">
              Tier: <span className="capitalize font-semibold text-foreground">{user.tier}</span>
            </span>
          </div>

          {/* User Menu Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <User className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user.email}</p>
                  <p className="text-xs text-muted-foreground capitalize">{user.status}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/user/profile">
                  <Settings className="mr-2 h-4 w-4" />
                  View Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/user/billing">
                  <Settings className="mr-2 h-4 w-4" />
                  Billing & Plans
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

        <div className="md:hidden border-t border-border">
          <nav className="container py-4 space-y-2">
            <Link
              href="/user/profile"
              className="block px-4 py-2 rounded-md hover:bg-accent text-sm"
              onClick={() => setMobileMenuOpen(false)}
            >
              Dashboard
            </Link>
            <Link
              href="/user/profile"
              className="block px-4 py-2 rounded-md hover:bg-accent text-sm"
              onClick={() => setMobileMenuOpen(false)}
            >
              Profile
            </Link>
            <Link
              href="/user/billing"
              className="block px-4 py-2 rounded-md hover:bg-accent text-sm"
              onClick={() => setMobileMenuOpen(false)}
            >
              Billing
            </Link>
          </nav>
        </div>
    </header>
  );
}
