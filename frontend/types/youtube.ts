// Shared YouTube types for the frontend

export interface YouTubeConnection {
  id: string;
  userId?: string;
  channelId?: string | null;
  channelName?: string | null;
  connectionStatus: 'active' | 'inactive' | 'error' | string;
  lastSyncedAt?: string | null; // ISO string
}

export interface YouTubeVideo {
  id: string; // internal UUID
  videoId: string; // YouTube video id
  title?: string | null;
  description?: string | null;
  thumbnailUrl?: string | null;
  publishedAt?: string | null; // ISO
  viewCount?: number | null;
  likeCount?: number | null;
  commentCount?: number | null;
  duration?: string | null; // ISO 8601 duration
}

export interface YouTubeComment {
  id: string; // internal UUID
  commentId: string; // YouTube comment id
  authorName?: string | null;
  authorChannelId?: string | null;
  content?: string | null;
  publishedAt?: string | null; // ISO
  likeCount?: number | null;
  replyCount?: number | null;
  parentCommentId?: string | null;
  isChannelOwnerComment: boolean;
}

export interface SyncLogItem {
  id: string;
  syncType?: string | null;
  startedAt?: string | null; // ISO
  completedAt?: string | null; // ISO
  status?: string | null;
  videosSynced?: number | null;
  commentsSynced?: number | null;
  errorMessage?: string | null;
}

export interface SyncStatus {
  connectionId: string;
  status: string;
  lastSyncedAt?: string | null; // ISO
  lastLog?: SyncLogItem | null;
}

export interface CommentReply {
  parentCommentId: string;
  text: string;
}

export interface PaginationParams {
  limit?: number; // default 50
  offset?: number; // default 0
  newestFirst?: boolean; // default true
}

export interface ApiError {
  code: string;
  message: string;
  detail?: unknown;
}

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: ApiError };
