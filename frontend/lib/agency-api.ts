import { api } from './api';

// Types
export interface Agency {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  logo_url: string | null;
  website: string | null;
  description: string | null;
  settings: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgencyPublic {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  website: string | null;
}

export interface AgencyCreator {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  last_login_at: string | null;
}

export interface AgencyMember {
  id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  status: 'pending_invite' | 'pending_request' | 'active' | 'removed';
  user_email: string;
  user_full_name: string | null;
  joined_at: string | null;
}

export interface AgencyInvitation {
  id: string;
  email: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  expires_at: string;
  created_at: string;
}

export interface AgencyStats {
  creator_count: number;
  team_member_count: number;
  pending_invitations: number;
  pending_join_requests: number;
  total_reach: number;
  active_opportunities: number;
  // Aliases for frontend convenience
  total_creators?: number;
  team_members?: number;
}

export interface CreatorAgency {
  agency_id: string;
  agency_name: string;
  agency_slug: string;
  agency_logo_url: string | null;
  role: 'owner' | 'admin' | 'member';
  joined_at: string | null;
}

export interface PendingInvitation {
  id: string;
  agency_id: string;
  agency_name: string;
  agency_logo_url: string | null;
  invited_at: string;
  expires_at: string;
}

// Agency API (for agency users)
export const agencyApi = {
  // Get current agency
  getMyAgency: async (): Promise<Agency> => {
    const response = await api.get('/agency/me');
    return response.data;
  },

  // Update agency
  updateAgency: async (updates: Partial<Pick<Agency, 'name' | 'logo_url' | 'website' | 'description'>>): Promise<Agency> => {
    const response = await api.patch('/agency/me', updates);
    return response.data;
  },

  // Upload agency logo
  uploadLogo: async (file: File): Promise<{ logo_url: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/agency/me/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // Delete agency (owner only)
  deleteAgency: async (): Promise<void> => {
    await api.delete('/agency/me');
  },

  // Get agency stats
  getStats: async (): Promise<AgencyStats> => {
    const response = await api.get('/agency/stats');
    return response.data;
  },

  // Creator management
  getCreators: async (): Promise<AgencyCreator[]> => {
    const response = await api.get('/agency/creators');
    return response.data;
  },

  removeCreator: async (creatorId: string): Promise<void> => {
    await api.delete(`/agency/creators/${creatorId}`);
  },

  // Invitations
  inviteCreator: async (email: string): Promise<void> => {
    await api.post('/agency/invitations', { email, role: 'member' });
  },

  getInvitations: async (status?: string): Promise<AgencyInvitation[]> => {
    const params = status ? { status } : {};
    const response = await api.get('/agency/invitations', { params });
    return response.data;
  },

  cancelInvitation: async (invitationId: string): Promise<void> => {
    await api.delete(`/agency/invitations/${invitationId}`);
  },

  // Join requests
  getJoinRequests: async (): Promise<AgencyMember[]> => {
    const response = await api.get('/agency/join-requests');
    return response.data;
  },

  acceptJoinRequest: async (requestId: string): Promise<void> => {
    await api.post(`/agency/join-requests/${requestId}/accept`);
  },

  rejectJoinRequest: async (requestId: string): Promise<void> => {
    await api.post(`/agency/join-requests/${requestId}/reject`);
  },

  // Team management
  getTeamMembers: async (): Promise<AgencyMember[]> => {
    const response = await api.get('/agency/team');
    return response.data;
  },

  inviteTeamMember: async (email: string, role: 'admin' | 'member'): Promise<void> => {
    await api.post('/agency/team/invite', { email, role });
  },

  updateTeamMemberRole: async (memberId: string, role: 'admin' | 'member'): Promise<void> => {
    await api.patch(`/agency/team/${memberId}/role`, { role });
  },

  removeTeamMember: async (memberId: string): Promise<void> => {
    await api.delete(`/agency/team/${memberId}`);
  },

  // Search agencies
  searchAgencies: async (query: string, limit = 10): Promise<AgencyPublic[]> => {
    const response = await api.get('/agency/search', { params: { q: query, limit } });
    return response.data;
  },
};

// Creator Agency API (for creator users)
export const creatorAgencyApi = {
  // Get creator's current agency
  getMyAgency: async (): Promise<CreatorAgency | null> => {
    const response = await api.get('/creator/agency/current');
    return response.data;
  },

  // Leave agency
  leaveAgency: async (): Promise<void> => {
    await api.delete('/creator/agency/leave');
  },

  // Get pending invitations
  getInvitations: async (): Promise<PendingInvitation[]> => {
    const response = await api.get('/creator/agency/invitations');
    return response.data;
  },

  // Accept invitation
  acceptInvitation: async (invitationId: string): Promise<{ status: string; agency_id: string }> => {
    const response = await api.post(`/creator/agency/invitations/${invitationId}/accept`);
    return response.data;
  },

  // Decline invitation
  declineInvitation: async (invitationId: string): Promise<void> => {
    await api.post(`/creator/agency/invitations/${invitationId}/decline`);
  },

  // Get pending join requests
  getJoinRequests: async (): Promise<Array<{
    id: string;
    agency_id: string;
    agency_name: string;
    agency_logo_url: string | null;
    requested_at: string;
  }>> => {
    const response = await api.get('/creator/agency/join-requests');
    return response.data;
  },

  // Request to join agency
  requestToJoin: async (agencyId: string, message?: string): Promise<{ message: string }> => {
    const response = await api.post(`/creator/agency/join/${agencyId}`, { message });
    return response.data;
  },

  // Cancel join request
  cancelJoinRequest: async (requestId: string): Promise<void> => {
    await api.delete(`/creator/agency/join-requests/${requestId}`);
  },

  // Search agencies
  searchAgencies: async (query: string, limit = 10): Promise<AgencyPublic[]> => {
    const response = await api.get('/creator/agency/search', { params: { q: query, limit } });
    return response.data;
  },
};

// Opportunity Types
export type OpportunityStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined' | 'completed' | 'cancelled';

export interface OpportunityRequirements {
  deliverables: string[];
  content_guidelines?: string;
  talking_points: string[];
  restrictions: string[];
}

export interface OpportunityCompensation {
  type: 'flat_fee' | 'cpm' | 'hybrid' | 'product_only';
  amount?: number;
  currency: string;
  payment_terms?: string;
  product_value?: number;
  notes?: string;
}

export interface AgencyOpportunity {
  id: string;
  agency_id: string;
  creator_id: string;
  created_by: string;
  title: string;
  brand_name: string;
  brand_logo_url: string | null;
  description: string;
  requirements: OpportunityRequirements;
  compensation: OpportunityCompensation;
  deadline: string | null;
  content_deadline: string | null;
  status: OpportunityStatus;
  sent_at: string | null;
  viewed_at: string | null;
  creator_response_at: string | null;
  creator_notes: string | null;
  project_id: string | null;
  created_at: string;
  updated_at: string;
  creator_email?: string;
  creator_full_name?: string;
}

export interface AgencyOpportunityListItem {
  id: string;
  creator_id: string;
  title: string;
  brand_name: string;
  status: OpportunityStatus;
  deadline: string | null;
  sent_at: string | null;
  creator_full_name: string | null;
  created_at: string;
}

export interface CreateOpportunityData {
  creator_id: string;
  title: string;
  brand_name: string;
  brand_logo_url?: string;
  description: string;
  requirements?: Partial<OpportunityRequirements>;
  compensation?: Partial<OpportunityCompensation>;
  deadline?: string;
  content_deadline?: string;
}

export interface OpportunityStats {
  total: number;
  draft: number;
  pending: number;
  accepted: number;
  declined: number;
  completed: number;
  active: number;
}

// Opportunity API (for agency users)
export const opportunityApi = {
  // List opportunities
  list: async (params?: {
    status?: OpportunityStatus;
    creator_id?: string;
    limit?: number;
    offset?: number;
  }): Promise<AgencyOpportunityListItem[]> => {
    const response = await api.get('/agency/opportunities', { params });
    return response.data;
  },

  // Get single opportunity
  get: async (id: string): Promise<AgencyOpportunity> => {
    const response = await api.get(`/agency/opportunities/${id}`);
    return response.data;
  },

  // Create opportunity
  create: async (data: CreateOpportunityData): Promise<AgencyOpportunity> => {
    const response = await api.post('/agency/opportunities', data);
    return response.data;
  },

  // Update opportunity
  update: async (id: string, data: Partial<CreateOpportunityData>): Promise<AgencyOpportunity> => {
    const response = await api.patch(`/agency/opportunities/${id}`, data);
    return response.data;
  },

  // Delete draft opportunity
  delete: async (id: string): Promise<void> => {
    await api.delete(`/agency/opportunities/${id}`);
  },

  // Send opportunity to creator
  send: async (id: string): Promise<AgencyOpportunity> => {
    const response = await api.post(`/agency/opportunities/${id}/send`);
    return response.data;
  },

  // Cancel opportunity
  cancel: async (id: string): Promise<AgencyOpportunity> => {
    const response = await api.post(`/agency/opportunities/${id}/cancel`);
    return response.data;
  },

  // Mark as completed
  complete: async (id: string): Promise<AgencyOpportunity> => {
    const response = await api.post(`/agency/opportunities/${id}/complete`);
    return response.data;
  },

  // Get stats
  getStats: async (): Promise<OpportunityStats> => {
    const response = await api.get('/agency/opportunities/stats');
    return response.data;
  },
};

// Creator Opportunity Types
export interface CreatorOpportunity {
  id: string;
  agency_id: string;
  agency_name: string;
  agency_logo_url: string | null;
  title: string;
  brand_name: string;
  brand_logo_url: string | null;
  description: string;
  requirements: OpportunityRequirements;
  compensation: OpportunityCompensation;
  deadline: string | null;
  content_deadline: string | null;
  status: OpportunityStatus;
  sent_at: string | null;
  viewed_at: string | null;
  project_id: string | null;
  created_at: string;
}

export interface CreatorOpportunityListItem {
  id: string;
  agency_name: string;
  title: string;
  brand_name: string;
  status: OpportunityStatus;
  deadline: string | null;
  sent_at: string | null;
}

export interface CreatorOpportunityCounts {
  pending: number;
  accepted: number;
  declined: number;
  completed: number;
  total: number;
}

// Creator Opportunity API (for creator users)
export const creatorOpportunityApi = {
  // List all opportunities for creator
  list: async (params?: {
    status?: OpportunityStatus;
    limit?: number;
    offset?: number;
  }): Promise<CreatorOpportunityListItem[]> => {
    const response = await api.get('/creator/opportunities', { params });
    return response.data;
  },

  // List pending opportunities
  listPending: async (): Promise<CreatorOpportunityListItem[]> => {
    const response = await api.get('/creator/opportunities/pending');
    return response.data;
  },

  // Get opportunity counts
  getCounts: async (): Promise<CreatorOpportunityCounts> => {
    const response = await api.get('/creator/opportunities/count');
    return response.data;
  },

  // Get single opportunity
  get: async (id: string): Promise<CreatorOpportunity> => {
    const response = await api.get(`/creator/opportunities/${id}`);
    return response.data;
  },

  // Accept opportunity
  accept: async (id: string, notes?: string): Promise<{ message: string; project_id: string | null }> => {
    const response = await api.post(`/creator/opportunities/${id}/accept`, notes ? { notes } : {});
    return response.data;
  },

  // Decline opportunity
  decline: async (id: string, reason?: string): Promise<{ message: string }> => {
    const response = await api.post(`/creator/opportunities/${id}/decline`, reason ? { reason } : {});
    return response.data;
  },
};
