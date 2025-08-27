"use client";

import { useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useYouTubeConnection, useTriggerYouTubeSync } from '@/hooks/useYouTube';

interface SyncStatusProps {
  connectionId: string;
  className?: string;
  // Optional WebSocket URL for realtime sync updates. If not provided, will try NEXT_PUBLIC_SYNC_WS_URL.
  // Example: wss://api.example.com/ws/youtube/sync
  wsUrl?: string;
}

export default function SyncStatus({ connectionId, className, wsUrl }: SyncStatusProps) {
  const { data: status, isLoading, isFetching, refetch } = useYouTubeConnection(connectionId);
  const syncMutation = useTriggerYouTubeSync(connectionId);
  const qc = useQueryClient();

  // Derive running state from last log status or a transient mutation
  const isRunning = useMemo(() => {
    const s = (status?.lastLog?.status || '').toLowerCase();
    return s === 'running' || s === 'in_progress' || s === 'queued' || syncMutation.isPending;
  }, [status?.lastLog?.status, syncMutation.isPending]);

  // Optional WebSocket subscription for real-time updates
  useEffect(() => {
    const baseWs = wsUrl || process.env.NEXT_PUBLIC_SYNC_WS_URL;
    if (!baseWs) return;

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      const url = new URL(baseWs);
      url.searchParams.set('connection_id', connectionId);
      if (token) url.searchParams.set('token', token);

      const socket = new WebSocket(url);

      socket.addEventListener('message', (evt: MessageEvent) => {
        try {
          const payload = JSON.parse(evt.data as string);
          // Minimal contract: invalidate on updates that match this connection
          if (
            payload &&
            (payload.type === 'youtube_sync_update' || payload.topic === 'youtube_sync') &&
            (payload.connection_id === connectionId || payload.connectionId === connectionId)
          ) {
            qc.invalidateQueries({ queryKey: ['yt', 'connection', connectionId] });
          }
        } catch {
          // ignore malformed
        }
      });

      socket.addEventListener('error', () => {
        // noop; fallback is polling
      });

      return () => {
        try {
          socket.close();
        } catch {
          // ignore
        }
      };
    } catch {
      // Invalid URL or other issue; ignore
      return;
    }
  }, [connectionId, qc, wsUrl]);

  const onManualSync = async () => {
    await syncMutation.mutateAsync({ scope: 'incremental' });
    // Trigger a refetch after manual sync request
    refetch();
  };

  const statusBadge = () => {
    const t = (status?.status || '').toLowerCase();
    if (isRunning) return <span className="inline-flex items-center gap-2 text-blue-600"><span className="h-2 w-2 rounded-full bg-blue-500" /> Syncing…</span>;
    if (t === 'active') return <span className="inline-flex items-center gap-2 text-green-600"><span className="h-2 w-2 rounded-full bg-green-500" /> Active</span>;
    if (t === 'error') return <span className="inline-flex items-center gap-2 text-red-600"><span className="h-2 w-2 rounded-full bg-red-500" /> Error</span>;
    return <span className="inline-flex items-center gap-2 text-muted-foreground"><span className="h-2 w-2 rounded-full bg-gray-400" /> {status?.status || 'Unknown'}</span>;
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <div className="text-sm">YouTube Sync Status</div>
          <div className="mt-1">{statusBadge()}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {isLoading ? (
              <span className="inline-flex items-center gap-2"><LoadingSpinner size="small" /> Loading…</span>
            ) : status?.lastSyncedAt ? (
              <>Last sync: {new Date(status.lastSyncedAt).toLocaleString()}</>
            ) : (
              <>No sync yet</>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={onManualSync} disabled={isRunning || syncMutation.isPending}>
            {syncMutation.isPending ? 'Starting…' : 'Sync now'}
          </Button>
          {isFetching && <LoadingSpinner size="small" />}
        </div>
      </div>
    </div>
  );
}
