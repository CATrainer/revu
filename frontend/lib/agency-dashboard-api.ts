import { api } from './api';

// ============================================
// TYPES - Pipeline & Deals
// ============================================

export type DealStage =
  | 'prospecting'
  | 'pitch_sent'
  | 'negotiating'
  | 'booked'
  | 'in_progress'
  | 'completed'
  | 'lost';

export type DealStatus = 'on_track' | 'action_needed' | 'blocked' | 'overdue';
export type DealPriority = 'high' | 'medium' | 'low' | 'none';

export interface Deal {
  id: string;
  agency_id: string;
  brand_name: string;
  brand_logo_url?: string;
  creator_ids: string[];
  creators: DealCreator[];
  value: number;
  currency: string;
  stage: DealStage;
  status: DealStatus;
  priority: DealPriority;
  target_posting_date?: string;
  campaign_type?: string;
  tags: string[];
  owner_id?: string;
  owner_name?: string;
  notes?: string;
  next_action?: string;
  days_in_stage: number;
  created_at: string;
  updated_at: string;
}

export interface DealCreator {
  id: string;
  name: string;
  handle: string;
  avatar_url?: string;
  platform: string;
}

export interface PipelineStats {
  total_value: number;
  avg_deal_size: number;
  deals_closing_this_month: number;
  deals_closing_this_month_value: number;
  win_rate_this_month: number;
  stagnant_deals: number;
  by_stage: Record<DealStage, { count: number; value: number }>;
}

// ============================================
// TYPES - Campaigns & Deliverables
// ============================================

export type CampaignStatus = 'scheduled' | 'in_progress' | 'posted' | 'completed' | 'archived';
export type DeliverableType =
  | 'brief_sent'
  | 'product_shipped'
  | 'script_draft'
  | 'brand_approval'
  | 'content_production'
  | 'content_posted'
  | 'performance_report';
export type DeliverableStatus = 'pending' | 'in_progress' | 'completed' | 'overdue';

export interface Campaign {
  id: string;
  deal_id: string;
  agency_id: string;
  brand_name: string;
  brand_logo_url?: string;
  creator_ids: string[];
  creators: DealCreator[];
  value: number;
  currency: string;
  status: CampaignStatus;
  priority: DealPriority;
  posting_date?: string;
  campaign_type?: string;
  tags: string[];
  owner_id?: string;
  owner_name?: string;
  deliverables: Deliverable[];
  deliverables_completed: number;
  deliverables_total: number;
  has_overdue: boolean;
  next_deliverable?: Deliverable;
  created_at: string;
  updated_at: string;
}

export interface Deliverable {
  id: string;
  campaign_id: string;
  type: DeliverableType;
  title: string;
  description?: string;
  owner_type: 'agency' | 'creator' | 'brand';
  owner_id?: string;
  owner_name?: string;
  due_date?: string;
  completed_at?: string;
  status: DeliverableStatus;
  files: DeliverableFile[];
  notes?: string;
  order: number;
  created_at: string;
}

export interface DeliverableFile {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploaded_at: string;
  uploaded_by: string;
}

// ============================================
// TYPES - Creators (Enhanced)
// ============================================

export type CreatorRelationshipStatus = 'active' | 'past' | 'potential';
export type CreatorAvailabilityStatus = 'available' | 'booked' | 'unavailable' | 'tentative';

export interface CreatorProfile {
  id: string;
  user_id: string;
  name: string;
  handle: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  platforms: CreatorPlatform[];
  niches: string[];
  avg_engagement_rate: number;
  standard_rate?: number;
  rate_currency: string;
  relationship_status: CreatorRelationshipStatus;
  total_campaigns: number;
  total_revenue: number;
  last_campaign_date?: string;
  on_time_delivery_rate: number;
  notes?: string;
  created_at: string;
}

export interface CreatorPlatform {
  platform: 'youtube' | 'instagram' | 'tiktok' | 'twitter' | 'twitch';
  handle: string;
  url?: string;
  followers: number;
  avg_views?: number;
  avg_engagement_rate?: number;
}

