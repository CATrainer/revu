import { create, type StateCreator } from 'zustand';
import type { YouTubeVideo, YouTubeComment, SyncStatus } from '@/types/youtube';
import {
  initiateYouTubeConnection,
  checkConnectionStatus,
  fetchVideos as apiFetchVideos,
  fetchComments as apiFetchComments,
  postCommentReply as apiPostCommentReply,
  triggerSync as apiTriggerSync,
  disconnectYouTube as apiDisconnectYouTube,
} from '@/lib/api/youtube';

// Core state types
export interface ConnectionsSlice {
  connectionId: string | null;
  status: SyncStatus | null;
  connLoading: boolean;
  connError: string | null;
  // actions
  setConnectionId: (id: string | null) => void;
  refreshStatus: () => Promise<void>;
  initiateConnection: (scopes?: string) => Promise<{ redirect_url: string; state: string } | null>;
  disconnect: () => Promise<boolean>;
}

export interface VideosSlice {
  videos: YouTubeVideo[];
  videosLoading: boolean;
  videosError: string | null;
  page: number;
  pageSize: number;
  hasMore: boolean;
  // actions
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  fetchVideos: () => Promise<void>;
  nextPage: () => Promise<void>;
  prevPage: () => Promise<void>;
  resetVideos: () => void;
}

export interface CommentsSlice {
  videoId: string | null;
  comments: YouTubeComment[];
  commentsLoading: boolean;
  commentsError: string | null;
  commentsPage: number;
  commentsPageSize: number;
  commentsHasMore: boolean;
  // actions
  setVideo: (videoId: string | null) => void;
  setCommentsPage: (page: number) => void;
  setCommentsPageSize: (size: number) => void;
  fetchComments: () => Promise<void>;
  nextCommentsPage: () => Promise<void>;
  prevCommentsPage: () => Promise<void>;
  replyToComment: (commentId: string, text: string) => Promise<void>;
  resetComments: () => void;
}

export interface SyncSlice {
  syncRunning: boolean;
  syncError: string | null;
  progress: number | null; // optional progress percentage if available via WS later
  // actions
  triggerSync: (scope?: 'full' | 'incremental' | 'recent_comments', lastSync?: string) => Promise<void>;
  refreshSyncStatus: () => Promise<void>;
  setProgress: (pct: number | null) => void;
  resetSync: () => void;
}

export type YouTubeStore = ConnectionsSlice & VideosSlice & CommentsSlice & SyncSlice;

const createConnectionsSlice: StateCreator<YouTubeStore, [], [], ConnectionsSlice> = (set, get) => ({
  connectionId: null,
  status: null,
  connLoading: false,
  connError: null,

  setConnectionId: (id) => {
    set({ connectionId: id });
    // Reset dependent slices when connection changes
    get().resetVideos();
    get().resetComments();
    get().resetSync();
  },

  refreshStatus: async () => {
    const { connectionId } = get();
    if (!connectionId) return;
    set({ connLoading: true, connError: null });
    try {
      const status = await checkConnectionStatus({ connectionId });
      set({ status, connLoading: false });
    } catch (e: unknown) {
      set({ connLoading: false, connError: e instanceof Error ? e.message : 'Failed to load status' });
    }
  },

  initiateConnection: async (scopes?: string) => {
    set({ connLoading: true, connError: null });
    try {
      const res = await initiateYouTubeConnection({ scopes });
      set({ connLoading: false });
      return res;
    } catch (e: unknown) {
      set({ connLoading: false, connError: e instanceof Error ? e.message : 'Failed to initiate' });
      return null;
    }
  },

  disconnect: async () => {
    const { connectionId } = get();
    if (!connectionId) return false;
    set({ connLoading: true, connError: null });
    try {
      const res = await apiDisconnectYouTube({ connectionId });
      if (res?.deleted) {
        set({ connectionId: null, status: null, connLoading: false });
        get().resetVideos();
        get().resetComments();
        get().resetSync();
        return true;
      }
      set({ connLoading: false });
      return false;
    } catch (e: unknown) {
      set({ connLoading: false, connError: e instanceof Error ? e.message : 'Failed to disconnect' });
      return false;
    }
  },
});

