import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  initiateYouTubeConnection,
  checkConnectionStatus,
  fetchVideos,
  fetchComments,
  postCommentReply,
  triggerSync,
  disconnectYouTube,
} from '@/lib/api/youtube';
import type { YouTubeVideo, YouTubeComment, SyncStatus, YouTubeConnection } from '@/types/youtube';
import { listConnections } from '@/lib/api/youtube';

// Keys
const keys = {
  connection: (connectionId: string) => ['yt', 'connection', connectionId] as const,
  connections: ['yt', 'connections'] as const,
  videos: (connectionId: string, params: { limit?: number; offset?: number; newestFirst?: boolean; publishedAfter?: string | undefined; search?: string | undefined }) =>
    ['yt', 'videos', connectionId, params] as const,
  comments: (connectionId: string, videoId: string, params: { limit?: number; offset?: number; newestFirst?: boolean }) =>
    ['yt', 'comments', connectionId, videoId, params] as const,
};

// 1) Connection status hook
export function useYouTubeConnection(connectionId: string | undefined) {
  const enabled = Boolean(connectionId);
  return useQuery<SyncStatus>({
    queryKey: keys.connection(connectionId || 'none'),
    queryFn: () => checkConnectionStatus({ connectionId: connectionId! }),
    enabled,
    refetchInterval: enabled ? 30_000 : false,
  });
}

// 1a) List all user connections (to detect already-connected state)
export function useYouTubeConnections() {
  return useQuery<YouTubeConnection[]>({
    queryKey: keys.connections,
    queryFn: () => listConnections(),
    staleTime: 30_000,
  });
}

// 2) Videos hook with pagination
export function useVideos(args: {
  connectionId: string | undefined;
  limit?: number;
  offset?: number;
  newestFirst?: boolean;
  publishedAfter?: string;
  search?: string;
}) {
  const { connectionId, limit = 50, offset = 0, newestFirst = true, publishedAfter, search } = args;
  const enabled = Boolean(connectionId);
  const params = useMemo(() => ({ limit, offset, newestFirst, publishedAfter, search }), [limit, offset, newestFirst, publishedAfter, search]);
  return useQuery<YouTubeVideo[]>({
    queryKey: keys.videos(connectionId || 'none', params),
    queryFn: () =>
      fetchVideos({
        connectionId: connectionId!,
        limit,
        offset,
        newestFirst,
        publishedAfter,
        search,
      }),
  enabled,
  staleTime: 30_000,
  placeholderData: keepPreviousData,
  });
}

// 3) Comments hook with pagination
export function useComments(args: {
  connectionId: string | undefined;
  videoId: string | undefined;
  limit?: number;
  offset?: number;
  newestFirst?: boolean;
}) {
  const { connectionId, videoId, limit = 50, offset = 0, newestFirst = true } = args;
  const enabled = Boolean(connectionId && videoId);
  const params = useMemo(() => ({ limit, offset, newestFirst }), [limit, offset, newestFirst]);
  return useQuery<YouTubeComment[]>({
    queryKey: keys.comments(connectionId || 'none', videoId || 'none', params),
    queryFn: () =>
      fetchComments({
        connectionId: connectionId!,
        videoId: videoId!,
        limit,
        offset,
        newestFirst,
      }),
  enabled,
  staleTime: 15_000,
  placeholderData: keepPreviousData,
  });
}

// 4) Comment reply hook with optimistic update
export function useCommentReply(connectionId: string | undefined, videoId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ commentId, text }: { commentId: string; text: string }) => {
      if (!connectionId) throw new Error('Missing connectionId');
      return postCommentReply({ connectionId, commentId, text });
    },
    onMutate: async ({ commentId }) => {
      if (!connectionId || !videoId) return;
      const queryKey = keys.comments(connectionId, videoId, { limit: 50, offset: 0, newestFirst: true });
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData<YouTubeComment[]>(queryKey);
      // Optimistically increment reply count on the parent
      if (previous) {
        const next = previous.map((c) =>
          c.commentId === commentId
            ? { ...c, replyCount: (c.replyCount || 0) + 1 }
            : c
        );
        qc.setQueryData(queryKey, next);
      }
      return { previous, queryKey } as { previous?: YouTubeComment[]; queryKey: readonly unknown[] };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx && (ctx as { previous?: YouTubeComment[]; queryKey: readonly unknown[] }).previous) {
        const { previous, queryKey } = ctx as { previous?: YouTubeComment[]; queryKey: readonly unknown[] };
        if (previous) qc.setQueryData(queryKey, previous);
      }
    },
    onSettled: () => {
      if (!connectionId || !videoId) return;
      qc.invalidateQueries({ queryKey: keys.comments(connectionId, videoId, { limit: 50, offset: 0, newestFirst: true }) });
    },
  });
}

// Utility to kick off OAuth from UI (returns redirect_url and state)
export function useInitiateYouTubeConnection() {
  return useMutation({
    mutationFn: (scopes?: string) => initiateYouTubeConnection({ scopes }),
  });
}

// Utility to trigger sync manually
export function useTriggerYouTubeSync(connectionId: string | undefined) {
  return useMutation({
    mutationFn: (args?: { scope?: 'full' | 'incremental' | 'recent_comments'; lastSync?: string }) => {
      if (!connectionId) throw new Error('Missing connectionId');
      return triggerSync({ connectionId, scope: args?.scope, lastSync: args?.lastSync });
    },
  });
}

// Utility to disconnect the YouTube connection
export function useDisconnectYouTube(connectionId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!connectionId) throw new Error('Missing connectionId');
      return disconnectYouTube({ connectionId });
    },
    onSuccess: () => {
      if (!connectionId) return;
      qc.invalidateQueries({ queryKey: keys.connection(connectionId) });
      qc.removeQueries({ queryKey: keys.videos(connectionId, { limit: 50, offset: 0, newestFirst: true, publishedAfter: undefined, search: undefined }) });
    },
  });
}
