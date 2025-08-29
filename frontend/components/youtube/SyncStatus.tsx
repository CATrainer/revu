"use client";

import { useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useYouTubeConnection, useTriggerYouTubeSync } from '@/hooks/useYouTube';

interface SyncStatusProps {
  connectionId: string;
  className?: string;
  // Optional WebSocket URL for realtime sync updates. If not provided, will try NEXT_PUBLIC_SYNC_WS_URL.
  // Example: wss://api.example.com/ws/youtube/sync
  wsUrl?: string;
}

export default function SyncStatus({ connectionId, className, wsUrl }: SyncStatusProps) {
  const { data: status, refetch } = useYouTubeConnection(connectionId);
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

  return (
    <div className={className}>
      <Button onClick={onManualSync} disabled={isRunning || syncMutation.isPending}>
        {syncMutation.isPending ? 'Starting…' : 'Sync now'}
      </Button>
    </div>
  );
}