const createVideosSlice: StateCreator<YouTubeStore, [], [], VideosSlice> = (set, get) => ({
  videos: [],
  videosLoading: false,
  videosError: null,
  page: 0,
  pageSize: 12,
  hasMore: false,

  setPage: (page) => set({ page }),
  setPageSize: (size) => set({ pageSize: size }),

  fetchVideos: async () => {
    const { connectionId, page, pageSize } = get();
    if (!connectionId) return;
    set({ videosLoading: true, videosError: null });
    try {
      const items = await apiFetchVideos({ connectionId, limit: pageSize, offset: page * pageSize, newestFirst: true });
      set({ videos: items, hasMore: items.length >= pageSize, videosLoading: false });
    } catch (e: unknown) {
      set({ videosLoading: false, videosError: e instanceof Error ? e.message : 'Failed to load videos' });
    }
  },

  nextPage: async () => {
    const { hasMore, page } = get();
    if (!hasMore) return;
    set({ page: page + 1 });
    await get().fetchVideos();
  },

  prevPage: async () => {
    const { page } = get();
    if (page === 0) return;
    set({ page: Math.max(0, page - 1) });
    await get().fetchVideos();
  },

  resetVideos: () => set({ videos: [], page: 0, hasMore: false, videosError: null, videosLoading: false }),
});

const createCommentsSlice: StateCreator<YouTubeStore, [], [], CommentsSlice> = (set, get) => ({
  videoId: null,
  comments: [],
  commentsLoading: false,
  commentsError: null,
  commentsPage: 0,
  commentsPageSize: 50,
  commentsHasMore: false,

  setVideo: (videoId) => {
    set({ videoId, commentsPage: 0 });
    get().fetchComments();
  },

  setCommentsPage: (page) => set({ commentsPage: page }),
  setCommentsPageSize: (size) => set({ commentsPageSize: size }),

  fetchComments: async () => {
    const { connectionId, videoId, commentsPage, commentsPageSize } = get();
    if (!connectionId || !videoId) return;
    set({ commentsLoading: true, commentsError: null });
    try {
      const items = await apiFetchComments({
        connectionId,
        videoId,
        limit: commentsPageSize,
        offset: commentsPage * commentsPageSize,
        newestFirst: true,
      });
      set({ comments: items, commentsHasMore: items.length >= commentsPageSize, commentsLoading: false });
    } catch (e: unknown) {
      set({ commentsLoading: false, commentsError: e instanceof Error ? e.message : 'Failed to load comments' });
    }
  },

  nextCommentsPage: async () => {
    const { commentsHasMore, commentsPage } = get();
    if (!commentsHasMore) return;
    set({ commentsPage: commentsPage + 1 });
    await get().fetchComments();
  },

  prevCommentsPage: async () => {
    const { commentsPage } = get();
    if (commentsPage === 0) return;
    set({ commentsPage: Math.max(0, commentsPage - 1) });
    await get().fetchComments();
  },

  replyToComment: async (commentId, text) => {
    const { connectionId, comments } = get();
    if (!connectionId) throw new Error('No connection');

    // Optimistic update
    const prev = comments;
    set({
      comments: comments.map((c) => (c.commentId === commentId ? { ...c, replyCount: (c.replyCount || 0) + 1 } : c)),
    });

    try {
      await apiPostCommentReply({ connectionId, commentId, text });
    } catch (e) {
      // revert
      set({ comments: prev });
      throw e;
    }
  },

  resetComments: () => set({
    videoId: null,
    comments: [],
    commentsPage: 0,
    commentsHasMore: false,
    commentsLoading: false,
    commentsError: null,
  }),
});

const createSyncSlice: StateCreator<YouTubeStore, [], [], SyncSlice> = (set, get) => ({
  syncRunning: false,
  syncError: null,
  progress: null,

  triggerSync: async (scope = 'incremental', lastSync) => {
    const { connectionId } = get();
    if (!connectionId) return;
    set({ syncRunning: true, syncError: null });
    try {
      await apiTriggerSync({ connectionId, scope, lastSync });
      await get().refreshSyncStatus();
    } catch (e: unknown) {
      set({ syncError: e instanceof Error ? e.message : 'Sync failed' });
    } finally {
      set({ syncRunning: false });
    }
  },

  refreshSyncStatus: async () => {
    const { connectionId } = get();
    if (!connectionId) return;
    try {
      const status = await checkConnectionStatus({ connectionId });
      set({ status });
    } catch (e: unknown) {
      set({ syncError: e instanceof Error ? e.message : 'Failed to refresh sync status' });
    }
  },

  setProgress: (pct) => set({ progress: pct }),

  resetSync: () => set({ syncRunning: false, syncError: null, progress: null }),
});

export const useYouTubeStore = create<YouTubeStore>()((set, get, api) => ({
  ...createConnectionsSlice(set, get, api),
  ...createVideosSlice(set, get, api),
  ...createCommentsSlice(set, get, api),
  ...createSyncSlice(set, get, api),
}));
