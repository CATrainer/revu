/**
 * Monetization Engine V2 API Client
 * 
 * API functions for the revamped monetization system.
 */

import { api } from './api';
import type {
  TemplateListResponse,
  TemplateDetail,
  ProjectListResponse,
  ProjectDetail,
  ProjectCreateRequest,
  ProjectUpdateRequest,
  TasksByStatus,
  Task,
  TaskUpdateRequest,
  TaskReorderRequest,
  AIRecommendationsResponse,
} from '@/types/monetization-v2';

const BASE_URL = '/monetization/v2';

// ==================== Templates ====================

export async function getTemplates(category?: string, subcategory?: string): Promise<TemplateListResponse> {
  const params = new URLSearchParams();
  if (category) params.append('category', category);
  if (subcategory) params.append('subcategory', subcategory);
  
  const url = params.toString() ? `${BASE_URL}/templates?${params}` : `${BASE_URL}/templates`;
  const response = await api.get<TemplateListResponse>(url);
  return response.data;
}

export async function getTemplate(templateId: string): Promise<TemplateDetail> {
  const response = await api.get<TemplateDetail>(`${BASE_URL}/templates/${templateId}`);
  return response.data;
}

export interface GetRecommendationsOptions {
  limit?: number;
  category?: string;
  useAI?: boolean;
}

export async function getAIRecommendations(options: GetRecommendationsOptions = {}): Promise<AIRecommendationsResponse> {
  const { limit = 5, category, useAI = false } = options;
  const params = new URLSearchParams();
  params.append('limit', limit.toString());
  if (category) params.append('category', category);
  if (useAI) params.append('use_ai', 'true');
  
  const response = await api.get<AIRecommendationsResponse>(`${BASE_URL}/templates/recommendations?${params}`);
  return response.data;
}

// ==================== Projects ====================

export async function getProjects(status?: string): Promise<ProjectListResponse> {
  const url = status ? `${BASE_URL}/projects?status=${status}` : `${BASE_URL}/projects`;
  const response = await api.get<ProjectListResponse>(url);
  return response.data;
}

export async function getProject(projectId: string): Promise<ProjectDetail> {
  const response = await api.get<ProjectDetail>(`${BASE_URL}/projects/${projectId}`);
  return response.data;
}

export async function createProject(data: ProjectCreateRequest): Promise<ProjectDetail> {
  const response = await api.post<ProjectDetail>(`${BASE_URL}/projects`, data);
  return response.data;
}

export async function updateProject(projectId: string, data: ProjectUpdateRequest): Promise<ProjectDetail> {
  const response = await api.patch<ProjectDetail>(`${BASE_URL}/projects/${projectId}`, data);
  return response.data;
}

export async function deleteProject(projectId: string): Promise<void> {
  await api.delete(`${BASE_URL}/projects/${projectId}`);
}

// ==================== Tasks ====================

export async function getProjectTasks(projectId: string): Promise<TasksByStatus> {
  const response = await api.get<TasksByStatus>(`${BASE_URL}/projects/${projectId}/tasks`);
  return response.data;
}

export async function updateTask(taskId: string, data: TaskUpdateRequest): Promise<Task> {
  const response = await api.patch<Task>(`${BASE_URL}/tasks/${taskId}`, data);
  return response.data;
}

export async function reorderTask(taskId: string, data: TaskReorderRequest): Promise<Task> {
  const response = await api.post<Task>(`${BASE_URL}/tasks/${taskId}/reorder`, data);
  return response.data;
}
