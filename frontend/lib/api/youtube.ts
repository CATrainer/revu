import type {
  YouTubeVideo,
  YouTubeComment,
  SyncStatus,
  YouTubeConnection,
} from '@/types/youtube';

// Resolve API base URL with a production-first default.
const API_BASE = (() => {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (fromEnv) return fromEnv;
  return 'https://revu-backend-production.up.railway.app/api/v1';
})();

function authHeader(token?: string): HeadersInit {
  const t = token ?? (typeof window !== 'undefined' ? localStorage.getItem('access_token') ?? undefined : undefined);
  return t ? { Authorization: `Bearer ${t}` } : {};
}

function jsonHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json' };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = 'Request failed';
    try {
      const data = await res.json();
      message = (data?.detail as string) || (data?.message as string) || JSON.stringify(data);
    } catch {
      message = res.statusText || message;
    }
    throw new Error(`${res.status}: ${message}`);
  }
  // No content
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

type QueryValue = string | number | boolean | undefined | null;
function toQuery(params: Record<string, QueryValue>): string {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

// 1) Initiate OAuth flow
export async function initiateYouTubeConnection(options?: {
  scopes?: string; // space-separated scopes
  token?: string; // override auth token if needed
}): Promise<{ redirect_url: string; state: string }> {
  const qs = toQuery({ scopes: options?.scopes });
  const res = await fetch(`${API_BASE}/youtube/connect/initiate${qs}` , {
    method: 'GET',
    headers: {
      ...jsonHeaders(),
      ...authHeader(options?.token),
    },
    cache: 'no-store',
  });
  return handleResponse(res);
}

// 2) Check connection status
export async function checkConnectionStatus(args: {
  connectionId: string;
  token?: string;
}): Promise<SyncStatus> {
  const qs = toQuery({ connection_id: args.connectionId });
  const res = await fetch(`${API_BASE}/youtube/sync/status${qs}` , {
    method: 'GET',
    headers: {
      ...jsonHeaders(),
      ...authHeader(args.token),
    },
    cache: 'no-store',
  });
  return handleResponse(res);
}

// 3) Fetch videos
export async function fetchVideos(args: {
  connectionId: string;
  limit?: number;
  offset?: number;
  newestFirst?: boolean;
  publishedAfter?: string; // ISO
  search?: string;
  token?: string;
}): Promise<YouTubeVideo[]> {
  const qs = toQuery({
    connection_id: args.connectionId,
    limit: args.limit,
    offset: args.offset,
    newest_first: args.newestFirst,
    published_after: args.publishedAfter,
    search: args.search,
  });
  const res = await fetch(`${API_BASE}/youtube/videos${qs}`, {
    method: 'GET',
    headers: {
      ...jsonHeaders(),
      ...authHeader(args.token),
    },
    cache: 'no-store',
  });
  const raw = await handleResponse<Array<{
    id: string;
    video_id: string;
    title?: string | null;
    description?: string | null;
    thumbnail_url?: string | null;
    published_at?: string | null;
    view_count?: number | null;
    like_count?: number | null;
    comment_count?: number | null;
    duration?: string | null;
  }>>(res);
  // Map to frontend types (camelCase)
  return raw.map((v) => ({
    id: v.id,
    videoId: v.video_id,
    title: v.title ?? null,
    description: v.description ?? null,
    thumbnailUrl: v.thumbnail_url ?? null,
    publishedAt: v.published_at ?? null,
    viewCount: v.view_count ?? null,
    likeCount: v.like_count ?? null,
    commentCount: v.comment_count ?? null,
    duration: v.duration ?? null,
  }));
}

// Search videos by text (title/description)
export async function searchVideos(args: {
  connectionId: string;
  query: string;
  limit?: number;
  offset?: number;
  token?: string;
}): Promise<YouTubeVideo[]> {
  return fetchVideos({
    connectionId: args.connectionId,
    limit: args.limit ?? 20,
    offset: args.offset ?? 0,
    newestFirst: true,
    search: args.query,
    token: args.token,
  });
}

// 4) Fetch comments for a video
export async function fetchComments(args: {
  connectionId: string;
  videoId: string;
  limit?: number;
  offset?: number;
  newestFirst?: boolean;
  token?: string;
}): Promise<YouTubeComment[]> {
  const qs = toQuery({
    connection_id: args.connectionId,
    limit: args.limit,
    offset: args.offset,
    newest_first: args.newestFirst,
  });
  const res = await fetch(`${API_BASE}/youtube/videos/${encodeURIComponent(args.videoId)}/comments${qs}`, {
    method: 'GET',
    headers: {
      ...jsonHeaders(),
      ...authHeader(args.token),
    },
    cache: 'no-store',
  });
  return handleResponse(res);
}

// 5) Post a reply to a comment
export interface CommentReplyResponse {
  id?: string;
  commentId?: string;
  text?: string;
  [key: string]: unknown;
}

export async function postCommentReply(args: {
  connectionId: string;
  commentId: string;
  text: string;
  token?: string;
}): Promise<CommentReplyResponse> {
  const qs = toQuery({
    connection_id: args.connectionId,
    text: args.text,
  });
  const res = await fetch(`${API_BASE}/youtube/comments/${encodeURIComponent(args.commentId)}/reply${qs}`, {
    method: 'POST',
    headers: {
      ...jsonHeaders(),
      ...authHeader(args.token),
    },
  });
  return handleResponse(res);
}

// 6) Trigger a sync
export async function triggerSync(args: {
  connectionId: string;
  scope?: 'full' | 'incremental' | 'recent_comments';
  lastSync?: string; // ISO
  token?: string;
}): Promise<{ status: string; synced_videos?: number; synced_comments?: number }> {
  const body = {
    connection_id: args.connectionId,
    scope: args.scope ?? 'full',
    last_sync: args.lastSync,
  };
  const res = await fetch(`${API_BASE}/youtube/sync/trigger`, {
    method: 'POST',
    headers: {
      ...jsonHeaders(),
      ...authHeader(args.token),
    },
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

// 7) Disconnect YouTube connection
export async function disconnectYouTube(args: { connectionId: string; token?: string }): Promise<{ deleted: boolean }> {
  const res = await fetch(`${API_BASE}/youtube/connections/${encodeURIComponent(args.connectionId)}`, {
    method: 'DELETE',
    headers: {
      ...jsonHeaders(),
      ...authHeader(args.token),
    },
  });
  return handleResponse(res);
}

// 8) List user's YouTube connections
export async function listConnections(args?: { token?: string }): Promise<YouTubeConnection[]> {
  const res = await fetch(`${API_BASE}/youtube/connections`, {
    method: 'GET',
    headers: {
      ...jsonHeaders(),
      ...authHeader(args?.token),
    },
    cache: 'no-store',
  });
  // Backend returns snake_case keys; map to frontend type
  const raw = await handleResponse<Array<{ id: string; channel_id?: string | null; channel_name?: string | null; status: string; last_synced_at?: string | null }>>(res);
  return raw.map((c) => ({
    id: c.id,
    channelId: c.channel_id ?? null,
    channelName: c.channel_name ?? null,
    connectionStatus: c.status as YouTubeConnection['connectionStatus'],
    lastSyncedAt: c.last_synced_at ?? null,
  }));
}