export interface CreatorAvailability {
  creator_id: string;
  date: string;
  status: CreatorAvailabilityStatus;
  campaign_id?: string;
  campaign_name?: string;
  brand_name?: string;
  notes?: string;
}

export interface CreatorGroup {
  id: string;
  name: string;
  description?: string;
  color: string;
  creator_ids: string[];
  creator_count: number;
  created_at: string;
}

// ============================================
// TYPES - Finance
// ============================================

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'partially_paid';
export type PaymentStatus = 'pending' | 'paid' | 'overdue';
export type PaymentTerms = '50_50' | 'net_30' | 'net_60' | '100_upfront' | 'on_completion' | 'milestone';

export interface Invoice {
  id: string;
  invoice_number: string;
  agency_id: string;
  deal_id?: string;
  campaign_id?: string;
  brand_name: string;
  brand_contact_email?: string;
  amount: number;
  currency: string;
  tax_rate?: number;
  tax_amount?: number;
  total_amount: number;
  status: InvoiceStatus;
  due_date: string;
  paid_date?: string;
  paid_amount?: number;
  line_items: InvoiceLineItem[];
  notes?: string;
  terms?: string;
  sent_at?: string;
  viewed_at?: string;
  created_at: string;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface CreatorPayout {
  id: string;
  agency_id: string;
  creator_id: string;
  creator_name: string;
  campaign_id: string;
  campaign_name: string;
  brand_name: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  due_date: string;
  paid_date?: string;
  payment_method?: string;
  transaction_reference?: string;
  notes?: string;
  created_at: string;
}

export interface FinancialStats {
  outstanding_receivables: number;
  overdue_receivables: number;
  overdue_count: number;
  oldest_overdue_days?: number;
  creator_payouts_due: number;
  creator_payouts_count: number;
  revenue_this_month: number;
  revenue_last_month: number;
  revenue_trend_percent: number;
}

// ============================================
// TYPES - Reports
// ============================================

export type ReportStatus = 'draft' | 'sent' | 'viewed' | 'downloaded' | 'archived';

export interface Report {
  id: string;
  agency_id: string;
  campaign_id: string;
  title: string;
  brand_name: string;
  creator_names: string[];
  campaign_date?: string;
  status: ReportStatus;
  generated_at: string;
  generated_by: string;
  sent_at?: string;
  sent_to?: string[];
  viewed_at?: string;
  downloaded_at?: string;
  pdf_url?: string;
  metrics?: ReportMetrics;
  created_at: string;
}

export interface ReportMetrics {
  impressions: number;
  impressions_goal?: number;
  engagement_rate: number;
  engagements: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  views?: number;
  cpm?: number;
  cpv?: number;
  cost_per_engagement?: number;
}

// ============================================
// TYPES - Dashboard Widgets
// ============================================

export interface ActionRequiredItem {
  id: string;
  type: 'deliverable' | 'invoice' | 'approval' | 'payment' | 'campaign';
  title: string;
  description: string;
  campaign_name?: string;
  creator_name?: string;
  urgency: 'overdue' | 'due_today' | 'due_this_week';
  days_overdue?: number;
  action_url: string;
  quick_action?: string;
}

export interface UpcomingDeadline {
  id: string;
  date: string;
  type: 'content_posting' | 'deliverable' | 'payment' | 'approval';
  title: string;
  campaign_name?: string;
  creator_name?: string;
  brand_name?: string;
  amount?: number;
  is_overdue: boolean;
}

export interface ActivityItem {
  id: string;
  type: 'deal_moved' | 'deliverable_uploaded' | 'invoice_paid' | 'report_generated' | 'content_posted' | 'creator_added' | 'comment_added';
  description: string;
  actor_name: string;
  actor_avatar?: string;
  timestamp: string;
  link_url?: string;
  metadata?: Record<string, unknown>;
}

export interface DashboardStats {
  total_active_campaigns: number;
  total_creators: number;
  revenue_this_month: number;
  pipeline_value: number;
  completion_rate: number;
}

// ============================================
// TYPES - Notifications
// ============================================

export type NotificationType =
  | 'deliverable_uploaded'
  | 'deliverable_due'
  | 'deliverable_overdue'
  | 'invoice_paid'
  | 'invoice_overdue'
  | 'deal_moved'
  | 'deal_stagnant'
  | 'mention'
  | 'comment'
  | 'performance_milestone'
  | 'system';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  description: string;
  link_url?: string;
  is_read: boolean;
  is_actioned: boolean;
  created_at: string;
  metadata?: Record<string, unknown>;
}

