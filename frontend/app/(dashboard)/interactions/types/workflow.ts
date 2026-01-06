export interface Workflow {
  id: string;
  name: string;
  status: 'active' | 'paused';
  priority: number;
  platforms: string[] | null;
  interaction_types: string[] | null;
  view_ids: string[] | null;
  ai_conditions: string[] | null;  // Multiple conditions with OR logic
  action_type: 'auto_respond' | 'generate_response';
  action_config: {
    response_text?: string;
    tone?: string;
    ai_instructions?: string;
  };
  user_id: string;
  organization_id?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface View {
  id: string;
  name: string;
  icon?: string;
}
