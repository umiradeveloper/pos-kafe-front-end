'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Sidebar } from '@/components/sidebar';
import { Spinner } from '@/components/ui';
import { useAuth } from '@/lib/auth';

/** Halaman yang hanya boleh dibuka Owner/Admin */
const MANAGER_PATHS = ['/dashboard', '/products', '/categories', '/stock', '/shifts', '/users', '/settings'];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isManager } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const forbidden = !isManager && MANAGER_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login');
    else if (forbidden) router.replace('/pos');
  }, [loading, user, forbidden, router]);

  if (loading || !user || forbidden) return <Spinner />;

  return (
    <div className="min-h-screen lg:flex">
      <Sidebar />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
