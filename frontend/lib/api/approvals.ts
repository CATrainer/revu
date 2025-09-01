import { api } from '@/lib/api';

export interface PendingApprovalItem {
  response_id: string;
  queue_id: string;
  response_text: string;
  passed_safety: boolean;
  safety_checked_at?: string;
  comment_id: string;
  channel_id: string;
  video_id: string;
  comment_text: string;
  created_at: string;
}

export async function fetchPendingApprovals(): Promise<PendingApprovalItem[]> {
  const { data } = await api.get<PendingApprovalItem[]>('/ai/pending-approvals');
  return data;
}

export async function approveResponse(responseId: string): Promise<void> {
  await api.post(`/ai/approve/${responseId}`);
}

export async function rejectResponse(responseId: string): Promise<void> {
  await api.post(`/ai/reject/${responseId}`);
}

export async function editResponse(responseId: string, response_text: string): Promise<void> {
  await api.put(`/ai/edit-response/${responseId}`, { response_text });
}
