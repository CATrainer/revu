"""Pydantic schemas for agency dashboard APIs."""

from datetime import datetime
from decimal import Decimal
from typing import List, Optional, Dict, Any
from uuid import UUID
from enum import Enum

from pydantic import BaseModel, Field, ConfigDict


# ============================================
# Enums
# ============================================

class DealStage(str, Enum):
    PROSPECTING = "prospecting"
    PITCH_SENT = "pitch_sent"
    NEGOTIATING = "negotiating"
    BOOKED = "booked"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    LOST = "lost"


class DealStatus(str, Enum):
    ON_TRACK = "on_track"
    ACTION_NEEDED = "action_needed"
    BLOCKED = "blocked"
    OVERDUE = "overdue"


class DealPriority(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    NONE = "none"


class CampaignStatus(str, Enum):
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    POSTED = "posted"
    COMPLETED = "completed"
    ARCHIVED = "archived"
    CANCELLED = "cancelled"


class DeliverableType(str, Enum):
    BRIEF_SENT = "brief_sent"
    PRODUCT_SHIPPED = "product_shipped"
    SCRIPT_DRAFT = "script_draft"
    SCRIPT_APPROVED = "script_approved"
    BRAND_APPROVAL = "brand_approval"
    CONTENT_DRAFT = "content_draft"
    CONTENT_REVISION = "content_revision"
    FINAL_CONTENT = "final_content"
    CONTENT_POSTED = "content_posted"
    PERFORMANCE_REPORT = "performance_report"
    CUSTOM = "custom"


class DeliverableStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    SUBMITTED = "submitted"
    REVISION_REQUESTED = "revision_requested"
    APPROVED = "approved"
    COMPLETED = "completed"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"


class InvoiceStatus(str, Enum):
    DRAFT = "draft"
    SENT = "sent"
    VIEWED = "viewed"
    PAID = "paid"
    PARTIALLY_PAID = "partially_paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"


class PayoutStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    PROCESSING = "processing"
    PAID = "paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"
    FAILED = "failed"


class CreatorRelationshipStatus(str, Enum):
    ACTIVE = "active"
    PAST = "past"
    POTENTIAL = "potential"


class AvailabilityStatus(str, Enum):
    AVAILABLE = "available"
    BOOKED = "booked"
    TENTATIVE = "tentative"
    UNAVAILABLE = "unavailable"


class ReportStatus(str, Enum):
    DRAFT = "draft"
    GENERATED = "generated"
    SENT = "sent"
    VIEWED = "viewed"
    DOWNLOADED = "downloaded"
    ARCHIVED = "archived"


class TaskStatus(str, Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    BLOCKED = "blocked"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class TaskPriority(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


# ============================================
# Base Schemas
# ============================================

class CreatorSummary(BaseModel):
    """Minimal creator info for embedding in other responses."""
    id: UUID
    name: str
    handle: Optional[str] = None
    avatar_url: Optional[str] = None
    platform: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class DeliverableFile(BaseModel):
    """File attachment on a deliverable."""
    id: str
    name: str
    url: str
    type: str
    size: int
    uploaded_at: datetime
    uploaded_by: Optional[str] = None


class InvoiceLineItem(BaseModel):
    """Line item on an invoice."""
    id: str
    description: str
    quantity: float = 1
    rate: Decimal
    amount: Decimal


# ============================================
# Deal/Pipeline Schemas
# ============================================

class DealCreatorSchema(BaseModel):
    """Creator assignment in a deal."""
    id: UUID
    name: str
    handle: Optional[str] = None
    avatar_url: Optional[str] = None
    platform: Optional[str] = None
    proposed_rate: Optional[Decimal] = None

    model_config = ConfigDict(from_attributes=True)


class DealBase(BaseModel):
    """Base deal schema."""
    brand_name: str
    brand_logo_url: Optional[str] = None
    title: Optional[str] = None
    value: Decimal = Decimal("0")
    currency: str = "USD"
    stage: DealStage = DealStage.PROSPECTING
    status: DealStatus = DealStatus.ON_TRACK
    priority: DealPriority = DealPriority.MEDIUM
    target_posting_date: Optional[datetime] = None
    campaign_type: Optional[str] = None
    tags: List[str] = []
    notes: Optional[str] = None
    next_action: Optional[str] = None
    next_action_date: Optional[datetime] = None


class DealCreate(DealBase):
    """Create deal request."""
    creator_ids: List[UUID] = []
    owner_id: Optional[UUID] = None


class DealUpdate(BaseModel):
    """Update deal request."""
    brand_name: Optional[str] = None
    brand_logo_url: Optional[str] = None
    title: Optional[str] = None
    value: Optional[Decimal] = None
    currency: Optional[str] = None
    stage: Optional[DealStage] = None
    status: Optional[DealStatus] = None
    priority: Optional[DealPriority] = None
    target_posting_date: Optional[datetime] = None
    campaign_type: Optional[str] = None
    tags: Optional[List[str]] = None
    notes: Optional[str] = None
    next_action: Optional[str] = None
    next_action_date: Optional[datetime] = None
    creator_ids: Optional[List[UUID]] = None
    owner_id: Optional[UUID] = None


class DealResponse(DealBase):
    """Deal response."""
    id: UUID
    agency_id: UUID
    creator_ids: List[UUID] = []
    creators: List[DealCreatorSchema] = []
    owner_id: Optional[UUID] = None
    owner_name: Optional[str] = None
    days_in_stage: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DealMoveRequest(BaseModel):
    """Request to move deal to new stage."""
    stage: DealStage


class PipelineStageStats(BaseModel):
    """Stats for a single pipeline stage."""
    count: int
    value: Decimal


class PipelineStats(BaseModel):
    """Overall pipeline statistics."""
    total_value: Decimal
    avg_deal_size: Decimal
    deals_closing_this_month: int
    deals_closing_this_month_value: Decimal
    win_rate_this_month: float
    stagnant_deals: int
    by_stage: Dict[str, PipelineStageStats]


# ============================================
# Campaign Schemas
# ============================================

class DeliverableBase(BaseModel):
    """Base deliverable schema."""
    type: DeliverableType
    title: str
    description: Optional[str] = None
    owner_type: str = "agency"
    owner_id: Optional[UUID] = None
    creator_id: Optional[UUID] = None
    due_date: Optional[datetime] = None
    order: int = 0


class DeliverableCreate(DeliverableBase):
    """Create deliverable request."""
    pass


class DeliverableUpdate(BaseModel):
    """Update deliverable request."""
    type: Optional[DeliverableType] = None
    title: Optional[str] = None
    description: Optional[str] = None
    owner_type: Optional[str] = None
    owner_id: Optional[UUID] = None
    creator_id: Optional[UUID] = None
    status: Optional[DeliverableStatus] = None
    due_date: Optional[datetime] = None
    feedback: Optional[str] = None
    order: Optional[int] = None


class DeliverableResponse(DeliverableBase):
    """Deliverable response."""
    id: UUID
    campaign_id: UUID
    status: DeliverableStatus
    completed_at: Optional[datetime] = None
    files: List[DeliverableFile] = []
    feedback: Optional[str] = None
    revision_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CampaignBase(BaseModel):
    """Base campaign schema."""
    brand_name: str
    brand_logo_url: Optional[str] = None
    title: str
    description: Optional[str] = None
    campaign_type: Optional[str] = None
    value: Decimal = Decimal("0")
    currency: str = "USD"
    status: CampaignStatus = CampaignStatus.DRAFT
    posting_date: Optional[datetime] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    tags: List[str] = []
    notes: Optional[str] = None


class CampaignCreate(CampaignBase):
    """Create campaign request."""
    deal_id: Optional[UUID] = None
    creator_ids: List[UUID] = []
    owner_id: Optional[UUID] = None


class CampaignUpdate(BaseModel):
    """Update campaign request."""
    brand_name: Optional[str] = None
    brand_logo_url: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    campaign_type: Optional[str] = None
    value: Optional[Decimal] = None
    currency: Optional[str] = None
    status: Optional[CampaignStatus] = None
    posting_date: Optional[datetime] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    tags: Optional[List[str]] = None
    notes: Optional[str] = None
    creator_ids: Optional[List[UUID]] = None
    owner_id: Optional[UUID] = None


class CampaignResponse(CampaignBase):
    """Campaign response."""
    id: UUID
    agency_id: UUID
    deal_id: Optional[UUID] = None
    creator_ids: List[UUID] = []
    creators: List[CreatorSummary] = []
    owner_id: Optional[UUID] = None
    owner_name: Optional[str] = None
    deliverables: List[DeliverableResponse] = []
    deliverables_completed: int = 0
    deliverables_total: int = 0
    has_overdue: bool = False
    next_deliverable: Optional[DeliverableResponse] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================================
# Creator Directory Schemas
# ============================================

class CreatorPlatformSchema(BaseModel):
    """Platform data for a creator."""
    platform: str
    handle: str
    url: Optional[str] = None
    followers: int = 0
    avg_views: Optional[int] = None
    avg_engagement_rate: Optional[float] = None


class CreatorProfileBase(BaseModel):
    """Base creator profile schema."""
    display_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    platforms: List[CreatorPlatformSchema] = []
    niches: List[str] = []
    standard_rate: Optional[Decimal] = None
    rate_currency: str = "USD"
    relationship_status: CreatorRelationshipStatus = CreatorRelationshipStatus.ACTIVE
    internal_notes: Optional[str] = None
    tags: List[str] = []


class CreatorProfileCreate(CreatorProfileBase):
    """Create creator profile request."""
    creator_id: UUID


class CreatorProfileUpdate(BaseModel):
    """Update creator profile request."""
    display_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    platforms: Optional[List[CreatorPlatformSchema]] = None
    niches: Optional[List[str]] = None
    standard_rate: Optional[Decimal] = None
    rate_currency: Optional[str] = None
    relationship_status: Optional[CreatorRelationshipStatus] = None
    internal_notes: Optional[str] = None
    tags: Optional[List[str]] = None


class CreatorProfileResponse(CreatorProfileBase):
    """Creator profile response."""
    id: UUID
    user_id: UUID
    name: str
    handle: Optional[str] = None
    email: Optional[str] = None
    avatar_url: Optional[str] = None
    total_campaigns: int = 0
    total_revenue: Decimal = Decimal("0")
    last_campaign_date: Optional[datetime] = None
    on_time_delivery_rate: Optional[float] = None
    avg_engagement_rate: Optional[float] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CreatorAvailabilitySchema(BaseModel):
    """Creator availability entry."""
    creator_id: UUID
    date: datetime
    status: AvailabilityStatus
    campaign_id: Optional[UUID] = None
    campaign_name: Optional[str] = None
    brand_name: Optional[str] = None
    notes: Optional[str] = None


class CreatorAvailabilitySet(BaseModel):
    """Set availability request."""
    creator_id: UUID
    date: datetime
    status: AvailabilityStatus
    campaign_id: Optional[UUID] = None
    notes: Optional[str] = None


class CreatorGroupBase(BaseModel):
    """Base group schema."""
    name: str
    description: Optional[str] = None
    color: str = "#6366f1"


class CreatorGroupCreate(CreatorGroupBase):
    """Create group request."""
    creator_ids: List[UUID] = []


class CreatorGroupUpdate(BaseModel):
    """Update group request."""
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None


class CreatorGroupResponse(CreatorGroupBase):
    """Group response."""
    id: UUID
    creator_ids: List[UUID] = []
    creator_count: int = 0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================================
# Finance Schemas
# ============================================

class InvoiceBase(BaseModel):
    """Base invoice schema."""
    brand_name: str
    brand_contact_name: Optional[str] = None
    brand_contact_email: Optional[str] = None
    billing_address: Optional[str] = None
    subtotal: Decimal
    tax_rate: Optional[Decimal] = None
    tax_amount: Optional[Decimal] = None
    discount_amount: Optional[Decimal] = None
    total_amount: Decimal
    currency: str = "USD"
    due_date: datetime
    line_items: List[InvoiceLineItem] = []
    notes: Optional[str] = None
    terms: Optional[str] = None


class InvoiceCreate(InvoiceBase):
    """Create invoice request."""
    deal_id: Optional[UUID] = None
    campaign_id: Optional[UUID] = None


class InvoiceUpdate(BaseModel):
    """Update invoice request."""
    brand_name: Optional[str] = None
    brand_contact_name: Optional[str] = None
    brand_contact_email: Optional[str] = None
    billing_address: Optional[str] = None
    subtotal: Optional[Decimal] = None
    tax_rate: Optional[Decimal] = None
    tax_amount: Optional[Decimal] = None
    discount_amount: Optional[Decimal] = None
    total_amount: Optional[Decimal] = None
    currency: Optional[str] = None
    status: Optional[InvoiceStatus] = None
    due_date: Optional[datetime] = None
    line_items: Optional[List[InvoiceLineItem]] = None
    notes: Optional[str] = None
    terms: Optional[str] = None


class InvoiceResponse(InvoiceBase):
    """Invoice response."""
    id: UUID
    agency_id: UUID
    invoice_number: str
    deal_id: Optional[UUID] = None
    campaign_id: Optional[UUID] = None
    status: InvoiceStatus
    sent_at: Optional[datetime] = None
    viewed_at: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    paid_amount: Optional[Decimal] = None
    payment_method: Optional[str] = None
    pdf_url: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InvoiceSendRequest(BaseModel):
    """Send invoice request."""
    email: str


class InvoiceMarkPaidRequest(BaseModel):
    """Mark invoice as paid request."""
    paid_date: datetime
    paid_amount: Decimal
    payment_method: Optional[str] = None
    reference: Optional[str] = None


class PayoutBase(BaseModel):
    """Base payout schema."""
    creator_id: UUID
    campaign_id: Optional[UUID] = None
    campaign_name: Optional[str] = None
    brand_name: Optional[str] = None
    amount: Decimal
    currency: str = "USD"
    due_date: datetime
    notes: Optional[str] = None


class PayoutCreate(PayoutBase):
    """Create payout request."""
    invoice_id: Optional[UUID] = None
    agency_fee: Optional[Decimal] = None
    agency_fee_percent: Optional[Decimal] = None


class PayoutResponse(PayoutBase):
    """Payout response."""
    id: UUID
    agency_id: UUID
    creator_name: str
    invoice_id: Optional[UUID] = None
    agency_fee: Optional[Decimal] = None
    status: PayoutStatus
    approved_at: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    payment_method: Optional[str] = None
    transaction_reference: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PayoutMarkPaidRequest(BaseModel):
    """Mark payout as paid request."""
    paid_date: datetime
    payment_method: Optional[str] = None
    transaction_reference: Optional[str] = None


class FinancialStats(BaseModel):
    """Financial overview stats."""
    outstanding_receivables: Decimal
    overdue_receivables: Decimal
    overdue_count: int
    oldest_overdue_days: Optional[int] = None
    creator_payouts_due: Decimal
    creator_payouts_count: int
    revenue_this_month: Decimal
    revenue_last_month: Decimal
    revenue_trend_percent: float


# ============================================
# Report Schemas
# ============================================

class ReportMetrics(BaseModel):
    """Report performance metrics."""
    impressions: int = 0
    impressions_goal: Optional[int] = None
    engagement_rate: float = 0
    engagements: int = 0
    likes: Optional[int] = None
    comments: Optional[int] = None
    shares: Optional[int] = None
    saves: Optional[int] = None
    views: Optional[int] = None
    cpm: Optional[float] = None
    cpv: Optional[float] = None
    cost_per_engagement: Optional[float] = None


class ReportBase(BaseModel):
    """Base report schema."""
    title: str
    brand_name: Optional[str] = None
    creator_names: List[str] = []
    campaign_date: Optional[datetime] = None


class ReportCreate(BaseModel):
    """Create/generate report request."""
    campaign_id: UUID
    template: Optional[str] = None
    sections: Optional[List[str]] = None


class ReportResponse(ReportBase):
    """Report response."""
    id: UUID
    agency_id: UUID
    campaign_id: Optional[UUID] = None
    status: ReportStatus
    generated_at: Optional[datetime] = None
    generated_by: Optional[str] = None
    sent_at: Optional[datetime] = None
    sent_to: List[str] = []
    viewed_at: Optional[datetime] = None
    downloaded_at: Optional[datetime] = None
    pdf_url: Optional[str] = None
    metrics: Optional[ReportMetrics] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReportSendRequest(BaseModel):
    """Send report request."""
    recipients: List[str]
    subject: Optional[str] = None
    message: Optional[str] = None


# ============================================
# Dashboard Widgets Schemas
# ============================================

class ActionRequiredItem(BaseModel):
    """Action item for dashboard."""
    id: str
    type: str  # deliverable, invoice, approval, payment, campaign
    title: str
    description: str
    campaign_name: Optional[str] = None
    creator_name: Optional[str] = None
    urgency: str  # overdue, due_today, due_this_week
    days_overdue: Optional[int] = None
    action_url: str
    quick_action: Optional[str] = None


class UpcomingDeadline(BaseModel):
    """Upcoming deadline for dashboard."""
    id: str
    date: datetime
    type: str  # content_posting, deliverable, payment, approval
    title: str
    campaign_name: Optional[str] = None
    creator_name: Optional[str] = None
    brand_name: Optional[str] = None
    amount: Optional[Decimal] = None
    is_overdue: bool = False


class ActivityItem(BaseModel):
    """Activity feed item."""
    id: str
    type: str
    description: str
    actor_name: str
    actor_avatar: Optional[str] = None
    timestamp: datetime
    link_url: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class DashboardStats(BaseModel):
    """Dashboard overview stats."""
    total_active_campaigns: int
    total_creators: int
    revenue_this_month: Decimal
    pipeline_value: Decimal
    completion_rate: float


# ============================================
# Notification Schemas
# ============================================

class NotificationResponse(BaseModel):
    """Notification response."""
    id: UUID
    type: str
    title: str
    description: Optional[str] = None
    link_url: Optional[str] = None
    is_read: bool
    is_actioned: bool
    priority: str
    created_at: datetime
    metadata: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(from_attributes=True)


# ============================================
# Task Schemas
# ============================================

class TaskBase(BaseModel):
    """Base task schema."""
    title: str
    description: Optional[str] = None
    priority: TaskPriority = TaskPriority.NORMAL
    due_date: Optional[datetime] = None
    related_type: Optional[str] = None
    related_id: Optional[UUID] = None
    notes: Optional[str] = None


class TaskCreate(TaskBase):
    """Create task request."""
    assignee_id: Optional[UUID] = None


class TaskUpdate(BaseModel):
    """Update task request."""
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[TaskPriority] = None
    status: Optional[TaskStatus] = None
    assignee_id: Optional[UUID] = None
    due_date: Optional[datetime] = None
    notes: Optional[str] = None


class TaskResponse(TaskBase):
    """Task response."""
    id: UUID
    agency_id: UUID
    status: TaskStatus
    assignee_id: Optional[UUID] = None
    assignee_name: Optional[str] = None
    created_by: Optional[UUID] = None
    creator_name: Optional[str] = None
    completed_at: Optional[datetime] = None
    is_auto_generated: bool = False
    source: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================================
# Search Schemas
# ============================================

class SearchResult(BaseModel):
    """Single search result."""
    id: str
    type: str  # campaign, creator, brand, invoice, report, deal
    title: str
    subtitle: Optional[str] = None
    description: Optional[str] = None
    avatar_url: Optional[str] = None
    status: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class SearchResults(BaseModel):
    """Combined search results."""
    campaigns: List[SearchResult] = []
    creators: List[SearchResult] = []
    brands: List[SearchResult] = []
    invoices: List[SearchResult] = []
    reports: List[SearchResult] = []
    deals: List[SearchResult] = []
    total_count: int = 0
