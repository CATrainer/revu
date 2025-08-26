// Shared TypeScript interfaces for the Revu dashboard

export type Role = 'Owner' | 'Admin' | 'Manager' | 'Analyst' | 'Responder';

// Auth/access control (revamped)
export type AccessStatus = 'waiting' | 'full';
export type UserKind = 'content' | 'business';
export type DemoAccessType = never;

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
  route: string; // e.g., '/comments?status=Unread'
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

// Workspace branding and settings (demo)
export interface BrandingSettings {
  logoUrl?: string;
  primaryColor?: string; // hex
  accentColor?: string; // hex
  headerText?: string;
  footerText?: string;
  useBrandingInExports?: boolean;
}

export interface WorkspaceSettings {
  name?: string;
  slug?: string;
  timezone?: string;
  domain?: string; // custom domain for white-label
}

export type RoleName = Role;
export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: RoleName;
  status?: 'active' | 'invited' | 'suspended';
}

export interface BillingInfo {
  plan: 'Free' | 'Starter' | 'Pro' | 'Enterprise';
  seats: number;
  status: 'active' | 'past_due' | 'trialing' | 'canceled';
}

export interface PaymentMethod {
  id: string;
  brand: 'visa' | 'mastercard' | 'amex' | 'other';
  last4: string;
  expMonth: number;
  expYear: number;
  default?: boolean;
}

export interface ApiToken {
  id: string;
  name: string;
  tokenPreview: string; // only show preview in UI
  createdAt: string;
}

export interface WebhookEndpoint {
  id: string;
  url: string;
  events: Array<'review.created' | 'review.updated' | 'comment.created' | 'alert.triggered'>;
  secretPreview: string;
  createdAt: string;
}

export interface AITrainingConfig {
  brandVoice?: string; // freeform text
  allowedTones: Array<'Professional' | 'Friendly' | 'Casual' | 'Empathetic'>;
  blockedWords: string[];
  escalationRule?: string; // description
}

// Alerts (demo)
export type AlertRuleType = 'negative_surge' | 'vip_mention' | 'low_rating' | 'keyword_match';

export interface AlertRule {
  id: string;
  name: string;
  type: AlertRuleType;
  // Optional params depending on type
  threshold?: number; // e.g., count or rating threshold
  keyword?: string;
  channels: { inapp: boolean; email: boolean; slack: boolean };
  enabled: boolean;
  createdAt: string;
}

export interface AlertEvent {
  id: string;
  ruleId: string;
  title: string;
  message: string;
  createdAt: string;
}

export interface AlertsSettings {
  slackWebhookUrl?: string; // demo only, not used to post
  emailRecipients?: string; // comma-separated
}

// Reports (demo-only)
export type ReportFrequency = 'Weekly' | 'Monthly' | 'One-off';

export interface ReportSchedule {
  id: string;
  name: string; // e.g., "Weekly Analytics Summary"
  frequency: ReportFrequency;
  // simple target for demo: which route to open when viewing this report
  route: string; // e.g., '/analytics?range=<auto>'
  createdAt: string; // ISO
}

export interface ReportEntry {
  id: string;
  title: string;
  route: string; // where to open to view this report
  createdAt: string; // generated time
}
