/**
 * API client for monetization discovery endpoints
 */

const API_BASE = '/api/v1';

// Types
export interface AnalysisStatus {
  analysis_id: string;
  status: 'analyzing' | 'generating' | 'complete' | 'error';
  progress: number;
  current_step?: string;
  error?: string;
}

export interface Opportunity {
  id: string;
  title: string;
  description: string;
  revenue_min: number;
  revenue_max: number;
  confidence_score: number;
  effort_level: 'low' | 'medium' | 'high';
  timeline_weeks: number;
  why_this_works: string[];
  key_advantages: string[];
  template_basis: string[];
  custom_elements: string[];
  implementation_plan: {
    phases: Array<{
      phase: string;
      timeline: string;
      steps: Array<{
        id: string;
        task: string;
        time_estimate: string;
        cost_estimate: number;
        details: string;
        why_this_matters?: string;
        success_criteria?: string;
        common_pitfalls?: string;
        pro_tips?: string;
        resources?: string[];
        decision_type?: string;
      }>;
    }>;
  };
}

export interface OpportunitiesResponse {
  opportunities: Opportunity[];
  generated_at: string;
}

export interface RefineResponse {
  opportunities: Opportunity[];
  message: string;
}

export interface SelectResponse {
  project_id: string;
  redirect_url: string;
}

export interface AdaptationResponse {
  adapted: boolean;
  modifications?: any[];
  user_message?: string;
  updated_progress?: number;
  message?: string;
}

class MonetizationAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public errorCode?: string
  ) {
    super(message);
    this.name = 'MonetizationAPIError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));

    // Handle specific error cases
    if (errorData.error === 'profile_required') {
      throw new MonetizationAPIError(
        errorData.message || 'Please complete your creator profile first',
        response.status,
        'profile_required'
      );
    }

    if (errorData.error === 'project_exists') {
      throw new MonetizationAPIError(
        errorData.message || 'You already have an active project',
        response.status,
        'project_exists'
      );
    }

    throw new MonetizationAPIError(
      errorData.message || `API error: ${response.status}`,
      response.status,
      errorData.error
    );
  }

  return response.json();
}

export const monetizationAPI = {
  /**
   * Start background analysis of creator's content
   */
  async startAnalysis(): Promise<{ analysis_id: string; status: string }> {
    const response = await fetch(`${API_BASE}/monetization/discover/analyze`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return handleResponse(response);
  },

  /**
   * Check status of ongoing analysis
   */
  async checkAnalysisStatus(analysisId: string): Promise<AnalysisStatus> {
    const response = await fetch(
      `${API_BASE}/monetization/discover/analyze/status/${analysisId}`,
      {
        credentials: 'include',
      }
    );

    return handleResponse(response);
  },

  /**
   * Get generated opportunities for user
   */
  async getOpportunities(): Promise<OpportunitiesResponse> {
    const response = await fetch(`${API_BASE}/monetization/discover/opportunities`, {
      credentials: 'include',
    });

    return handleResponse(response);
  },

  /**
   * Refine opportunities based on user feedback
   */
  async refineOpportunities(message: string): Promise<RefineResponse> {
    const response = await fetch(`${API_BASE}/monetization/discover/refine`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    });

    return handleResponse(response);
  },

  /**
   * Select an opportunity to work on
   */
  async selectOpportunity(opportunityId: string): Promise<SelectResponse> {
    const response = await fetch(`${API_BASE}/monetization/discover/select`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ opportunity_id: opportunityId }),
    });

    return handleResponse(response);
  },

  /**
   * Request plan adaptation during execution
   */
  async requestAdaptation(
    projectId: string,
    triggerType: 'user_request' | 'progress_signal' | 'market_feedback',
    triggerContent: string
  ): Promise<AdaptationResponse> {
    const response = await fetch(
      `${API_BASE}/monetization/discover/projects/${projectId}/adapt`,
      {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trigger_type: triggerType,
          trigger_content: triggerContent,
        }),
      }
    );

    return handleResponse(response);
  },
};

export { MonetizationAPIError };
