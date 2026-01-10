'use client';

import React from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { Lock, Sparkles, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface TierGateProps {
  children: React.ReactNode;
  /** The page name to check access for (e.g., 'dashboard', 'analytics', 'opportunities', 'settings') */
  page: string;
  /** Optional custom message to show when access is denied */
  message?: string;
  /** If true, redirects to upgrade page instead of showing inline message */
  redirect?: boolean;
}

/**
 * TierGate component restricts access to pages based on the user's subscription tier.
 * 
 * Free tier creators can only access: opportunities, settings
 * Pro tier creators and all agency accounts have full access.
 * 
 * Usage:
 * ```tsx
 * <TierGate page="dashboard">
 *   <DashboardContent />
 * </TierGate>
 * ```
 */
export function TierGate({ children, page, message, redirect = false }: TierGateProps) {
  const { canAccessPage } = useAuth();
  const router = useRouter();

  // If user can access the page, render children
  if (canAccessPage(page)) {
    return <>{children}</>;
  }

  // Handle redirect mode
  if (redirect) {
    router.push('/dashboard/upgrade');
    return null;
  }

  // Show upgrade prompt for free tier creators
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-xl">Upgrade to Pro</CardTitle>
          <CardDescription>
            {message || `This feature is available on the Pro plan. Start your free 30-day trial to unlock full platform access.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Pro includes:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Full dashboard & analytics
              </li>
              <li className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                AI-powered insights
              </li>
              <li className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Comment management tools
              </li>
              <li className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Automation features
              </li>
            </ul>
          </div>
          
          <Button 
            className="w-full" 
            onClick={() => router.push('/dashboard/upgrade')}
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Start Free 30-Day Trial
          </Button>
          
          <p className="text-xs text-center text-muted-foreground">
            Card required. Cancel anytime during trial.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Hook to check if user can access a specific page.
 * Returns { canAccess, isFreeTier, isCreator } for conditional rendering.
 */
export function useTierAccess(page: string) {
  const { canAccessPage, isFreeTier, isCreator, user } = useAuth();
  
  return {
    canAccess: canAccessPage(page),
    isFreeTier: isFreeTier(),
    isCreator: isCreator(),
    user,
  };
}

/**
 * Higher-order component to wrap pages with tier gating.
 */
export function withTierGate<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  page: string,
  options?: { message?: string; redirect?: boolean }
) {
  return function TierGatedComponent(props: P) {
    return (
      <TierGate page={page} message={options?.message} redirect={options?.redirect}>
        <WrappedComponent {...props} />
      </TierGate>
    );
  };
}
