'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, X, Youtube, Instagram, Music } from 'lucide-react';
import { PlatformConnectionButton } from '@/components/integrations/PlatformConnectionButton';

interface PlatformWarningBannerProps {
  disconnectedPlatforms: string[];
  onDismiss?: () => void;
}

const platformConfig: Record<string, { icon: React.ElementType; name: string; color: string }> = {
  youtube: { icon: Youtube, name: 'YouTube', color: 'text-red-500' },
  instagram: { icon: Instagram, name: 'Instagram', color: 'text-pink-500' },
  tiktok: { icon: Music, name: 'TikTok', color: 'text-foreground' },
};

export function PlatformWarningBanner({ disconnectedPlatforms, onDismiss }: PlatformWarningBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  // Check localStorage for dismissed state on mount
  useEffect(() => {
    const dismissed = localStorage.getItem('platform-warning-dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      // Re-show after 24 hours
      if (Date.now() - dismissedTime < 24 * 60 * 60 * 1000) {
        setIsDismissed(true);
      } else {
        localStorage.removeItem('platform-warning-dismissed');
      }
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('platform-warning-dismissed', Date.now().toString());
    onDismiss?.();
  };

  if (isDismissed || disconnectedPlatforms.length === 0) {
    return null;
  }

  return (
    <div className="relative glass-panel rounded-2xl border border-amber-500/30 p-6 shadow-glass backdrop-blur-md animate-slide-up">
      <button
        onClick={handleDismiss}
        className="absolute top-4 right-4 p-1 rounded-lg hover:bg-amber-500/10 transition-colors"
        aria-label="Dismiss warning"
      >
        <X className="h-5 w-5 text-amber-500" />
      </button>

      <div className="flex items-start gap-4">
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <AlertTriangle className="h-6 w-6 text-amber-500" />
        </div>

        <div className="flex-1 space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Connect Your Platforms
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Connect your social media accounts to unlock full dashboard insights and engagement features.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {disconnectedPlatforms.map((platform) => {
              const config = platformConfig[platform];
              if (!config) return null;
              
              return (
                <div key={platform} className="flex items-center gap-2">
                  <PlatformConnectionButton platform={platform as 'youtube' | 'instagram' | 'tiktok'} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
