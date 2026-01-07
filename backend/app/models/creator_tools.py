"""Creator tools models - notifications, deals, calendar, insights, media kits."""

from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List

from sqlalchemy import (
    Boolean, Column, DateTime, Date, Integer, String, Text, Time,
    ForeignKey, UniqueConstraint, CheckConstraint, Numeric, Index
)
from sqlalchemy.dialects.postgresql import ENUM as PG_ENUM, JSONB, UUID as PGUUID, ARRAY
from sqlalchemy.orm import relationship

from app.core.database import Base


# =============================================
# NOTIFICATION SYSTEM
# =============================================


class Notification(Base):
    """User notifications for alerts and updates."""

    __tablename__ = "notifications"

    user_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Notification content
    type = Column(
        String(50),
        nullable=False,
        index=True,
        comment="Type: unanswered_comments, engagement_drop, brand_opportunity, performance_insight, deal_update, content_reminder"
    )
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)

    # Additional data for rich notifications
    data = Column(JSONB, default=dict, comment="Additional context data")
    # Example data structures:
    # unanswered_comments: {"count": 15, "video_id": "xxx", "video_title": "..."}
    # engagement_drop: {"current_rate": 3.2, "previous_rate": 5.1, "change_pct": -37}
    # brand_opportunity: {"opportunity_id": "xxx", "brand_name": "...", "value": 5000}
    # performance_insight: {"insight_type": "best_time", "recommendation": "..."}

    # Action link
    action_url = Column(String(500), comment="Deep link to relevant page")
    action_label = Column(String(100), default="View", comment="Button text")

    # Priority and status
    priority = Column(
        String(20),
        nullable=False,
        default="normal",
        comment="Priority: urgent, high, normal, low"
    )
    is_read = Column(Boolean, default=False, nullable=False, index=True)
    read_at = Column(DateTime(timezone=True))
    is_dismissed = Column(Boolean, default=False, nullable=False)
    dismissed_at = Column(DateTime(timezone=True))

    # Expiration (some notifications expire)
    expires_at = Column(DateTime(timezone=True), comment="Auto-dismiss after this time")

    # Relationships
    user = relationship("User", backref="notifications")

    __table_args__ = (
        Index("idx_notifications_user_unread", "user_id", "is_read"),
        Index("idx_notifications_user_type", "user_id", "type"),
        Index("idx_notifications_created", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<Notification(id={self.id}, type='{self.type}', user_id={self.user_id})>"

    def mark_read(self):
        """Mark notification as read."""
        self.is_read = True
        self.read_at = datetime.utcnow()

    def dismiss(self):
        """Dismiss the notification."""
        self.is_dismissed = True
        self.dismissed_at = datetime.utcnow()


class NotificationPreference(Base):
    """User notification preferences - supports both creator and agency users."""

    __tablename__ = "notification_preferences"

    user_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True
    )

    # Global toggles for notification channels
    in_app_enabled = Column(Boolean, default=True, nullable=False, comment="Master toggle for in-app notifications")
    email_enabled = Column(Boolean, default=True, nullable=False, comment="Master toggle for email notifications")
    
    # Email delivery settings
    email_frequency = Column(
        String(20),
        default="instant",
        comment="Frequency: instant or daily_digest"
    )
    digest_hour = Column(Integer, default=9, comment="Hour (0-23) to send daily digest")
    
    # Per-notification-type settings (JSONB for flexibility)
    # Format: {"deal_won": {"in_app": true, "email": true}, "deal_lost": {"in_app": true, "email": false}, ...}
    type_settings = Column(JSONB, default=dict, comment="Per-type notification preferences")
    
    # Muted entities (don't notify about these)
    # Format: [{"type": "campaign", "id": "uuid"}, {"type": "deal", "id": "uuid"}]
    muted_entities = Column(JSONB, default=list, comment="Entities to mute notifications for")

    # Legacy fields (keep for backward compatibility with creator tools)
    notify_unanswered_comments = Column(Boolean, default=True, nullable=False)
    unanswered_threshold = Column(Integer, default=10, comment="Alert after N unanswered")
    unanswered_hours = Column(Integer, default=24, comment="Consider unanswered after N hours")

    notify_engagement_changes = Column(Boolean, default=True, nullable=False)
    engagement_drop_threshold = Column(Integer, default=20, comment="Alert if drop > N%")

    notify_brand_opportunities = Column(Boolean, default=True, nullable=False)
    notify_performance_insights = Column(Boolean, default=True, nullable=False)
    notify_deal_updates = Column(Boolean, default=True, nullable=False)
    notify_content_reminders = Column(Boolean, default=True, nullable=False)

    # Quiet hours
    quiet_hours_enabled = Column(Boolean, default=False, nullable=False)
    quiet_hours_start = Column(Time, comment="Start of quiet hours (local time)")
    quiet_hours_end = Column(Time, comment="End of quiet hours (local time)")
    timezone = Column(String(50), default="UTC")

    # Relationships
    user = relationship("User", backref="notification_preferences")

    __table_args__ = (
        CheckConstraint(
            "email_frequency IN ('instant', 'daily_digest')",
            name="valid_email_frequency"
        ),
    )

    def __repr__(self) -> str:
        return f"<NotificationPreference(user_id={self.user_id})>"


# =============================================
# BRAND DEALS / DEAL TRACKER
# =============================================


class BrandDeal(Base):
    """Brand deal tracking - both agency-sourced and self-managed."""

    __tablename__ = "brand_deals"

    user_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Source tracking
    source = Column(
        String(20),
        nullable=False,
        default="self",
        comment="Source: self (creator-managed) or agency"
    )
    agency_opportunity_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("agency_opportunities.id", ondelete="SET NULL"),
        nullable=True,
        comment="Link to agency opportunity if sourced from agency"
    )

    # Brand info
    brand_name = Column(String(255), nullable=False)
    brand_logo_url = Column(String(500))
    brand_contact_name = Column(String(255))
    brand_contact_email = Column(String(255))
    brand_website = Column(String(500))

    # Deal details
    title = Column(String(255), nullable=False, comment="Campaign/deal title")
    description = Column(Text)
    category = Column(String(50), comment="Product category: tech, fashion, beauty, etc.")

    # Compensation
    deal_type = Column(
        String(30),
        nullable=False,
        default="flat_fee",
        comment="Type: flat_fee, cpm, cpc, affiliate, product_only, hybrid"
    )
    payment_amount = Column(Numeric(12, 2), comment="Fixed payment amount")
    payment_currency = Column(String(3), default="USD")
    product_value = Column(Numeric(12, 2), comment="Value of products received")
    affiliate_rate = Column(Numeric(5, 2), comment="Affiliate percentage")
    performance_bonus = Column(JSONB, comment="Bonus structure if any")
    # Example: {"views_threshold": 100000, "bonus_amount": 500}

    # Deliverables
    deliverables = Column(JSONB, default=list, comment="List of required deliverables")
    # Example: [{"type": "youtube_video", "quantity": 1, "duration_min": 600}, {"type": "instagram_story", "quantity": 3}]

    # Timeline
    status = Column(
        String(30),
        nullable=False,
        default="negotiating",
        index=True,
        comment="Status: negotiating, confirmed, in_progress, delivered, completed, cancelled"
    )
    contracted_at = Column(DateTime(timezone=True), comment="When deal was finalized")
    content_deadline = Column(DateTime(timezone=True), comment="When content is due")
    go_live_date = Column(Date, comment="When content goes live")
    completed_at = Column(DateTime(timezone=True), comment="When deal was completed")

    # Payment tracking
    payment_status = Column(
        String(20),
        nullable=False,
        default="pending",
        comment="Payment: pending, invoiced, partial, paid"
    )
    payment_due_date = Column(Date)
    amount_paid = Column(Numeric(12, 2), default=0)
    payment_received_at = Column(DateTime(timezone=True))
    invoice_number = Column(String(100))
    payment_notes = Column(Text)

    # Performance tracking (after content goes live)
    content_urls = Column(ARRAY(Text), default=list, comment="URLs to published content")
    views = Column(Integer)
    engagement = Column(Integer)
    clicks = Column(Integer)
    conversions = Column(Integer)
    actual_revenue = Column(Numeric(12, 2), comment="Actual revenue if affiliate/CPC")

    # Notes and documents
    notes = Column(Text)
    contract_url = Column(String(500))
    attachments = Column(JSONB, default=list)

    # Relationships
    user = relationship("User", backref="brand_deals")
    agency_opportunity = relationship("AgencyOpportunity", backref="brand_deal")

    __table_args__ = (
        CheckConstraint(
            "source IN ('self', 'agency')",
            name="valid_deal_source"
        ),
        CheckConstraint(
            "deal_type IN ('flat_fee', 'cpm', 'cpc', 'affiliate', 'product_only', 'hybrid')",
            name="valid_deal_type"
        ),
        CheckConstraint(
            "status IN ('negotiating', 'confirmed', 'in_progress', 'delivered', 'completed', 'cancelled')",
            name="valid_deal_status"
        ),
        CheckConstraint(
            "payment_status IN ('pending', 'invoiced', 'partial', 'paid')",
            name="valid_payment_status"
        ),
        Index("idx_brand_deals_user_status", "user_id", "status"),
        Index("idx_brand_deals_deadline", "content_deadline"),
    )

    def __repr__(self) -> str:
        return f"<BrandDeal(id={self.id}, brand='{self.brand_name}', status='{self.status}')>"

    @property
    def total_value(self) -> Decimal:
        """Calculate total deal value."""
        value = Decimal(0)
        if self.payment_amount:
            value += self.payment_amount
        if self.product_value:
            value += self.product_value
        if self.actual_revenue:
            value += self.actual_revenue
        return value