// ============================================
// TYPES - Search
// ============================================

export interface SearchResult {
  id: string;
  type: 'campaign' | 'creator' | 'brand' | 'invoice' | 'report' | 'deal';
  title: string;
  subtitle?: string;
  description?: string;
  avatar_url?: string;
  status?: string;
  metadata?: Record<string, unknown>;
}

export interface SearchResults {
  campaigns: SearchResult[];
  creators: SearchResult[];
  brands: SearchResult[];
  invoices: SearchResult[];
  reports: SearchResult[];
  deals: SearchResult[];
  total_count: number;
}

// ============================================
// API - Dashboard
// ============================================

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const response = await api.get('/agency/dashboard/stats');
    return response.data;
  },

  getActionRequired: async (): Promise<ActionRequiredItem[]> => {
    const response = await api.get('/agency/dashboard/action-required');
    return response.data;
  },

  getUpcomingDeadlines: async (days: number = 7): Promise<UpcomingDeadline[]> => {
    const response = await api.get('/agency/dashboard/deadlines', { params: { days } });
    return response.data;
  },

  getRecentActivity: async (limit: number = 20): Promise<ActivityItem[]> => {
    const response = await api.get('/agency/dashboard/activity', { params: { limit } });
    return response.data;
  },

  getFinancialOverview: async (): Promise<FinancialStats> => {
    const response = await api.get('/agency/dashboard/financial');
    return response.data;
  },

  getPipelineSummary: async (): Promise<PipelineStats> => {
    const response = await api.get('/agency/dashboard/pipeline');
    return response.data;
  },
};

// ============================================
// API - Pipeline & Deals
// ============================================

export const pipelineApi = {
  getDeals: async (params?: {
    stage?: DealStage;
    status?: DealStatus;
    creator_id?: string;
    brand_name?: string;
    min_value?: number;
    max_value?: number;
    search?: string;
  }): Promise<Deal[]> => {
    const response = await api.get('/agency/pipeline/deals', { params });
    return response.data;
  },

  getDeal: async (id: string): Promise<Deal> => {
    const response = await api.get(`/agency/pipeline/deals/${id}`);
    return response.data;
  },

  createDeal: async (data: Partial<Deal>): Promise<Deal> => {
    const response = await api.post('/agency/pipeline/deals', data);
    return response.data;
  },

  updateDeal: async (id: string, data: Partial<Deal>): Promise<Deal> => {
    const response = await api.patch(`/agency/pipeline/deals/${id}`, data);
    return response.data;
  },

  moveDeal: async (id: string, stage: DealStage): Promise<Deal> => {
    const response = await api.post(`/agency/pipeline/deals/${id}/move`, { stage });
    return response.data;
  },

  deleteDeal: async (id: string): Promise<void> => {
    await api.delete(`/agency/pipeline/deals/${id}`);
  },

  getStats: async (): Promise<PipelineStats> => {
    const response = await api.get('/agency/pipeline/stats');
    return response.data;
  },
};

// ============================================
// API - Campaigns
// ============================================

