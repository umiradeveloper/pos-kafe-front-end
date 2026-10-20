'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Spinner } from '@/components/ui';
import { useAuth } from '@/lib/auth';

export default function Home() {
  const { user, loading, isManager } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login');
    else router.replace(isManager ? '/dashboard' : '/pos');
  }, [user, loading, isManager, router]);

  return <Spinner />;
}
