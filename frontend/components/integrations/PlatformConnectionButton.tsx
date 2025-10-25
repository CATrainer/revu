"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useStore } from '@/lib/store';
import ConnectButton from '@/components/youtube/ConnectButton';
import { AlertCircle } from 'lucide-react';

interface PlatformConnectionButtonProps {
  platform: 'youtube' | 'instagram' | 'tiktok';
  className?: string;
  size?: 'default' | 'sm' | 'lg';
  variant?: 'default' | 'outline';
}

export function PlatformConnectionButton({ 
  platform, 
  className, 
  size = 'sm',
  variant = 'outline'
}: PlatformConnectionButtonProps) {
  const { integrations, setIntegrationStatus } = useStore();
  const [demoMode, setDemoMode] = useState<boolean>(false);
  const [showDemoWarning, setShowDemoWarning] = useState<boolean>(false);

  useEffect(() => {
    const fetchDemoStatus = async () => {
      try {
        const response = await fetch('/api/demo/status');
        if (response.ok) {
          const data = await response.json();
          setDemoMode(data.status === 'enabled');
        }
      } catch (error) {
        console.error('Failed to fetch demo status:', error);
      }
    };
    fetchDemoStatus();
  }, []);

  const integration = integrations.find(i => i.id === platform);

  // YouTube uses a different component
  if (platform === 'youtube') {
    if (demoMode) {
      return (
        <div className={className}>
          <Button 
            variant={variant} 
            size={size}
            disabled
            onClick={() => setShowDemoWarning(true)}
            className="relative"
          >
            Connect YouTube
          </Button>
          {showDemoWarning && (
            <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              <span>Platform connections are disabled in demo mode</span>
            </div>
          )}
        </div>
      );
    }
    return <ConnectButton className={className} />;
  }

  // Instagram and TikTok
  const handleConnect = () => {
    if (demoMode) {
      setShowDemoWarning(true);
      setTimeout(() => setShowDemoWarning(false), 5000);
      return;
    }
    
    // For now these are not implemented
    // setIntegrationStatus(platform, { connected: true, status: 'ok' });
  };

  const handleDisconnect = () => {
    if (demoMode) {
      setShowDemoWarning(true);
      setTimeout(() => setShowDemoWarning(false), 5000);
      return;
    }
    
    setIntegrationStatus(platform, { connected: false, status: 'pending' });
  };

  return (
    <div className={className}>
      <div className="flex gap-2">
        {integration?.connected ? (
          <>
            <Button 
              variant={variant} 
              size={size}
              disabled
            >
              Connected
            </Button>
            <Button 
              variant={variant} 
              size={size}
              onClick={handleDisconnect}
              disabled={demoMode}
            >
              Disconnect
            </Button>
          </>
        ) : (
          <Button 
            variant={variant} 
            size={size}
            onClick={handleConnect}
            disabled={demoMode}
          >
            {platform === 'instagram' ? 'Connect Instagram' : 'Connect TikTok'}
          </Button>
        )}
      </div>
      {showDemoWarning && (
        <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          <span>Platform connections are disabled in demo mode. Exit demo mode to connect real platforms.</span>
        </div>
      )}
      {!integration?.connected && !demoMode && (
        <div className="mt-2 text-xs text-secondary-dark">Coming Soon</div>
      )}
    </div>
  );
}
