/**
 * Monetization Engine V2 Types
 * 
 * TypeScript types for the revamped monetization system with
 * templates, projects, tasks, and AI recommendations.
 */

// ==================== Decision Points ====================

export interface DecisionPointOption {
  value: string;
  label: string;
}

export interface DecisionPoint {
  key: string;
  label: string;
  type: 'select' | 'number' | 'text' | 'boolean';
  options?: DecisionPointOption[];
  default?: string | number | boolean;
}

// ==================== Action Plan ====================

export interface ActionTask {
  id: string;
  title: string;
  description: string;
  estimated_hours?: number;
  depends_on_decisions?: string[];
}

export interface ActionPhase {
  phase: number;
  phase_name: string;
  tasks: ActionTask[];
}

// ==================== Templates ====================

export interface SuitableFor {
  min_followers: number;
  niches: string[];
  platforms: string[];
}

export interface RevenueRange {
  low: number;
  high: number;
  unit: 'per_month' | 'per_launch' | 'per_sale' | 'per_package' | 'per_cohort' | 'per_event' | 'per_deal' | 'per_audit' | 'per_project' | 'per_workshop' | 'per_episode' | 'per_issue' | 'per_license' | 'per_stream';
}

export interface TemplateListItem {
  id: string;
  category: string;
  subcategory: string;
  title: string;
  description: string;
  revenue_model: 'one-time' | 'recurring' | 'hybrid';
  expected_timeline: string;
  expected_revenue_range: RevenueRange;
  suitable_for: SuitableFor;
}

export interface TemplateDetail extends TemplateListItem {
  prerequisites: string[];
  decision_points: DecisionPoint[];
  action_plan: ActionPhase[];
  is_active: boolean;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface TemplateListResponse {
  templates: TemplateListItem[];
  total: number;
  categories: Record<string, number>;
}

// ==================== Projects ====================

export interface TaskStatus {
  todo: number;
  in_progress: number;
  done: number;
  total: number;
  percentage: number;
}

export interface ProjectListItem {
  id: string;
  template_id: string;
  title: string;
  status: 'active' | 'paused' | 'completed' | 'abandoned';
  progress: TaskStatus;
  started_at: string;
  updated_at: string;
}

export interface ProjectDetail {
  id: string;
  user_id: string;
  template_id: string;
  title: string;
  status: 'active' | 'paused' | 'completed' | 'abandoned';
  customized_plan?: ActionPhase[];
  decision_values: Record<string, string | number | boolean>;
  ai_customization_notes?: string;
  started_at: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  progress: TaskStatus;
  template?: TemplateListItem;
}

export interface ProjectListResponse {
  projects: ProjectListItem[];
  total: number;
}

export interface ProjectCreateRequest {
  template_id: string;
  title?: string;
  decision_values?: Record<string, string | number | boolean>;
}

export interface ProjectUpdateRequest {
  title?: string;
  status?: 'active' | 'paused' | 'completed' | 'abandoned';
  decision_values?: Record<string, string | number | boolean>;
}

// ==================== Tasks ====================

export interface Task {
  id: string;
  project_id: string;
  phase: number;
  phase_name: string;
  task_id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done';
  estimated_hours?: number;
  sort_order: number;
  depends_on_decisions?: string[];
  completed_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface TasksByStatus {
  todo: Task[];
  in_progress: Task[];
  done: Task[];
}

export interface TaskUpdateRequest {
  status?: 'todo' | 'in_progress' | 'done';
  notes?: string;
  sort_order?: number;
}

export interface TaskReorderRequest {
  task_id: string;
  new_status: 'todo' | 'in_progress' | 'done';
  new_sort_order: number;
}

// ==================== AI Recommendations ====================

export interface AIRecommendation {
  template: TemplateListItem;
  fit_score: number;
  fit_reasons: string[];
  potential_challenges: string[];
  estimated_monthly_revenue: number;
  personalized_tips: string[];
}

export interface AIRecommendationsResponse {
  recommendations: AIRecommendation[];
  creator_summary: string;
  generated_at: string;
}

// ==================== Category Metadata ====================

export const CATEGORY_INFO: Record<string, { label: string; icon: string; color: string }> = {
  digital_products: { label: 'Digital Products', icon: '📦', color: 'blue' },
  services: { label: 'Services', icon: '🎯', color: 'purple' },
  physical_products: { label: 'Physical Products', icon: '📦', color: 'orange' },
  partnerships: { label: 'Partnerships', icon: '🤝', color: 'green' },
  platform_features: { label: 'Platform Features', icon: '⚡', color: 'pink' },
};

export const SUBCATEGORY_INFO: Record<string, string> = {
  courses: 'Online Courses',
  ebooks: 'E-books & Guides',
  presets: 'Presets & Filters',
  templates: 'Templates',
  memberships: 'Memberships',
  newsletters: 'Newsletters',
  printables: 'Printables',
  audio: 'Audio Content',
  software: 'Software & Tools',
  coaching: 'Coaching',
  consulting: 'Consulting',
  services: 'Done-For-You',
  speaking: 'Speaking',
  workshops: 'Workshops',
  merchandise: 'Merchandise',
  subscriptions: 'Subscription Boxes',
  art: 'Art & Prints',
  planners: 'Planners & Journals',
  sponsorships: 'Sponsorships',
  affiliate: 'Affiliate Marketing',
  ambassadorships: 'Brand Ambassador',
  licensing: 'Content Licensing',
  referrals: 'Referral Programs',
  ugc: 'UGC Creation',
  live: 'Live Streaming',
  ads: 'Ad Revenue',
  tips: 'Tips & Donations',
  monetization: 'Platform Monetization',
};