export const campaignApi = {
  getCampaigns: async (params?: {
    status?: CampaignStatus;
    creator_id?: string;
    brand_name?: string;
    has_overdue?: boolean;
    search?: string;
  }): Promise<Campaign[]> => {
    const response = await api.get('/agency/campaigns', { params });
    return response.data;
  },

  getCampaign: async (id: string): Promise<Campaign> => {
    const response = await api.get(`/agency/campaigns/${id}`);
    return response.data;
  },

  createCampaign: async (data: Partial<Campaign>): Promise<Campaign> => {
    const response = await api.post('/agency/campaigns', data);
    return response.data;
  },

  updateCampaign: async (id: string, data: Partial<Campaign>): Promise<Campaign> => {
    const response = await api.patch(`/agency/campaigns/${id}`, data);
    return response.data;
  },

  deleteCampaign: async (id: string): Promise<void> => {
    await api.delete(`/agency/campaigns/${id}`);
  },

  // Deliverables
  getDeliverables: async (campaignId: string): Promise<Deliverable[]> => {
    const response = await api.get(`/agency/campaigns/${campaignId}/deliverables`);
    return response.data;
  },

  createDeliverable: async (campaignId: string, data: Partial<Deliverable>): Promise<Deliverable> => {
    const response = await api.post(`/agency/campaigns/${campaignId}/deliverables`, data);
    return response.data;
  },

  updateDeliverable: async (campaignId: string, deliverableId: string, data: Partial<Deliverable>): Promise<Deliverable> => {
    const response = await api.patch(`/agency/campaigns/${campaignId}/deliverables/${deliverableId}`, data);
    return response.data;
  },

  completeDeliverable: async (campaignId: string, deliverableId: string): Promise<Deliverable> => {
    const response = await api.post(`/agency/campaigns/${campaignId}/deliverables/${deliverableId}/complete`);
    return response.data;
  },

  deleteDeliverable: async (campaignId: string, deliverableId: string): Promise<void> => {
    await api.delete(`/agency/campaigns/${campaignId}/deliverables/${deliverableId}`);
  },
};

// ============================================
// API - Creators (Enhanced)
// ============================================

export const creatorDirectoryApi = {
  getCreators: async (params?: {
    search?: string;
    platform?: string;
    niche?: string;
    min_followers?: number;
    max_rate?: number;
    relationship_status?: CreatorRelationshipStatus;
    available_only?: boolean;
    group_id?: string;
  }): Promise<CreatorProfile[]> => {
    const response = await api.get('/agency/creators/directory', { params });
    return response.data;
  },

  getCreator: async (id: string): Promise<CreatorProfile> => {
    const response = await api.get(`/agency/creators/directory/${id}`);
    return response.data;
  },

  updateCreator: async (id: string, data: Partial<CreatorProfile>): Promise<CreatorProfile> => {
    const response = await api.patch(`/agency/creators/directory/${id}`, data);
    return response.data;
  },

  // Availability
  getAvailability: async (params: {
    start_date: string;
    end_date: string;
    creator_ids?: string[];
  }): Promise<CreatorAvailability[]> => {
    const response = await api.get('/agency/creators/availability', { params });
    return response.data;
  },

  setAvailability: async (data: {
    creator_id: string;
    date: string;
    status: CreatorAvailabilityStatus;
    campaign_id?: string;
    notes?: string;
  }): Promise<CreatorAvailability> => {
    const response = await api.post('/agency/creators/availability', data);
    return response.data;
  },

  // Groups
  getGroups: async (): Promise<CreatorGroup[]> => {
    const response = await api.get('/agency/creators/groups');
    return response.data;
  },

  createGroup: async (data: Partial<CreatorGroup>): Promise<CreatorGroup> => {
    const response = await api.post('/agency/creators/groups', data);
    return response.data;
  },

  updateGroup: async (id: string, data: Partial<CreatorGroup>): Promise<CreatorGroup> => {
    const response = await api.patch(`/agency/creators/groups/${id}`, data);
    return response.data;
  },

  deleteGroup: async (id: string): Promise<void> => {
    await api.delete(`/agency/creators/groups/${id}`);
  },

  addToGroup: async (groupId: string, creatorIds: string[]): Promise<void> => {
    await api.post(`/agency/creators/groups/${groupId}/members`, { creator_ids: creatorIds });
  },

  removeFromGroup: async (groupId: string, creatorId: string): Promise<void> => {
    await api.delete(`/agency/creators/groups/${groupId}/members/${creatorId}`);
  },
};

// ============================================
// API - Finance
// ============================================

