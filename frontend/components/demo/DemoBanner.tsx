/**
 * Server Component: Demo Mode Banner
 * 
 * This component displays the current demo mode status on the dashboard.
 * It's a Server Component that receives demo status as props.
 */

import Link from 'next/link';
import { Sparkles, Settings2 } from 'lucide-react';
import { ModernButton } from '@/components/ui/modern-button';

interface DemoBannerProps {
  status: string;
  profile?: {
    niche: string;
    yt_subscribers: number;
    ig_followers: number;
  };
  error?: string;
  hasAccess?: boolean;
}

export function DemoBanner({ status, profile, error, hasAccess }: DemoBannerProps) {
  // Don't show banner if user doesn't have access to demo mode
  if (hasAccess === false) {
    return null;
  }

  // Enabled state
  if (status === 'enabled') {
    return (
      <div className="glass-panel rounded-2xl border border-holo-purple/30 p-6 shadow-glow-purple backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-3 w-3 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 animate-pulse-glow shadow-glow-teal" />
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-holo-purple" />
                <span className="font-bold text-lg text-holo-purple">Demo Mode Active</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1.5">
                Using simulated data from{' '}
                <span className="font-semibold text-foreground">
                  {profile?.niche?.replace('_', ' ') || 'your demo profile'}
                </span>
                . Interactions will arrive shortly.
              </p>
            </div>
          </div>
          <Link href="/settings/demo-mode">
            <ModernButton variant="outline" size="sm">
              <Settings2 className="h-4 w-4 mr-2" />
              Manage Demo
            </ModernButton>
          </Link>
        </div>
      </div>
    );
  }

  // Enabling state
  if (status === 'enabling') {
    return (
      <div className="glass-panel rounded-2xl border border-yellow-500/30 p-6 shadow-glow-yellow backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-3 w-3 rounded-full bg-yellow-500 animate-pulse" />
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-yellow-500" />
                <span className="font-bold text-lg text-yellow-500">Demo Mode Setting Up</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1.5">
                Your demo profile is being created. This takes about 1-2 minutes. You can close this
                page and come back.
              </p>
            </div>
          </div>
          <Link href="/settings/demo-mode">
            <ModernButton variant="outline" size="sm">
              <Settings2 className="h-4 w-4 mr-2" />
              View Progress
            </ModernButton>
          </Link>
        </div>
      </div>
    );
  }

  // Failed state
  if (status === 'failed') {
    return (
      <div className="glass-panel rounded-2xl border border-red-500/30 p-6 shadow-glow-red backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-3 w-3 rounded-full bg-red-500" />
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-red-500" />
                <span className="font-bold text-lg text-red-500">Demo Mode Failed</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1.5">
                {error || 'An error occurred while setting up demo mode.'}
              </p>
            </div>
          </div>
          <Link href="/settings/demo-mode">
            <ModernButton variant="outline" size="sm">
              <Settings2 className="h-4 w-4 mr-2" />
              Retry
            </ModernButton>
          </Link>
        </div>
      </div>
    );
  }

  // Disabling state
  if (status === 'disabling') {
    return (
      <div className="glass-panel rounded-2xl border border-yellow-500/30 p-6 shadow-glow-yellow backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-3 w-3 rounded-full bg-yellow-500 animate-pulse" />
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-yellow-500" />
                <span className="font-bold text-lg text-yellow-500">Cleaning Up Demo Mode</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1.5">
                Removing demo data and resetting your account. This will take a moment.
              </p>
            </div>
          </div>
          <Link href="/settings/demo-mode">
            <ModernButton variant="outline" size="sm">
              <Settings2 className="h-4 w-4 mr-2" />
              View Progress
            </ModernButton>
          </Link>
        </div>
      </div>
    );
  }

  // No banner for disabled state
  return null;
}
