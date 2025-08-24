// Shared TypeScript interfaces for the Revu dashboard

export type Role = 'Owner' | 'Admin' | 'Manager' | 'Analyst' | 'Responder';

// Auth/access control
export type AccessStatus = 'waiting_list' | 'early_access' | 'full_access' | 'demo_access';
export type DemoAccessType = 'creator' | 'business' | 'agency_creators' | 'agency_businesses';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl?: string;
}

export type WorkspaceType = 'Individual' | 'Organization' | 'Agency';

export interface Workspace {
  id: string;
  name: string;
  type: WorkspaceType;
  clientsCount?: number; // for agency
  // Optional demo-only hint to tailor Agency dashboards
  agencyFlavor?: 'creators' | 'businesses' | 'mixed';
}

export type Platform = 'Google' | 'YouTube' | 'Instagram' | 'TikTok' | 'Facebook' | 'X/Twitter';

export type Sentiment = 'Positive' | 'Negative' | 'Neutral' | 'Mixed';

export type InteractionStatus = 'Unread' | 'Needs Response' | 'Responded' | 'Archived' | 'Reported';

export interface InteractionBase {
  id: string;
  platform: Platform;
  author: {
    id: string;
    name: string;
    avatarUrl?: string;
    followers?: number;
    verified?: boolean;
  };
  content: string;
  createdAt: string; // ISO
  sentiment: Sentiment;
  status: InteractionStatus;
  priority?: 'low' | 'medium' | 'high';
  replyCount?: number;
  workspaceId: string;
  // Demo-only optional fields used by UI actions
  assignedTo?: string;
  tags?: string[];
  // Optional reply fields usable in UI for both kinds (populated as appropriate)
  ourReply?: {
    content: string;
    createdAt: string;
    tone?: 'Professional' | 'Friendly' | 'Casual' | 'Empathetic';
  };
  ownerResponse?: {
    content: string;
    createdAt: string;
  };
  reportedReason?: string;
}

export interface Review extends InteractionBase {
  kind: 'review';
  rating: 1 | 2 | 3 | 4 | 5;
  location?: string;
}

export interface Comment extends InteractionBase {
  kind: 'comment';
  threadId?: string;
}

export type Interaction = Review | Comment;

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  severity?: 'info' | 'success' | 'warning' | 'error';
  createdAt: string;
  read?: boolean;
  href?: string; // optional link to navigate when clicked
}

export interface FiltersState {
  platforms: Platform[];
  sentiment: 'All' | Sentiment;
  status: InteractionStatus | 'All';
  search: string;
  dateRange: { from?: string; to?: string };
}

export type Theme = 'light' | 'dark' | 'system';

// Demo enhancements
export interface ReplyTemplate {
  id: string;
  name: string;
  content: string;
  tone?: 'Professional' | 'Friendly' | 'Casual' | 'Empathetic';
}

export interface SavedView {
  id: string;
  name: string;
  route: string; // e.g., '/reviews?status=Unread'
  createdAt: string;
}

export interface NoteItem {
  id: string;
  author: string;
  content: string;
  mentions?: string[]; // '@name'
  createdAt: string;
}

export interface GoalsState {
  avgRatingTarget?: number; // e.g., 4.6
  responseTimeTargetMins?: number; // e.g., 60
  reviewsPerMonthTarget?: number; // e.g., 120
}

export interface WhatIfState {
  responseTimeDeltaPct?: number; // -50..+50
  replyRateDeltaPct?: number; // -50..+50
}

export interface IntegrationConnection {
  id: 'google' | 'facebook' | 'instagram' | 'tiktok' | 'twitter' | 'tripadvisor';
  name: string;
  connected: boolean;
  status?: 'ok' | 'error' | 'pending';
}

// Notification preferences (demo)
export interface NotificationPrefs {
  muteKeywords: string[]; // case-insensitive contains match
  mutedPlatforms: Array<'google' | 'facebook' | 'instagram' | 'tiktok' | 'twitter' | 'tripadvisor'>;
  mode: 'All' | 'Important only';
}