# =============================================
# CONTENT CALENDAR
# =============================================


class ContentCalendarEntry(Base):
    """Content calendar entries for planning and scheduling."""

    __tablename__ = "content_calendar_entries"

    user_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Content info
    title = Column(String(255), nullable=False)
    description = Column(Text)
    content_type = Column(
        String(30),
        nullable=False,
        comment="Type: video, short, reel, story, post, live, podcast"
    )
    platform = Column(
        String(20),
        nullable=False,
        comment="Platform: youtube, instagram, tiktok, twitter"
    )

    # Scheduling
    scheduled_date = Column(Date, nullable=False, index=True)
    scheduled_time = Column(Time, comment="Optimal posting time")
    timezone = Column(String(50), default="UTC")
    is_best_time = Column(Boolean, default=False, comment="Using AI-recommended time")

    # Status
    status = Column(
        String(20),
        nullable=False,
        default="idea",
        index=True,
        comment="Status: idea, planned, drafting, ready, published, cancelled"
    )
    published_at = Column(DateTime(timezone=True))
    published_url = Column(String(500))

    # Linked content
    content_piece_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("content_pieces.id", ondelete="SET NULL"),
        comment="Link to actual published content"
    )

    # Brand deal link (if sponsored content)
    brand_deal_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("brand_deals.id", ondelete="SET NULL")
    )

    # Content planning
    topic = Column(String(255))
    theme = Column(String(100))
    target_audience = Column(String(255))
    key_points = Column(ARRAY(Text), default=list)
    hashtags = Column(ARRAY(String(100)), default=list)

    # AI suggestions
    ai_suggestions = Column(JSONB, comment="AI-generated suggestions for this content")
    # Example: {"title_options": [...], "hooks": [...], "best_time_reason": "..."}

    # Notes
    notes = Column(Text)
    checklist = Column(JSONB, default=list)
    # Example: [{"item": "Record video", "done": true}, {"item": "Edit", "done": false}]

    # Recurrence (for regular content)
    is_recurring = Column(Boolean, default=False, nullable=False)
    recurrence_rule = Column(String(100), comment="RRULE format")

    # Relationships
    user = relationship("User", backref="calendar_entries")
    content_piece = relationship("ContentPiece", backref="calendar_entry")
    brand_deal = relationship("BrandDeal", backref="calendar_entries")

    __table_args__ = (
        CheckConstraint(
            "content_type IN ('video', 'short', 'reel', 'story', 'post', 'live', 'podcast', 'thread')",
            name="valid_content_type"
        ),
        CheckConstraint(
            "platform IN ('youtube', 'instagram', 'tiktok', 'twitter', 'linkedin', 'threads')",
            name="valid_calendar_platform"
        ),
        CheckConstraint(
            "status IN ('idea', 'planned', 'drafting', 'ready', 'published', 'cancelled')",
            name="valid_calendar_status"
        ),
        Index("idx_calendar_user_date", "user_id", "scheduled_date"),
        Index("idx_calendar_user_status", "user_id", "status"),
    )

    def __repr__(self) -> str:
        return f"<ContentCalendarEntry(id={self.id}, title='{self.title}', date={self.scheduled_date})>"


