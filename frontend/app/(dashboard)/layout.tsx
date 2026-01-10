// frontend/app/(dashboard)/layout.tsx
'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { TierGate } from '@/components/shared/TierGate';

// Pages that Free tier creators can access
const FREE_TIER_ALLOWED_PATHS = [
  '/dashboard/opportunities',
  '/settings',
];

// Helper to check if a path is allowed for free tier
function isPathAllowedForFreeTier(pathname: string): boolean {
  return FREE_TIER_ALLOWED_PATHS.some(allowed => 
    pathname === allowed || pathname.startsWith(allowed + '/')
  );
}

// Helper to get page name from pathname for TierGate
function getPageNameFromPath(pathname: string): string {
  if (pathname.startsWith('/dashboard/opportunities') || pathname.startsWith('/opportunities')) return 'opportunities';
  if (pathname.startsWith('/settings')) return 'settings';
  if (pathname.startsWith('/dashboard')) return 'dashboard';
  if (pathname.startsWith('/ai-assistant')) return 'ai-assistant';
  if (pathname.startsWith('/analytics')) return 'analytics';
  if (pathname.startsWith('/interactions')) return 'interactions';
  if (pathname.startsWith('/comments')) return 'comments';
  if (pathname.startsWith('/insights')) return 'insights';
  if (pathname.startsWith('/monetization')) return 'monetization';
  return 'dashboard';
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, checkAuth, user, canAccessDashboard, isCreator, isFreeTier } = useAuth();

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

  // Get page name for tier gating
  const pageName = getPageNameFromPath(pathname);
  
  // Check if this is a free tier creator trying to access restricted pages
  const needsTierGate = isCreator() && isFreeTier() && !isPathAllowedForFreeTier(pathname);

  // For users with dashboard access, show normal dashboard layout
  // Wrap with TierGate for creators on restricted pages
  return (
    <CurrencyProvider>
      <DashboardLayout>
        {needsTierGate ? (
          <TierGate page={pageName}>
            {children}
          </TierGate>
        ) : (
          children
        )}
      </DashboardLayout>
    </CurrencyProvider>
  );
}