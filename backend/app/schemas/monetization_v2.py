"""Pydantic schemas for Monetization Engine V2."""

from datetime import datetime
from typing import Optional, List, Dict, Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field


# ==================== Decision Point Schemas ====================

class DecisionPointOption(BaseModel):
    """Option for a select-type decision point."""
    value: str
    label: str


class DecisionPoint(BaseModel):
    """A decision point that users configure when starting a project."""
    key: str  # e.g., "course_topic", "price_point"
    label: str  # e.g., "What will your course teach?"
    type: Literal["select", "number", "text", "boolean"]
    options: Optional[List[DecisionPointOption]] = None  # For select type
    default: Optional[Any] = None


# ==================== Action Plan Schemas ====================

class ActionTask(BaseModel):
    """A single task within an action phase."""
    id: str  # e.g., "1.1", "2.3"
    title: str
    description: str
    estimated_hours: Optional[float] = None
    depends_on_decisions: Optional[List[str]] = None  # Which decision_points affect this task


class ActionPhase(BaseModel):
    """A phase containing multiple tasks."""
    phase: int  # 1, 2, 3, etc.
    phase_name: str  # e.g., "Validation", "Content Creation"
    tasks: List[ActionTask]


# ==================== Template Schemas ====================

class SuitableFor(BaseModel):
    """Who this template is suitable for."""
    min_followers: int
    niches: List[str]
    platforms: List[str]


class RevenueRange(BaseModel):
    """Expected revenue range."""
    low: int
    high: int
    unit: str  # "per_month", "per_launch", "per_sale"


class TemplateBase(BaseModel):
    """Base template fields."""
    id: str
    category: str
    subcategory: str
    title: str
    description: str
    prerequisites: List[str]
    suitable_for: SuitableFor
    revenue_model: str
    expected_timeline: str
    expected_revenue_range: RevenueRange
    decision_points: List[DecisionPoint]
    action_plan: List[ActionPhase]


class TemplateListItem(BaseModel):
    """Simplified template for list view."""
    id: str
    category: str
    subcategory: str
    title: str
    description: str
    revenue_model: str
    expected_timeline: str
    expected_revenue_range: RevenueRange
    suitable_for: SuitableFor
    
    class Config:
        from_attributes = True


class TemplateDetail(TemplateBase):
    """Full template details."""
    is_active: bool = True
    display_order: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class TemplateListResponse(BaseModel):
    """Response for template list endpoint."""
    templates: List[TemplateListItem]
    total: int
    categories: Dict[str, int]  # Category counts


# ==================== Project Schemas ====================

class ProjectCreate(BaseModel):
    """Request to create a new project."""
    template_id: str
    title: Optional[str] = None  # If not provided, uses template title
    decision_values: Dict[str, Any] = Field(default_factory=dict)


class ProjectUpdate(BaseModel):
    """Request to update a project."""
    title: Optional[str] = None
    status: Optional[Literal["active", "paused", "completed", "abandoned"]] = None
    decision_values: Optional[Dict[str, Any]] = None


class PhaseProgress(BaseModel):
    """Progress for a single phase."""
    phase: int
    phase_name: str
    total: int
    done: int
    percentage: int


class TaskStatus(BaseModel):
    """Task status counts with phase breakdown."""
    todo: int
    in_progress: int
    done: int
    total: int
    percentage: int
    by_phase: Optional[List[PhaseProgress]] = None


class ProjectListItem(BaseModel):
    """Simplified project for list view."""
    id: UUID
    template_id: str
    title: str
    status: str
    progress: TaskStatus
    started_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ProjectDetail(BaseModel):
    """Full project details."""
    id: UUID
    user_id: UUID
    template_id: str
    title: str
    status: str
    customized_plan: Optional[List[ActionPhase]] = None
    decision_values: Dict[str, Any]
    ai_customization_notes: Optional[str] = None
    started_at: datetime
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    progress: TaskStatus
    template: Optional[TemplateListItem] = None
    
    class Config:
        from_attributes = True


class ProjectListResponse(BaseModel):
    """Response for project list endpoint."""
    projects: List[ProjectListItem]
    total: int


# ==================== Task Schemas ====================

class TaskBase(BaseModel):
    """Base task fields."""
    id: UUID
    project_id: UUID
    phase: int
    phase_name: str
    task_id: str
    title: str
    description: str
    status: Literal["todo", "in_progress", "done"]
    estimated_hours: Optional[float] = None
    sort_order: int
    depends_on_decisions: Optional[List[str]] = None
    completed_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class TaskUpdate(BaseModel):
    """Request to update a task."""
    status: Optional[Literal["todo", "in_progress", "done"]] = None
    notes: Optional[str] = None
    sort_order: Optional[int] = None


class TaskReorder(BaseModel):
    """Request to reorder tasks (for Kanban drag-and-drop)."""
    task_id: UUID
    new_status: Literal["todo", "in_progress", "done"]
    new_sort_order: int


class TasksByStatus(BaseModel):
    """Tasks grouped by status for Kanban view."""
    todo: List[TaskBase]
    in_progress: List[TaskBase]
    done: List[TaskBase]


# ==================== AI Recommendation Schemas ====================

class PersonalizedRevenueRange(BaseModel):
    """Personalized revenue estimate based on creator profile."""
    low: int
    high: int
    unit: str
    note: str  # e.g., "Based on your 50,000 followers and 4.2% engagement"


class CreatorProfileSummary(BaseModel):
    """Summary of creator profile used for recommendations."""
    total_followers: int
    platforms: List[str]
    primary_platform: str
    niche: str
    avg_engagement_rate: float
    posting_frequency: str
    existing_revenue_streams: List[str]


class AIRecommendation(BaseModel):
    """AI-recommended template with fit score."""
    template: TemplateListItem
    fit_score: float  # 0-100
    fit_reasons: List[str]
    personalized_description: Optional[str] = None
    personalized_revenue: Optional[PersonalizedRevenueRange] = None
    potential_challenges: List[str] = []
    estimated_monthly_revenue: Optional[int] = None  # Deprecated, use personalized_revenue
    personalized_tips: List[str] = []


class AIRecommendationsResponse(BaseModel):
    """Response for AI recommendations endpoint."""
    recommendations: List[AIRecommendation]
    creator_summary: str  # Brief text summary
    creator_profile: Optional[CreatorProfileSummary] = None  # Structured profile data
    generated_at: datetime


# ==================== AI Partner Schemas ====================

class AIPartnerMessage(BaseModel):
    """A message in the AI partner conversation."""
    role: Literal["user", "assistant"]
    content: str


class AIPartnerChatRequest(BaseModel):
    """Request to send a message to the AI partner."""
    project_id: UUID
    messages: List[AIPartnerMessage]


class ToolCallInfo(BaseModel):
    """Information about a tool call from the AI."""
    id: str
    name: str
    arguments: Dict[str, Any]


class AIPartnerChatResponse(BaseModel):
    """Response from the AI partner."""
    content: str
    tool_calls: List[ToolCallInfo] = []
    requires_confirmation: bool = False


class ExecuteToolRequest(BaseModel):
    """Request to execute a confirmed tool call."""
    project_id: UUID
    tool_name: str
    tool_arguments: Dict[str, Any]


class ExecuteToolResponse(BaseModel):
    """Response from executing a tool."""
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