# =============================================
# CREATOR INSIGHTS / WHAT'S WORKING
# =============================================


class CreatorInsight(Base):
    """Cached insights about what's working for the creator."""

    __tablename__ = "creator_insights"

    user_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Insight categorization
    insight_type = Column(
        String(50),
        nullable=False,
        index=True,
        comment="Type: best_time, content_format, title_pattern, topic, engagement_driver, growth_factor"
    )
    category = Column(String(50), comment="Sub-category within type")

    # The insight
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)

    # Supporting data
    supporting_data = Column(JSONB, nullable=False)
    # Examples:
    # best_time: {"day": "Tuesday", "hour": 14, "avg_views": 15000, "vs_avg": 1.4}
    # content_format: {"format": "tutorial", "avg_engagement": 8.2, "sample_count": 15}
    # title_pattern: {"pattern": "question", "examples": [...], "performance_boost": 1.3}

    # Confidence and impact
    confidence_score = Column(Numeric(3, 2), nullable=False, comment="0-1 confidence")
    impact_score = Column(Numeric(3, 2), nullable=False, comment="0-1 potential impact")
    sample_size = Column(Integer, nullable=False, comment="Data points used")

    # Comparison to benchmark
    vs_creator_average = Column(Numeric(4, 2), comment="Multiplier vs creator's own average")
    vs_niche_average = Column(Numeric(4, 2), comment="Multiplier vs niche average")

    # Actionability
    is_actionable = Column(Boolean, default=True, nullable=False)
    recommendation = Column(Text, comment="Specific action to take")

    # Validity
    calculated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_current = Column(Boolean, default=True, nullable=False)

    # Relationships
    user = relationship("User", backref="creator_insights")

    __table_args__ = (
        CheckConstraint(
            "insight_type IN ('best_time', 'content_format', 'title_pattern', 'topic', 'engagement_driver', 'growth_factor', 'audience_behavior')",
            name="valid_insight_type"
        ),
        Index("idx_insights_user_type", "user_id", "insight_type"),
        Index("idx_insights_current", "user_id", "is_current"),
        Index("idx_insights_expires", "expires_at"),
    )

    def __repr__(self) -> str:
        return f"<CreatorInsight(id={self.id}, type='{self.insight_type}', user_id={self.user_id})>"


