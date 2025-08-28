"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useYouTubeConnection, useYouTubeConnections, useInitiateYouTubeConnection } from '@/hooks/useYouTube';

interface ConnectButtonProps {
  connectionId?: string; // if present, we'll show status; otherwise we start connect flow
  className?: string;
}

export default function ConnectButton({ connectionId, className }: ConnectButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const { data: status, isLoading: statusLoading } = useYouTubeConnection(connectionId || '');
  const { data: connections, isLoading: connectionsLoading } = useYouTubeConnections();
  const init = useInitiateYouTubeConnection();

  const onConnect = async () => {
    setError(null);
    try {
      const res = await init.mutateAsync(undefined);
      if (res?.redirect_url) {
        window.location.href = res.redirect_url;
      } else {
        setError('Failed to get redirect URL');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to initiate connection');
    }
  };

  // Already connected UI
  if (connectionId && status && !statusLoading) {
    return (
      <div className={className}>
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-green-500" aria-hidden />
          <span className="text-sm">YouTube connected</span>
        </div>
        {status.lastSyncedAt && (
          <div className="mt-1 text-xs text-muted-foreground">Last synced: {new Date(status.lastSyncedAt).toLocaleString()}</div>
        )}
      </div>
    );
  }

  // If no explicit connectionId prop, but user already has a connection, show connected
  const existing = !connectionId && connections && connections.length > 0 ? connections[0] : null;
  if (existing && !connectionsLoading) {
    return (
      <div className={className}>
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-green-500" aria-hidden />
          <span className="text-sm">YouTube connected</span>
        </div>
        {existing.lastSyncedAt && (
          <div className="mt-1 text-xs text-muted-foreground">Last synced: {new Date(existing.lastSyncedAt).toLocaleString()}</div>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      <Button onClick={onConnect} disabled={init.isPending}>
        {init.isPending ? (
          <div className="flex items-center gap-2"><LoadingSpinner size="small" /><span>Connecting…</span></div>
        ) : (
          'Connect YouTube'
        )}
      </Button>
  {(statusLoading || connectionsLoading) && (
        <div className="mt-2 text-xs text-muted-foreground flex items-center gap-2"><LoadingSpinner size="small" /><span>Checking status…</span></div>
      )}
      {error && (
        <div className="mt-2 text-sm text-destructive">{error}</div>
      )}
    </div>
  );
}
