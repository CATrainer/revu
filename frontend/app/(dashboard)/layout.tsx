// frontend/app/(dashboard)/layout.tsx
'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { CurrencyProvider } from '@/contexts/CurrencyContext';

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
    
    // Users without dashboard access -> redirect to appropriate page
    if (!canAccessDashboard()) {
      const { getRedirectPath } = useAuth.getState();
      const redirectPath = getRedirectPath();
      router.push(redirectPath);
      return;
    }
    
    // All authenticated users with access go to dashboard
    if (pathname === '/') {
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

  // Removed waiting area logic - simplified for social media focus

  // For users with dashboard access, show normal dashboard layout
  return (
    <CurrencyProvider>
      <DashboardLayout>{children}</DashboardLayout>
    </CurrencyProvider>
  );
}