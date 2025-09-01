import { api } from '@/lib/api';

export interface GenerateAIResponseRequest {
  comment_id: string;
  comment_text: string;
  channel_id: string; // UUID of youtube_connections
  video_id: string;   // UUID of our videos table
  video_title: string;
}

export interface GenerateAIResponse {
  response_text: string;
  alternatives?: string[];
  metadata?: Record<string, unknown>;
}

export async function generateYouTubeCommentResponse(payload: GenerateAIResponseRequest): Promise<GenerateAIResponse> {
  const { data } = await api.post<GenerateAIResponse>('/ai/generate-response', payload);
  return data;
}
