'use client';

import { useEffect, useState } from 'react';
import { usePermission } from '@/lib/hooks/usePermission';
import { useAuthStore } from '@/lib/auth-store';
import Link from 'next/link';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAdmin } = usePermission();
  const { initialize } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    initialize();
    setMounted(true);
  }, [initialize]);

  if (!mounted) return null;

  if (!isAdmin()) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Access Denied - You don't have permission to access the admin panel. Only administrators can access this area.
          </AlertDescription>
        </Alert>
        <Button asChild>
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