# =============================================
# MEDIA KIT
# =============================================


class MediaKit(Base):
    """Generated media kits for brand outreach."""

    __tablename__ = "media_kits"

    user_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Kit info
    name = Column(String(255), nullable=False, default="My Media Kit")
    is_default = Column(Boolean, default=False, nullable=False)

    # Customization
    template_style = Column(String(50), default="modern", comment="Style: modern, minimal, bold, classic")
    primary_color = Column(String(7), default="#6366f1", comment="Hex color")
    show_rate_card = Column(Boolean, default=True, nullable=False)

    # Sections to include
    sections = Column(JSONB, default=list)
    # Example: ["about", "platforms", "demographics", "content_examples", "rate_card", "partnerships"]

    # Cached data snapshot
    metrics_snapshot = Column(JSONB, nullable=False, comment="Metrics at generation time")
    # Structure: {
    #   "youtube": {"subscribers": 100000, "avg_views": 50000, "engagement_rate": 4.2},
    #   "instagram": {"followers": 50000, "avg_likes": 3000},
    #   "total_audience": 150000
    # }

    demographics_snapshot = Column(JSONB, comment="Audience demographics")
    # Structure: {"age_ranges": {...}, "gender": {...}, "top_countries": [...]}

    rate_card_snapshot = Column(JSONB, comment="Rate card at generation time")
    # Structure: {"youtube_integration": {"min": 2000, "max": 4000}, ...}

    past_partnerships = Column(JSONB, default=list, comment="Featured brand partnerships")
    # Structure: [{"brand": "Nike", "logo_url": "...", "description": "..."}]

    content_examples = Column(JSONB, default=list, comment="Featured content")
    # Structure: [{"title": "...", "url": "...", "thumbnail": "...", "views": 100000}]

    # About section
    bio = Column(Text)
    tagline = Column(String(255))
    profile_image_url = Column(String(500))

    # Contact (optional - can override user's default)
    contact_email = Column(String(255))
    contact_name = Column(String(255))

    # Generated files
    pdf_url = Column(String(500), comment="Generated PDF URL")
    pdf_generated_at = Column(DateTime(timezone=True))
    public_url = Column(String(500), comment="Public shareable link")
    public_url_enabled = Column(Boolean, default=False, nullable=False)
    public_url_password = Column(String(255), comment="Optional password protection")

    # Analytics
    view_count = Column(Integer, default=0)
    last_viewed_at = Column(DateTime(timezone=True))

    # Relationships
    user = relationship("User", backref="media_kits")

    __table_args__ = (
        CheckConstraint(
            "template_style IN ('modern', 'minimal', 'bold', 'classic', 'creative')",
            name="valid_template_style"
        ),
        Index("idx_media_kits_user", "user_id"),
        Index("idx_media_kits_public", "public_url"),
    )

    def __repr__(self) -> str:
        return f"<MediaKit(id={self.id}, name='{self.name}', user_id={self.user_id})>"


