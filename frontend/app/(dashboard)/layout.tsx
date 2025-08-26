// frontend/app/(dashboard)/layout.tsx
'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, checkAuth, user, canAccessDashboard } = useAuth();

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
    // Waiting users -> waiting area
    if (!canAccessDashboard()) {
      if (pathname !== '/waiting-area') router.push('/waiting-area');
      return;
    }
    // Full access but business kind -> under construction view
    if (user.user_kind === 'business') {
      if (pathname !== '/under-construction') router.push('/under-construction');
      return;
    }
    // Content users with full access -> dashboard home if on waiting or UC
    if (pathname === '/waiting-area' || pathname === '/under-construction') {
      router.push('/dashboard');
    }
  }, [isLoading, isAuthenticated, user, canAccessDashboard, pathname, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // If user is on waiting list, show waiting area without dashboard layout
  if (user && !canAccessDashboard() && pathname === '/waiting-area') {
    return <>{children}</>;
  }

  // For users with dashboard access, show normal dashboard layout
  return <DashboardLayout>{children}</DashboardLayout>;
}