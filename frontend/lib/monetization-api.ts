/**
 * Monetization Engine API Client
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export interface ProfileData {
  primary_platform: 'youtube' | 'instagram' | 'tiktok' | 'twitch';
  follower_count: number;
  engagement_rate: number;
  niche: string;
  platform_url?: string;
  avg_content_views?: number;
  content_frequency?: number;
  time_available_hours_per_week?: number;
}

export interface CreatorProfile extends ProfileData {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface Decision {
  id: string;
  category: 'pricing' | 'platform' | 'structure' | 'timeline' | 'content';
  value: string;
  rationale?: string;
  confidence: 'high' | 'medium' | 'low';
  decided_at: string;
}

export interface TaskCompletion {
  id: string;
  task_id: string;
  task_title: string;
  completed_at: string;
  completed_via: 'manual' | 'ai_auto' | 'ai_confirmed';
  notes?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  detected_actions?: any[];
}

export interface ActiveProject {
  id: string;
  opportunity_id: string;
  opportunity_title: string;
  status: 'active' | 'completed' | 'abandoned';
  current_phase_index: number;
  overall_progress: number;
  planning_progress: number;
  execution_progress: number;
  timeline_progress?: number;
  started_at: string;
  target_launch_date?: string;
  last_activity_at: string;
  customized_plan: any[];
  decisions: Decision[];
  completed_tasks: TaskCompletion[];
  message_count: number;
}

export interface ProgressUpdate {
  overall_progress: number;
  planning_progress: number;
  execution_progress: number;
  timeline_progress?: number;
}

async function getAuthHeaders(): Promise<HeadersInit> {
  // Get token from your auth system
  const token = localStorage.getItem('access_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

export interface AutoDetectResult {
  data_source: 'demo' | 'youtube' | 'instagram' | null;
  is_demo: boolean;
  profile_data: Partial<ProfileData>;
  missing_fields: string[];
  can_auto_create: boolean;
}

export async function autoDetectProfile(): Promise<AutoDetectResult> {
  const response = await fetch(`${API_BASE}/monetization/profile/auto-detect`, {
    method: 'GET',
    headers: await getAuthHeaders()
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to auto-detect profile');
  }

  return response.json();
}

export async function createProfile(data: ProfileData): Promise<CreatorProfile> {
  const response = await fetch(`${API_BASE}/monetization/profile`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create profile');
  }

  return response.json();
}

export async function resetMonetizationProfile(): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE}/monetization/profile/reset`, {
    method: 'DELETE',
    headers: await getAuthHeaders()
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to reset profile');
  }

  return response.json();
}

export async function getProfile(): Promise<CreatorProfile | null> {
  const response = await fetch(`${API_BASE}/monetization/profile`, {
    headers: await getAuthHeaders()
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error('Failed to fetch profile');
  }

  return response.json();
}

export async function createProject(): Promise<{ project_id: string; redirect_url: string }> {
  const response = await fetch(`${API_BASE}/monetization/projects`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ opportunity_id: 'premium-community' })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create project');
  }

  return response.json();
}

export async function getAllProjects(status?: 'active' | 'completed' | 'abandoned'): Promise<{ projects: ActiveProject[]; total: number }> {
  const url = status
    ? `${API_BASE}/monetization/projects?status=${status}`
    : `${API_BASE}/monetization/projects`;

  const response = await fetch(url, {
    headers: await getAuthHeaders()
  });

  if (!response.ok) {
    throw new Error('Failed to fetch projects');
  }

  return response.json();
}

export async function getProjectById(projectId: string): Promise<ActiveProject | null> {
  const response = await fetch(`${API_BASE}/monetization/projects/${projectId}`, {
    headers: await getAuthHeaders()
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error('Failed to fetch project');
  }

  return response.json();
}

export async function getActiveProject(): Promise<ActiveProject | null> {
  const response = await fetch(`${API_BASE}/monetization/projects/active`, {
    headers: await getAuthHeaders()
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error('Failed to fetch project');
  }

  return response.json();
}

export async function deleteProject(projectId: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE}/monetization/projects/${projectId}`, {
    method: 'DELETE',
    headers: await getAuthHeaders()
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete project');
  }

  return response.json();
}

export async function getProjectMessages(
  projectId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ messages: ChatMessage[]; total: number; has_more: boolean }> {
  const response = await fetch(
    `${API_BASE}/monetization/projects/${projectId}/messages?limit=${limit}&offset=${offset}`,
    { headers: await getAuthHeaders() }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch messages');
  }

  return response.json();
}

export async function sendMessage(
  projectId: string,
  message: string
): Promise<ReadableStream<Uint8Array>> {
  const response = await fetch(
    `${API_BASE}/monetization/projects/${projectId}/messages`,
    {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ message })
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to send message');
  }

  if (!response.body) {
    throw new Error('No response body');
  }

  return response.body;
}

export async function toggleTask(
  projectId: string,
  taskId: string,
  completed: boolean,
  notes?: string
): Promise<{ success: boolean; progress: ProgressUpdate }> {
  const response = await fetch(
    `${API_BASE}/monetization/projects/${projectId}/tasks/${taskId}/toggle`,
    {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ completed, notes })
    }
  );

  if (!response.ok) {
    throw new Error('Failed to toggle task');
  }

  return response.json();
}

export async function updateProject(
  projectId: string,
  updates: {
    target_launch_date?: string;
    status?: 'active' | 'completed' | 'abandoned';
  }
): Promise<{ success: boolean }> {
  const response = await fetch(
    `${API_BASE}/monetization/projects/${projectId}`,
    {
      method: 'PATCH',
      headers: await getAuthHeaders(),
      body: JSON.stringify(updates)
    }
  );

  if (!response.ok) {
    throw new Error('Failed to update project');
  }

  return response.json();
}

/**
 * Parse SSE stream from sendMessage
 */
export async function* parseSSEStream(
  stream: ReadableStream<Uint8Array>
): AsyncGenerator<{
  type: 'content' | 'done' | 'error';
  delta?: string;
  actions?: any[];
  progress?: ProgressUpdate;
  message?: string;
}> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          try {
            const parsed = JSON.parse(data);
            yield parsed;
          } catch (e) {
            console.error('Failed to parse SSE data:', data);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
