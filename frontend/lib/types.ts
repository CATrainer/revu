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

export type InteractionStatus = 'Unread' | 'Needs Response' | 'Responded' | 'Archived';

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
}

export interface Review extends InteractionBase {
  kind: 'review';
  rating: 1 | 2 | 3 | 4 | 5;
  location?: string;
  ownerResponse?: {
    content: string;
    createdAt: string;
  };
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
}

export interface FiltersState {
  platforms: Platform[];
  sentiment: 'All' | Sentiment;
  status: InteractionStatus | 'All';
  search: string;
  dateRange: { from?: string; to?: string };
}

export type Theme = 'light' | 'dark' | 'system';
