// frontend/lib/api/workflows.ts

export type WorkflowStatus = 'active' | 'paused' | 'draft';
export type Platform = 'youtube' | 'instagram' | 'tiktok' | 'twitter';
export type InteractionType = 'dm' | 'comment' | 'mention';

export interface WorkflowTrigger { type?: 'sentiment'|'keyword'|'platform'|'mention_type'|'volume_spike'; value?: string }
export interface WorkflowCondition { field: string; op: 'is'|'is_not'|'contains'|'not_contains'; value: string }
export type WorkflowAction =
  | { type: 'tag'; config: Record<string, unknown> }
  | { type: 'assign'; config: Record<string, unknown> }
  | { type: 'notify'; config: Record<string, unknown> }
  | { type: 'template_reply'; config: Record<string, unknown> };

export interface WorkflowCreateBody {
  name: string;
  status?: WorkflowStatus;
  description?: string;
  trigger?: WorkflowTrigger | null;
  conditions?: WorkflowCondition[] | null;
  actions?: WorkflowAction[] | null;
}

export interface WorkflowOut extends WorkflowCreateBody { id: string; created_at: string; updated_at: string }

export interface ApprovalOut {
  id: string;
  workflow_id?: string | null;
  platform: Platform;
  interaction_type: InteractionType;
  author?: string | null;
  link_url?: string | null;
  user_message: string;
  proposed_response: string;
  edited_response?: string | null;
  status: 'pending'|'sent'|'rejected'|'saved';
  rejected_reason?: string | null;
  created_at: string;
  updated_at: string;
}

const base = (path: string) => `/api/v1/workflows${path}`;

async function http<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, { headers: { 'Content-Type': 'application/json' }, ...init });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(txt || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// Workflows
export async function createWorkflow(body: WorkflowCreateBody): Promise<WorkflowOut> {
  return http<WorkflowOut>(base('/workflows'), { method: 'POST', body: JSON.stringify(body) });
}

export async function listWorkflows(status_eq?: WorkflowStatus): Promise<WorkflowOut[]> {
  const qs = status_eq ? `?status_eq=${encodeURIComponent(status_eq)}` : '';
  return http<WorkflowOut[]>(base(`/workflows${qs}`));
}

export async function activateWorkflow(id: string): Promise<WorkflowOut> {
  return http<WorkflowOut>(base(`/workflows/${id}/activate`), { method: 'POST' });
}

export async function pauseWorkflow(id: string): Promise<WorkflowOut> {
  return http<WorkflowOut>(base(`/workflows/${id}/pause`), { method: 'POST' });
}

// Approvals
export async function listApprovals(status_eq: 'pending'|'sent'|'rejected'|'saved' = 'pending'): Promise<ApprovalOut[]> {
  return http<ApprovalOut[]>(base(`/workflows/approvals?status_eq=${status_eq}`));
}

export async function updateApproval(id: string, patch: Partial<Pick<ApprovalOut,'edited_response'|'status'|'rejected_reason'>>): Promise<ApprovalOut> {
  return http<ApprovalOut>(base(`/workflows/approvals/${id}`), { method: 'PATCH', body: JSON.stringify(patch) });
}

export async function sendApproval(id: string): Promise<ApprovalOut> {
  return http<ApprovalOut>(base(`/workflows/approvals/${id}/send`), { method: 'POST' });
}

export async function rejectApproval(id: string, reason?: string): Promise<ApprovalOut> {
  const url = reason ? base(`/workflows/approvals/${id}/reject?reason=${encodeURIComponent(reason)}`) : base(`/workflows/approvals/${id}/reject`);
  return http<ApprovalOut>(url, { method: 'POST' });
}

// Executions (optional usage for logs)
export interface WorkflowExecutionOut { id: string; workflow_id: string; status: 'completed'|'failed'|'skipped'; context?: any; result?: any; error?: string|null; created_at: string; updated_at: string }
export async function listExecutions(workflowId: string): Promise<WorkflowExecutionOut[]> {
  return http<WorkflowExecutionOut[]>(base(`/workflows/${workflowId}/executions`));
}
