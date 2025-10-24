'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Loader2 } from 'lucide-react';

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      // Not authenticated - redirect to login
      if (!isAuthenticated || !user) {
        router.push('/login');
        return;
      }

      // Admin users shouldn't be in onboarding
      if (user.is_admin) {
        router.push('/admin');
        return;
      }

      // Legacy users bypass onboarding
      if (user.account_type === 'legacy') {
        router.push('/dashboard');
        return;
      }

      // Approved users should go to dashboard
      if (user.approval_status === 'approved') {
        router.push('/dashboard');
        return;
      }
    }
  }, [user, isAuthenticated, isLoading, router]);

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center section-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-green-500" />
          <p className="text-secondary-dark">Loading...</p>
        </div>
      </div>
    );
  }

  // Show nothing if redirecting
  if (!isAuthenticated || !user || user.is_admin || user.account_type === 'legacy' || user.approval_status === 'approved') {
    return null;
  }

  return <>{children}</>;
}
