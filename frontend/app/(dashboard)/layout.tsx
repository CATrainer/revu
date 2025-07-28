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
    // If user is authenticated but doesn't have dashboard access,
    // redirect to waiting area (unless they're already there)
    if (!isLoading && isAuthenticated && user && !canAccessDashboard()) {
      if (pathname !== '/waiting-area') {
        router.push('/waiting-area');
      }
    }
    
    // If user has dashboard access but is on waiting area, redirect to dashboard
    if (!isLoading && isAuthenticated && user && canAccessDashboard()) {
      if (pathname === '/waiting-area') {
        router.push('/dashboard');
      }
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