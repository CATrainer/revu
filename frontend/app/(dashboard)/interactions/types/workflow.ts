// System workflow types
export const SYSTEM_WORKFLOW_AUTO_MODERATOR = 'auto_moderator';
export const SYSTEM_WORKFLOW_AUTO_ARCHIVE = 'auto_archive';

export interface Workflow {
  id: string;
  name: string;
  status: 'active' | 'paused';
  priority: number;
  platforms: string[] | null;
  interaction_types: string[] | null;
  view_ids: string[] | null;
  ai_conditions: string[] | null;  // Multiple conditions with OR logic
  action_type: 'auto_respond' | 'generate_response' | 'moderate' | 'archive';
  action_config: {
    response_text?: string;
    tone?: string;
    ai_instructions?: string;
    // System workflow configs
    dm_action?: string;
    comment_action?: string;
    mention_action?: string;
    archive_locally?: boolean;
  };
  system_workflow_type?: 'auto_moderator' | 'auto_archive' | null;
  user_id: string;
  organization_id?: string | null;
  created_at: string;
  updated_at?: string | null;
}

// Helper to check if workflow is a system workflow
export function isSystemWorkflow(workflow: Workflow): boolean {
  return workflow.system_workflow_type != null;
}

// System workflow example conditions for UI hints
export const SYSTEM_WORKFLOW_EXAMPLES = {
  auto_moderator: [
    "Hateful or abusive messages",
    "Spam or promotional content",
    "Messages with profanity or inappropriate language",
    "Threatening or harassing messages",
  ],
  auto_archive: [
    "Generic thank you messages",
    "Single emoji responses",
    "Messages I don't need to respond to",
    "Simple acknowledgments like 'ok' or 'thanks'",
  ],
};

export interface View {
  id: string;
  name: string;
  icon?: string;
}
