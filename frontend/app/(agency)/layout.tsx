'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { AgencyLayout } from '@/components/agency/AgencyLayout';

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, checkAuth, user } = useAuth();
  const [isAgencyUser, setIsAgencyUser] = useState<boolean | null>(null);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isLoading || !isAuthenticated || !user) return;

    // Check if user is an agency user
    if (user.account_type !== 'agency') {
      // Not an agency user, redirect to regular dashboard
      router.push('/dashboard');
      return;
    }

    setIsAgencyUser(true);

    // Redirect /agency to /agency main page
    if (pathname === '/agency' || pathname === '/agency/') {
      // Already at the right place
    }
  }, [isLoading, isAuthenticated, user, pathname, router]);

  if (isLoading || isAgencyUser === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (!isAgencyUser) {
    return null;
  }

  return <AgencyLayout>{children}</AgencyLayout>;
}