# =============================================
# RATE CARD / SPONSORSHIP RATES
# =============================================


class CreatorRateCard(Base):
    """Creator's rate card for sponsorship pricing."""

    __tablename__ = "creator_rate_cards"

    user_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True
    )

    # Auto-calculated rates (AI-suggested based on metrics)
    calculated_rates = Column(JSONB, nullable=False, default=dict)
    # Structure: {
    #   "youtube_dedicated": {"min": 4000, "max": 8000, "suggested": 5500},
    #   "youtube_integration": {"min": 2000, "max": 4000, "suggested": 2800},
    #   "youtube_short": {"min": 500, "max": 1500, "suggested": 800},
    #   "instagram_post": {"min": 1000, "max": 2500, "suggested": 1500},
    #   "instagram_story": {"min": 300, "max": 800, "suggested": 500},
    #   "instagram_reel": {"min": 800, "max": 2000, "suggested": 1200},
    #   "tiktok_video": {"min": 600, "max": 1500, "suggested": 900},
    #   "bundle_social_package": {"min": 3000, "max": 8000, "suggested": 5000}
    # }
    calculated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    # User-set rates (override calculated)
    custom_rates = Column(JSONB, default=dict, comment="User-customized rates")

    # Which rates to show
    rate_visibility = Column(JSONB, default=dict, comment="Which rates to show in media kit")
    # Structure: {"youtube_dedicated": true, "youtube_short": false, ...}

    # Currency
    currency = Column(String(3), default="USD", nullable=False)

    # Usage rights pricing
    usage_rights_multipliers = Column(JSONB, default=dict)
    # Structure: {"30_days": 1.0, "90_days": 1.3, "1_year": 1.6, "perpetual": 2.0}

    # Exclusivity pricing
    exclusivity_multipliers = Column(JSONB, default=dict)
    # Structure: {"none": 1.0, "30_days": 1.2, "90_days": 1.5, "1_year": 2.0}

    # Notes for negotiation
    negotiation_notes = Column(Text, comment="Internal notes about pricing flexibility")
    minimum_budget = Column(Numeric(10, 2), comment="Won't work with brands below this")

    # Relationships
    user = relationship("User", backref="rate_card")

    __table_args__ = (
        Index("idx_rate_cards_user", "user_id"),
    )

    def __repr__(self) -> str:
        return f"<CreatorRateCard(user_id={self.user_id})>"

    def get_rate(self, rate_type: str) -> dict:
        """Get rate for a specific type, preferring custom over calculated."""
        if rate_type in (self.custom_rates or {}):
            return self.custom_rates[rate_type]
        return (self.calculated_rates or {}).get(rate_type, {})


# =============================================
# BEST TIME ANALYSIS
# =============================================


class PostingTimeAnalysis(Base):
    """Cached analysis of best posting times."""

    __tablename__ = "posting_time_analysis"

    user_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    platform = Column(String(20), nullable=False)

    # Best times by day
    best_times = Column(JSONB, nullable=False)
    # Structure: {
    #   "monday": [{"hour": 14, "score": 0.92, "avg_views": 15000}, {"hour": 19, "score": 0.85}],
    #   "tuesday": [...],
    #   ...
    # }

    # Overall best
    overall_best_day = Column(String(10))
    overall_best_hour = Column(Integer)
    overall_best_score = Column(Numeric(3, 2))

    # Worst times to avoid
    times_to_avoid = Column(JSONB, default=list)
    # Structure: [{"day": "sunday", "hour": 6, "reason": "Low engagement"}]

    # Analysis metadata
    sample_size = Column(Integer, nullable=False)
    analyzed_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    expires_at = Column(DateTime(timezone=True), nullable=False)

    # Relationships
    user = relationship("User", backref="posting_time_analyses")

    __table_args__ = (
        UniqueConstraint("user_id", "platform", name="unique_user_platform_analysis"),
        CheckConstraint(
            "platform IN ('youtube', 'instagram', 'tiktok', 'twitter')",
            name="valid_analysis_platform"
        ),
        Index("idx_posting_analysis_user", "user_id"),
        Index("idx_posting_analysis_expires", "expires_at"),
    )

    def __repr__(self) -> str:
        return f"<PostingTimeAnalysis(user_id={self.user_id}, platform='{self.platform}')>"
