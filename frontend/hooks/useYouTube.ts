import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  initiateYouTubeConnection,
  checkConnectionStatus,
  fetchVideos,
  searchVideos,
  fetchComments,
  postCommentReply,
  setCommentHeart,
  setCommentLike,
  triggerSync,
  disconnectYouTube,
  deleteComment,
} from '@/lib/api/youtube';
import type { YouTubeVideo, YouTubeComment, SyncStatus, YouTubeConnection } from '@/types/youtube';
import { listConnections } from '@/lib/api/youtube';
import { generateYouTubeCommentResponse } from '@/lib/api/ai';

// Keys
const keys = {
  connection: (connectionId: string) => ['yt', 'connection', connectionId] as const,
  connections: ['yt', 'connections'] as const,
  videos: (connectionId: string, params: { limit?: number; offset?: number; newestFirst?: boolean; publishedAfter?: string | undefined; search?: string | undefined; tags?: string[] }) =>
    ['yt', 'videos', connectionId, params] as const,
  comments: (connectionId: string, videoId: string, params: { limit?: number; offset?: number; newestFirst?: boolean }) =>
    ['yt', 'comments', connectionId, videoId, params] as const,
  channelComments: (connectionId: string, params: { limit?: number; offset?: number; newestFirst?: boolean; parentsOnly?: boolean }) =>
    ['yt', 'comments', 'channel', connectionId, params] as const,
  search: (connectionId: string, query: string, params: { limit?: number; offset?: number }) =>
    ['yt', 'search', connectionId, query, params] as const,
  ai: (commentId: string) => ['ai', 'yt-comment', commentId] as const,
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

// 2a) Video search hook for comments page
export function useVideoSearch(args: { connectionId: string | undefined; query: string; tags?: string[]; limit?: number; offset?: number }) {
  const { connectionId, query, tags = [], limit = 20, offset = 0 } = args;
  const enabled = Boolean(connectionId && query.trim().length > 0);
  const params = useMemo(() => ({ limit, offset, tags }), [limit, offset, tags]);
  return useQuery<YouTubeVideo[]>({
    queryKey: keys.search(connectionId || 'none', query, params),
  queryFn: () => searchVideos({ connectionId: connectionId!, query, tags, limit, offset }),
    enabled,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

// AI: generate response for a specific comment
export function useGenerateAIResponse() {
  return useMutation({
    mutationFn: generateYouTubeCommentResponse,
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
  tags?: string[];
}) {
  const { connectionId, limit = 50, offset = 0, newestFirst = true, publishedAfter, search, tags = [] } = args;
  const enabled = Boolean(connectionId);
  const params = useMemo(() => ({ limit, offset, newestFirst, publishedAfter, search, tags }), [limit, offset, newestFirst, publishedAfter, search, tags]);
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
        tags,
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

// 3a) Channel-wide comments feed
export function useChannelComments(args: {
  connectionId: string | undefined;
  limit?: number;
  offset?: number;
  newestFirst?: boolean;
  parentsOnly?: boolean;
}) {
  const { connectionId, limit = 50, offset = 0, newestFirst = true, parentsOnly = false } = args;
  const enabled = Boolean(connectionId);
  const params = useMemo(() => ({ limit, offset, newestFirst, parentsOnly }), [limit, offset, newestFirst, parentsOnly]);
  return useQuery<Array<YouTubeComment & { video: YouTubeVideo }>>({
    queryKey: keys.channelComments(connectionId || 'none', params),
    queryFn: () => import('@/lib/api/youtube').then(m => m.fetchChannelComments({ connectionId: connectionId!, limit, offset, newestFirst, parentsOnly })),
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

// 4c) Delete a comment
export function useDeleteComment(connectionId: string | undefined, videoId: string | undefined) {
  const qc = useQueryClient();
  // Build a stable key only when both IDs are available to satisfy TS
  const queryKey = keys.comments(connectionId ?? '', videoId ?? '', { limit: 50, offset: 0, newestFirst: true });
  return useMutation({
    mutationFn: async ({ commentId }: { commentId: string }) => {
      if (!connectionId) throw new Error('Missing connectionId');
      return deleteComment({ connectionId, commentId });
    },
    onMutate: async ({ commentId }) => {
      await qc.cancelQueries({ queryKey });
      const prev = (qc.getQueryData<YouTubeComment[]>(queryKey) || []) as YouTubeComment[];
      // Optimistically remove the comment and any replies under it
      const next = prev.filter(c => c.commentId !== commentId && c.parentCommentId !== commentId);
      qc.setQueryData(queryKey, next);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKey, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey }),
  });
}

// 4a) Heart/unheart a comment (local-only) with optimistic update
export function useToggleCommentHeart(connectionId: string | undefined, videoId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ commentId, value }: { commentId: string; value: boolean }) => {
      if (!connectionId) throw new Error('Missing connectionId');
      return setCommentHeart({ connectionId, commentId, value });
    },
    onMutate: async ({ commentId, value }) => {
      if (!connectionId || !videoId) return;
      const params = { limit: 50, offset: 0, newestFirst: true } as const;
      const queryKey = keys.comments(connectionId, videoId, params);
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData<YouTubeComment[]>(queryKey);
      if (prev) {
        qc.setQueryData(queryKey, prev.map(c => c.commentId === commentId ? { ...c, heartedByOwner: value } : c));
      }
      return { prev, queryKey } as { prev?: YouTubeComment[]; queryKey: readonly unknown[] };
    },
    onError: (_e, _vars, ctx) => {
      if (ctx && (ctx as { prev?: YouTubeComment[]; queryKey: readonly unknown[] }).prev) {
        const { prev, queryKey } = ctx as { prev?: YouTubeComment[]; queryKey: readonly unknown[] };
        if (prev) qc.setQueryData(queryKey, prev);
      }
    },
    onSettled: () => {
      if (!connectionId || !videoId) return;
      qc.invalidateQueries({ queryKey: keys.comments(connectionId, videoId, { limit: 50, offset: 0, newestFirst: true }) });
    },
  });
}

// 4b) Like/unlike a comment (local-only) with optimistic update
export function useToggleCommentLike(connectionId: string | undefined, videoId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ commentId, value }: { commentId: string; value: boolean }) => {
      if (!connectionId) throw new Error('Missing connectionId');
      return setCommentLike({ connectionId, commentId, value });
    },
    onMutate: async ({ commentId, value }) => {
      if (!connectionId || !videoId) return;
      const params = { limit: 50, offset: 0, newestFirst: true } as const;
      const queryKey = keys.comments(connectionId, videoId, params);
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData<YouTubeComment[]>(queryKey);
      if (prev) {
        qc.setQueryData(queryKey, prev.map(c => c.commentId === commentId ? { ...c, likedByOwner: value } : c));
      }
      return { prev, queryKey } as { prev?: YouTubeComment[]; queryKey: readonly unknown[] };
    },
    onError: (_e, _vars, ctx) => {
      if (ctx && (ctx as { prev?: YouTubeComment[]; queryKey: readonly unknown[] }).prev) {
        const { prev, queryKey } = ctx as { prev?: YouTubeComment[]; queryKey: readonly unknown[] };
        if (prev) qc.setQueryData(queryKey, prev);
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
  qc.invalidateQueries({ queryKey: keys.connections });
      qc.removeQueries({ queryKey: keys.videos(connectionId, { limit: 50, offset: 0, newestFirst: true, publishedAfter: undefined, search: undefined }) });
    },
  });
}