export const financeApi = {
  getStats: async (): Promise<FinancialStats> => {
    const response = await api.get('/agency/finance/stats');
    return response.data;
  },

  // Invoices
  getInvoices: async (params?: {
    status?: InvoiceStatus;
    brand_name?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<Invoice[]> => {
    const response = await api.get('/agency/finance/invoices', { params });
    return response.data;
  },

  getInvoice: async (id: string): Promise<Invoice> => {
    const response = await api.get(`/agency/finance/invoices/${id}`);
    return response.data;
  },

  createInvoice: async (data: Partial<Invoice>): Promise<Invoice> => {
    const response = await api.post('/agency/finance/invoices', data);
    return response.data;
  },

  updateInvoice: async (id: string, data: Partial<Invoice>): Promise<Invoice> => {
    const response = await api.patch(`/agency/finance/invoices/${id}`, data);
    return response.data;
  },

  sendInvoice: async (id: string, recipientEmail: string): Promise<Invoice> => {
    const response = await api.post(`/agency/finance/invoices/${id}/send`, { email: recipientEmail });
    return response.data;
  },

  markInvoicePaid: async (id: string, data: {
    paid_date: string;
    paid_amount: number;
    payment_method?: string;
    reference?: string;
  }): Promise<Invoice> => {
    const response = await api.post(`/agency/finance/invoices/${id}/mark-paid`, data);
    return response.data;
  },

  deleteInvoice: async (id: string): Promise<void> => {
    await api.delete(`/agency/finance/invoices/${id}`);
  },

  // Payouts
  getPayouts: async (params?: {
    status?: PaymentStatus;
    creator_id?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<CreatorPayout[]> => {
    const response = await api.get('/agency/finance/payouts', { params });
    return response.data;
  },

  markPayoutPaid: async (id: string, data: {
    paid_date: string;
    payment_method?: string;
    transaction_reference?: string;
  }): Promise<CreatorPayout> => {
    const response = await api.post(`/agency/finance/payouts/${id}/mark-paid`, data);
    return response.data;
  },
};

// ============================================
// API - Reports
// ============================================

export const reportApi = {
  getReports: async (params?: {
    status?: ReportStatus;
    brand_name?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<Report[]> => {
    const response = await api.get('/agency/reports', { params });
    return response.data;
  },

  getReport: async (id: string): Promise<Report> => {
    const response = await api.get(`/agency/reports/${id}`);
    return response.data;
  },

  generateReport: async (campaignId: string, options?: {
    template?: string;
    sections?: string[];
  }): Promise<Report> => {
    const response = await api.post('/agency/reports/generate', { campaign_id: campaignId, ...options });
    return response.data;
  },

  updateReport: async (id: string, data: Partial<Report>): Promise<Report> => {
    const response = await api.patch(`/agency/reports/${id}`, data);
    return response.data;
  },

  sendReport: async (id: string, data: {
    recipients: string[];
    subject?: string;
    message?: string;
  }): Promise<Report> => {
    const response = await api.post(`/agency/reports/${id}/send`, data);
    return response.data;
  },

  deleteReport: async (id: string): Promise<void> => {
    await api.delete(`/agency/reports/${id}`);
  },
};

// ============================================
// API - Notifications
// ============================================

export const notificationApi = {
  getNotifications: async (params?: {
    unread_only?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Notification[]> => {
    const response = await api.get('/agency/notifications', { params });
    return response.data;
  },

  getUnreadCount: async (): Promise<{ count: number }> => {
    const response = await api.get('/agency/notifications/unread-count');
    return response.data;
  },

  markAsRead: async (id: string): Promise<void> => {
    await api.post(`/agency/notifications/${id}/read`);
  },

  markAllAsRead: async (): Promise<void> => {
    await api.post('/agency/notifications/mark-all-read');
  },
};

// ============================================
// API - Search
// ============================================

export const searchApi = {
  search: async (query: string, options?: {
    types?: string[];
    limit?: number;
  }): Promise<SearchResults> => {
    const response = await api.get('/agency/search', {
      params: { q: query, ...options }
    });
    return response.data;
  },

  getRecentSearches: async (): Promise<string[]> => {
    const response = await api.get('/agency/search/recent');
    return response.data;
  },

  clearRecentSearches: async (): Promise<void> => {
    await api.delete('/agency/search/recent');
  },
};
