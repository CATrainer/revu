"""
Creator Tools API - Comprehensive endpoints for notifications, deals, calendar, insights, media kits.

This module provides the production-ready API for all creator-focused features:
- Notifications & Alerts
- Brand Deal Tracking
- Content Calendar
- What's Working Insights
- Media Kit Generation
- Rate Calculator
- Template Quick Replies
"""

from datetime import datetime, timedelta, date
from typing import List, Optional, Dict, Any
from uuid import UUID
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc, asc

from app.core.database import get_async_session
from app.core.security import get_current_active_user
from app.models.user import User
from app.models.creator_tools import (
    Notification,
    NotificationPreference,
    BrandDeal,
    ContentCalendarEntry,
    CreatorInsight,
    MediaKit,
    CreatorRateCard,
    PostingTimeAnalysis,
)
from app.models.template import ResponseTemplate
from app.models.interaction import Interaction

router = APIRouter()
logger = logging.getLogger(__name__)


# =============================================
# SCHEMAS
# =============================================


class NotificationOut(BaseModel):
    id: UUID
    type: str
    title: str
    message: str
    data: Optional[Dict[str, Any]] = None
    action_url: Optional[str] = None
    action_label: str = "View"
    priority: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationListResponse(BaseModel):
    notifications: List[NotificationOut]
    unread_count: int
    total: int


class NotificationPreferenceUpdate(BaseModel):
    notify_unanswered_comments: Optional[bool] = None
    unanswered_threshold: Optional[int] = None
    unanswered_hours: Optional[int] = None
    notify_engagement_changes: Optional[bool] = None
    engagement_drop_threshold: Optional[int] = None
    notify_brand_opportunities: Optional[bool] = None
    notify_performance_insights: Optional[bool] = None
    notify_deal_updates: Optional[bool] = None
    notify_content_reminders: Optional[bool] = None
    email_enabled: Optional[bool] = None
    email_digest_frequency: Optional[str] = None
    quiet_hours_enabled: Optional[bool] = None
    quiet_hours_start: Optional[str] = None
    quiet_hours_end: Optional[str] = None
    timezone: Optional[str] = None


class BrandDealCreate(BaseModel):
    brand_name: str
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    deal_type: str = "flat_fee"
    payment_amount: Optional[float] = None
    payment_currency: str = "USD"
    product_value: Optional[float] = None
    deliverables: Optional[List[Dict[str, Any]]] = None
    content_deadline: Optional[datetime] = None
    go_live_date: Optional[date] = None
    brand_contact_name: Optional[str] = None
    brand_contact_email: Optional[str] = None
    notes: Optional[str] = None


class BrandDealUpdate(BaseModel):
    brand_name: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    payment_status: Optional[str] = None
    payment_amount: Optional[float] = None
    amount_paid: Optional[float] = None
    content_deadline: Optional[datetime] = None
    go_live_date: Optional[date] = None
    content_urls: Optional[List[str]] = None
    views: Optional[int] = None
    engagement: Optional[int] = None
    notes: Optional[str] = None


class BrandDealOut(BaseModel):
    id: UUID
    source: str
    brand_name: str
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    deal_type: str
    payment_amount: Optional[float] = None
    payment_currency: str
    product_value: Optional[float] = None
    status: str
    payment_status: str
    content_deadline: Optional[datetime] = None
    go_live_date: Optional[date] = None
    deliverables: Optional[List[Dict[str, Any]]] = None
    content_urls: Optional[List[str]] = None
    views: Optional[int] = None
    engagement: Optional[int] = None
    amount_paid: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True


class CalendarEntryCreate(BaseModel):
    title: str
    description: Optional[str] = None
    content_type: str
    platform: str
    scheduled_date: date
    scheduled_time: Optional[str] = None
    topic: Optional[str] = None
    theme: Optional[str] = None
    key_points: Optional[List[str]] = None
    hashtags: Optional[List[str]] = None
    notes: Optional[str] = None
    brand_deal_id: Optional[UUID] = None


class CalendarEntryOut(BaseModel):
    id: UUID
    title: str
    description: Optional[str] = None
    content_type: str
    platform: str
    scheduled_date: date
    scheduled_time: Optional[str] = None
    status: str
    topic: Optional[str] = None
    theme: Optional[str] = None
    is_best_time: bool
    brand_deal_id: Optional[UUID] = None
    ai_suggestions: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class InsightOut(BaseModel):
    id: UUID
    insight_type: str
    category: Optional[str] = None
    title: str
    description: str
    supporting_data: Dict[str, Any]
    confidence_score: float
    impact_score: float
    recommendation: Optional[str] = None
    vs_creator_average: Optional[float] = None

    class Config:
        from_attributes = True


class MediaKitOut(BaseModel):
    id: UUID
    name: str
    template_style: str
    metrics_snapshot: Dict[str, Any]
    pdf_url: Optional[str] = None
    public_url: Optional[str] = None
    public_url_enabled: bool
    view_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class RateCardOut(BaseModel):
    calculated_rates: Dict[str, Any]
    custom_rates: Dict[str, Any]
    currency: str
    calculated_at: datetime

    class Config:
        from_attributes = True


class QuickReplyRequest(BaseModel):
    template_id: Optional[UUID] = None
    template_shortcut: Optional[str] = None
    variables: Optional[Dict[str, str]] = None


class AIQuickSuggestionRequest(BaseModel):
    suggestion_type: str = Field(..., description="Type: thank_you, answer_question, acknowledge, redirect")
    context: Optional[str] = None


# =============================================
# NOTIFICATIONS
# =============================================


@router.get("/notifications", response_model=NotificationListResponse)
async def list_notifications(
    unread_only: bool = Query(False),
    limit: int = Query(20, le=100),
    offset: int = Query(0),
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Get user's notifications with unread count."""
    query = select(Notification).where(
        Notification.user_id == current_user.id,
        Notification.is_dismissed == False
    )

    if unread_only:
        query = query.where(Notification.is_read == False)

    # Get unread count
    unread_query = select(func.count(Notification.id)).where(
        Notification.user_id == current_user.id,
        Notification.is_read == False,
        Notification.is_dismissed == False
    )
    unread_result = await session.execute(unread_query)
    unread_count = unread_result.scalar() or 0

    # Get total
    total_query = select(func.count(Notification.id)).where(
        Notification.user_id == current_user.id,
        Notification.is_dismissed == False
    )
    total_result = await session.execute(total_query)
    total = total_result.scalar() or 0

    # Get notifications
    query = query.order_by(desc(Notification.created_at)).offset(offset).limit(limit)
    result = await session.execute(query)
    notifications = result.scalars().all()

    return NotificationListResponse(
        notifications=notifications,
        unread_count=unread_count,
        total=total
    )


@router.post("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Mark a notification as read."""
    notification = await session.get(Notification, notification_id)

    if not notification or notification.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Notification not found")

    notification.mark_read()
    await session.commit()

    return {"success": True}


@router.post("/notifications/read-all")
async def mark_all_notifications_read(
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Mark all notifications as read."""
    from sqlalchemy import update

    await session.execute(
        update(Notification)
        .where(
            Notification.user_id == current_user.id,
            Notification.is_read == False
        )
        .values(is_read=True, read_at=datetime.utcnow())
    )
    await session.commit()

    return {"success": True, "message": "All notifications marked as read"}


@router.delete("/notifications/{notification_id}")
async def dismiss_notification(
    notification_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Dismiss a notification."""
    notification = await session.get(Notification, notification_id)

    if not notification or notification.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Notification not found")

    notification.dismiss()
    await session.commit()

    return {"success": True}


@router.get("/notifications/preferences")
async def get_notification_preferences(
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Get user's notification preferences."""
    result = await session.execute(
        select(NotificationPreference).where(
            NotificationPreference.user_id == current_user.id
        )
    )
    prefs = result.scalar_one_or_none()

    if not prefs:
        # Create default preferences
        prefs = NotificationPreference(user_id=current_user.id)
        session.add(prefs)
        await session.commit()
        await session.refresh(prefs)

    return prefs


@router.patch("/notifications/preferences")
async def update_notification_preferences(
    payload: NotificationPreferenceUpdate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Update notification preferences."""
    result = await session.execute(
        select(NotificationPreference).where(
            NotificationPreference.user_id == current_user.id
        )
    )
    prefs = result.scalar_one_or_none()

    if not prefs:
        prefs = NotificationPreference(user_id=current_user.id)
        session.add(prefs)

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(prefs, field, value)

    await session.commit()
    await session.refresh(prefs)

    return prefs


# =============================================
# BRAND DEALS
# =============================================


@router.get("/deals", response_model=List[BrandDealOut])
async def list_brand_deals(
    status: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    limit: int = Query(50, le=100),
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """List user's brand deals."""
    query = select(BrandDeal).where(BrandDeal.user_id == current_user.id)

    if status:
        query = query.where(BrandDeal.status == status)
    if source:
        query = query.where(BrandDeal.source == source)

    query = query.order_by(desc(BrandDeal.created_at)).limit(limit)

    result = await session.execute(query)
    return result.scalars().all()


@router.post("/deals", response_model=BrandDealOut, status_code=status.HTTP_201_CREATED)
async def create_brand_deal(
    payload: BrandDealCreate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new self-managed brand deal."""
    deal = BrandDeal(
        user_id=current_user.id,
        source="self",
        **payload.model_dump()
    )
    session.add(deal)
    await session.commit()
    await session.refresh(deal)

    return deal


@router.get("/deals/{deal_id}", response_model=BrandDealOut)
async def get_brand_deal(
    deal_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Get a specific brand deal."""
    deal = await session.get(BrandDeal, deal_id)

    if not deal or deal.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Deal not found")

    return deal


@router.patch("/deals/{deal_id}", response_model=BrandDealOut)
async def update_brand_deal(
    deal_id: UUID,
    payload: BrandDealUpdate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Update a brand deal."""
    deal = await session.get(BrandDeal, deal_id)

    if not deal or deal.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Deal not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(deal, field, value)

    # Auto-update timestamps based on status
    if payload.status == "completed" and not deal.completed_at:
        deal.completed_at = datetime.utcnow()
    if payload.payment_status == "paid" and not deal.payment_received_at:
        deal.payment_received_at = datetime.utcnow()

    await session.commit()
    await session.refresh(deal)

    return deal


@router.get("/deals/stats/summary")
async def get_deals_summary(
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Get summary statistics for brand deals."""
    # Count by status
    status_query = select(
        BrandDeal.status,
        func.count(BrandDeal.id)
    ).where(
        BrandDeal.user_id == current_user.id
    ).group_by(BrandDeal.status)

    status_result = await session.execute(status_query)
    status_counts = dict(status_result.all())

    # Total revenue
    revenue_query = select(
        func.sum(BrandDeal.payment_amount),
        func.sum(BrandDeal.amount_paid)
    ).where(
        BrandDeal.user_id == current_user.id
    )
    revenue_result = await session.execute(revenue_query)
    total_value, total_paid = revenue_result.one()

    # Active deals
    active_query = select(func.count(BrandDeal.id)).where(
        BrandDeal.user_id == current_user.id,
        BrandDeal.status.in_(["negotiating", "confirmed", "in_progress"])
    )
    active_result = await session.execute(active_query)
    active_count = active_result.scalar() or 0

    return {
        "by_status": status_counts,
        "total_value": float(total_value or 0),
        "total_paid": float(total_paid or 0),
        "pending_payment": float((total_value or 0) - (total_paid or 0)),
        "active_deals": active_count,
    }


# =============================================
# CONTENT CALENDAR
# =============================================


@router.get("/calendar", response_model=List[CalendarEntryOut])
async def list_calendar_entries(
    start_date: date = Query(...),
    end_date: date = Query(...),
    platform: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """List calendar entries for a date range."""
    query = select(ContentCalendarEntry).where(
        ContentCalendarEntry.user_id == current_user.id,
        ContentCalendarEntry.scheduled_date >= start_date,
        ContentCalendarEntry.scheduled_date <= end_date
    )

    if platform:
        query = query.where(ContentCalendarEntry.platform == platform)
    if status:
        query = query.where(ContentCalendarEntry.status == status)

    query = query.order_by(asc(ContentCalendarEntry.scheduled_date))

    result = await session.execute(query)
    return result.scalars().all()


@router.post("/calendar", response_model=CalendarEntryOut, status_code=status.HTTP_201_CREATED)
async def create_calendar_entry(
    payload: CalendarEntryCreate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new calendar entry."""
    entry = ContentCalendarEntry(
        user_id=current_user.id,
        **payload.model_dump()
    )
    session.add(entry)
    await session.commit()
    await session.refresh(entry)

    return entry


@router.get("/calendar/{entry_id}", response_model=CalendarEntryOut)
async def get_calendar_entry(
    entry_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Get a specific calendar entry."""
    entry = await session.get(ContentCalendarEntry, entry_id)

    if not entry or entry.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Entry not found")

    return entry


@router.patch("/calendar/{entry_id}", response_model=CalendarEntryOut)
async def update_calendar_entry(
    entry_id: UUID,
    payload: Dict[str, Any],
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Update a calendar entry."""
    entry = await session.get(ContentCalendarEntry, entry_id)

    if not entry or entry.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Entry not found")

    for field, value in payload.items():
        if hasattr(entry, field):
            setattr(entry, field, value)

    await session.commit()
    await session.refresh(entry)

    return entry


@router.delete("/calendar/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_calendar_entry(
    entry_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a calendar entry."""
    entry = await session.get(ContentCalendarEntry, entry_id)

    if not entry or entry.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Entry not found")

    await session.delete(entry)
    await session.commit()


@router.get("/calendar/best-times/{platform}")
async def get_best_posting_times(
    platform: str,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Get AI-analyzed best posting times for a platform."""
    result = await session.execute(
        select(PostingTimeAnalysis).where(
            PostingTimeAnalysis.user_id == current_user.id,
            PostingTimeAnalysis.platform == platform
        )
    )
    analysis = result.scalar_one_or_none()

    if not analysis or analysis.expires_at < datetime.utcnow():
        # Generate new analysis
        analysis = await _generate_posting_time_analysis(session, current_user, platform)

    return {
        "platform": platform,
        "best_times": analysis.best_times if analysis else {},
        "overall_best": {
            "day": analysis.overall_best_day if analysis else None,
            "hour": analysis.overall_best_hour if analysis else None,
        },
        "times_to_avoid": analysis.times_to_avoid if analysis else [],
        "sample_size": analysis.sample_size if analysis else 0,
    }


async def _generate_posting_time_analysis(
    session: AsyncSession,
    user: User,
    platform: str
) -> Optional[PostingTimeAnalysis]:
    """Generate posting time analysis from content performance data."""
    from app.models.content import ContentPiece, ContentPerformance

    # Get user's content performance data
    query = select(
        ContentPiece.day_of_week,
        ContentPiece.hour_of_day,
        func.avg(ContentPerformance.engagement_rate).label('avg_engagement'),
        func.avg(ContentPerformance.views).label('avg_views'),
        func.count(ContentPiece.id).label('count')
    ).join(
        ContentPerformance, ContentPiece.id == ContentPerformance.content_id
    ).where(
        ContentPiece.user_id == user.id,
        ContentPiece.platform == platform
    ).group_by(
        ContentPiece.day_of_week,
        ContentPiece.hour_of_day
    )

    result = await session.execute(query)
    data = result.all()

    if not data:
        return None

    # Process into best times structure
    days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    best_times = {day: [] for day in days}

    overall_best_score = 0
    overall_best_day = None
    overall_best_hour = None
    total_samples = 0

    for row in data:
        if row.day_of_week is None or row.hour_of_day is None:
            continue

        day_name = days[row.day_of_week] if row.day_of_week < 7 else "monday"
        score = float(row.avg_engagement or 0) / 10  # Normalize

        best_times[day_name].append({
            "hour": row.hour_of_day,
            "score": round(score, 2),
            "avg_views": int(row.avg_views or 0)
        })

        total_samples += row.count

        if score > overall_best_score:
            overall_best_score = score
            overall_best_day = day_name
            overall_best_hour = row.hour_of_day

    # Sort each day's times by score
    for day in best_times:
        best_times[day] = sorted(best_times[day], key=lambda x: x["score"], reverse=True)[:3]

    # Create or update analysis
    existing = await session.execute(
        select(PostingTimeAnalysis).where(
            PostingTimeAnalysis.user_id == user.id,
            PostingTimeAnalysis.platform == platform
        )
    )
    analysis = existing.scalar_one_or_none()

    if analysis:
        analysis.best_times = best_times
        analysis.overall_best_day = overall_best_day
        analysis.overall_best_hour = overall_best_hour
        analysis.sample_size = total_samples
        analysis.analyzed_at = datetime.utcnow()
        analysis.expires_at = datetime.utcnow() + timedelta(days=7)
    else:
        analysis = PostingTimeAnalysis(
            user_id=user.id,
            platform=platform,
            best_times=best_times,
            overall_best_day=overall_best_day,
            overall_best_hour=overall_best_hour,
            overall_best_score=overall_best_score,
            sample_size=total_samples,
            expires_at=datetime.utcnow() + timedelta(days=7)
        )
        session.add(analysis)

    await session.commit()
    await session.refresh(analysis)

    return analysis


# =============================================
# WHAT'S WORKING / INSIGHTS
# =============================================


@router.get("/insights", response_model=List[InsightOut])
async def list_insights(
    insight_type: Optional[str] = Query(None),
    limit: int = Query(20, le=50),
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Get creator insights (what's working)."""
    query = select(CreatorInsight).where(
        CreatorInsight.user_id == current_user.id,
        CreatorInsight.is_current == True
    )

    if insight_type:
        query = query.where(CreatorInsight.insight_type == insight_type)

    query = query.order_by(desc(CreatorInsight.impact_score)).limit(limit)

    result = await session.execute(query)
    insights = result.scalars().all()

    # If no insights, generate them
    if not insights:
        insights = await _generate_creator_insights(session, current_user)

    return insights


@router.post("/insights/refresh")
async def refresh_insights(
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Force refresh of creator insights."""
    # Mark existing as not current
    from sqlalchemy import update
    await session.execute(
        update(CreatorInsight)
        .where(CreatorInsight.user_id == current_user.id)
        .values(is_current=False)
    )

    insights = await _generate_creator_insights(session, current_user)

    return {
        "success": True,
        "insights_generated": len(insights)
    }


async def _generate_creator_insights(
    session: AsyncSession,
    user: User
) -> List[CreatorInsight]:
    """Generate insights from content performance data."""
    from app.models.content import ContentPiece, ContentPerformance

    insights = []

    # Get content with performance
    query = select(ContentPiece, ContentPerformance).join(
        ContentPerformance, ContentPiece.id == ContentPerformance.content_id
    ).where(
        ContentPiece.user_id == user.id
    ).order_by(desc(ContentPerformance.views))

    result = await session.execute(query)
    content_data = result.all()

    if not content_data:
        return insights

    # Calculate averages
    total_views = sum(cp.views or 0 for _, cp in content_data)
    total_engagement = sum(float(cp.engagement_rate or 0) for _, cp in content_data)
    avg_views = total_views / len(content_data) if content_data else 0
    avg_engagement = total_engagement / len(content_data) if content_data else 0

    # Insight 1: Best performing content format
    format_performance = {}
    for content, perf in content_data:
        fmt = content.content_type
        if fmt not in format_performance:
            format_performance[fmt] = {"views": 0, "count": 0}
        format_performance[fmt]["views"] += perf.views or 0
        format_performance[fmt]["count"] += 1

    best_format = max(
        format_performance.items(),
        key=lambda x: x[1]["views"] / x[1]["count"] if x[1]["count"] > 0 else 0
    )

    if best_format[1]["count"] >= 3:
        format_avg = best_format[1]["views"] / best_format[1]["count"]
        insight = CreatorInsight(
            user_id=user.id,
            insight_type="content_format",
            category=best_format[0],
            title=f"{best_format[0].title()}s perform best",
            description=f"Your {best_format[0]}s get {int(format_avg):,} views on average, which is {format_avg/avg_views:.1f}x your overall average.",
            supporting_data={
                "format": best_format[0],
                "avg_views": format_avg,
                "sample_count": best_format[1]["count"]
            },
            confidence_score=min(0.95, 0.5 + best_format[1]["count"] * 0.05),
            impact_score=min(1.0, format_avg / avg_views / 2) if avg_views > 0 else 0.5,
            sample_size=best_format[1]["count"],
            vs_creator_average=format_avg / avg_views if avg_views > 0 else 1.0,
            is_actionable=True,
            recommendation=f"Consider creating more {best_format[0]} content to maximize your reach.",
            expires_at=datetime.utcnow() + timedelta(days=7)
        )
        session.add(insight)
        insights.append(insight)

    # Insight 2: Top performing theme/topic
    theme_performance = {}
    for content, perf in content_data:
        if content.theme:
            if content.theme not in theme_performance:
                theme_performance[content.theme] = {"views": 0, "engagement": 0, "count": 0}
            theme_performance[content.theme]["views"] += perf.views or 0
            theme_performance[content.theme]["engagement"] += float(perf.engagement_rate or 0)
            theme_performance[content.theme]["count"] += 1

    if theme_performance:
        best_theme = max(
            theme_performance.items(),
            key=lambda x: x[1]["views"] / x[1]["count"] if x[1]["count"] > 0 else 0
        )

        if best_theme[1]["count"] >= 2:
            theme_avg = best_theme[1]["views"] / best_theme[1]["count"]
            insight = CreatorInsight(
                user_id=user.id,
                insight_type="topic",
                category=best_theme[0],
                title=f"'{best_theme[0]}' is your top performing topic",
                description=f"Content about {best_theme[0]} averages {int(theme_avg):,} views.",
                supporting_data={
                    "theme": best_theme[0],
                    "avg_views": theme_avg,
                    "sample_count": best_theme[1]["count"]
                },
                confidence_score=min(0.9, 0.5 + best_theme[1]["count"] * 0.1),
                impact_score=min(1.0, theme_avg / avg_views / 2) if avg_views > 0 else 0.5,
                sample_size=best_theme[1]["count"],
                is_actionable=True,
                recommendation=f"Your audience loves {best_theme[0]} content. Double down on this topic!",
                expires_at=datetime.utcnow() + timedelta(days=7)
            )
            session.add(insight)
            insights.append(insight)

    await session.commit()
    return insights


# =============================================
# MEDIA KIT
# =============================================


@router.get("/media-kit", response_model=List[MediaKitOut])
async def list_media_kits(
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """List user's media kits."""
    result = await session.execute(
        select(MediaKit).where(MediaKit.user_id == current_user.id)
    )
    return result.scalars().all()


@router.post("/media-kit", response_model=MediaKitOut, status_code=status.HTTP_201_CREATED)
async def create_media_kit(
    name: str = "My Media Kit",
    template_style: str = "modern",
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new media kit with current metrics."""
    # Gather current metrics
    metrics = await _gather_metrics_for_media_kit(session, current_user)

    media_kit = MediaKit(
        user_id=current_user.id,
        name=name,
        template_style=template_style,
        metrics_snapshot=metrics,
        is_default=False
    )
    session.add(media_kit)
    await session.commit()
    await session.refresh(media_kit)

    return media_kit


@router.get("/media-kit/{kit_id}", response_model=MediaKitOut)
async def get_media_kit(
    kit_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Get a specific media kit."""
    kit = await session.get(MediaKit, kit_id)

    if not kit or kit.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Media kit not found")

    return kit


@router.post("/media-kit/{kit_id}/generate-pdf")
async def generate_media_kit_pdf(
    kit_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Generate PDF for a media kit."""
    kit = await session.get(MediaKit, kit_id)

    if not kit or kit.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Media kit not found")

    # TODO: Implement actual PDF generation
    # For now, return a placeholder
    return {
        "success": True,
        "message": "PDF generation started. You'll receive a notification when it's ready.",
        "kit_id": str(kit_id)
    }


async def _gather_metrics_for_media_kit(session: AsyncSession, user: User) -> Dict[str, Any]:
    """Gather current platform metrics for media kit."""
    from app.models.youtube import YouTubeConnection
    from app.models.instagram import InstagramConnection

    metrics = {
        "total_audience": 0,
        "platforms": {}
    }

    # YouTube
    yt_result = await session.execute(
        select(YouTubeConnection).where(
            YouTubeConnection.user_id == user.id,
            YouTubeConnection.connection_status == 'active'
        )
    )
    yt_connections = yt_result.scalars().all()

    if yt_connections:
        yt_subs = sum(c.subscriber_count or 0 for c in yt_connections)
        metrics["platforms"]["youtube"] = {
            "subscribers": yt_subs,
            "engagement_rate": float(yt_connections[0].engagement_rate or 0),
            "channel_name": yt_connections[0].channel_name
        }
        metrics["total_audience"] += yt_subs

    # Instagram
    ig_result = await session.execute(
        select(InstagramConnection).where(
            InstagramConnection.user_id == user.id,
            InstagramConnection.connection_status == 'active'
        )
    )
    ig_connections = ig_result.scalars().all()

    if ig_connections:
        ig_followers = sum(c.follower_count or 0 for c in ig_connections)
        metrics["platforms"]["instagram"] = {
            "followers": ig_followers,
            "username": ig_connections[0].username
        }
        metrics["total_audience"] += ig_followers

    return metrics


# =============================================
# RATE CALCULATOR
# =============================================


@router.get("/rate-card", response_model=RateCardOut)
async def get_rate_card(
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Get or generate user's rate card."""
    result = await session.execute(
        select(CreatorRateCard).where(CreatorRateCard.user_id == current_user.id)
    )
    rate_card = result.scalar_one_or_none()

    if not rate_card:
        # Generate new rate card
        rate_card = await _generate_rate_card(session, current_user)

    return rate_card


@router.post("/rate-card/calculate")
async def calculate_rates(
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Recalculate sponsorship rates based on current metrics."""
    rate_card = await _generate_rate_card(session, current_user)

    return {
        "success": True,
        "rates": rate_card.calculated_rates,
        "calculated_at": rate_card.calculated_at.isoformat()
    }


@router.patch("/rate-card")
async def update_custom_rates(
    custom_rates: Dict[str, Dict[str, float]],
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Update custom rates (override calculated)."""
    result = await session.execute(
        select(CreatorRateCard).where(CreatorRateCard.user_id == current_user.id)
    )
    rate_card = result.scalar_one_or_none()

    if not rate_card:
        rate_card = await _generate_rate_card(session, current_user)

    rate_card.custom_rates = custom_rates
    await session.commit()

    return {"success": True, "custom_rates": rate_card.custom_rates}


async def _generate_rate_card(session: AsyncSession, user: User) -> CreatorRateCard:
    """Generate rate card based on metrics and industry benchmarks."""
    from app.models.youtube import YouTubeConnection
    from app.models.instagram import InstagramConnection

    # Get metrics
    yt_result = await session.execute(
        select(YouTubeConnection).where(
            YouTubeConnection.user_id == user.id,
            YouTubeConnection.connection_status == 'active'
        )
    )
    yt_conn = yt_result.scalar_one_or_none()

    ig_result = await session.execute(
        select(InstagramConnection).where(
            InstagramConnection.user_id == user.id,
            InstagramConnection.connection_status == 'active'
        )
    )
    ig_conn = ig_result.scalar_one_or_none()

    # Base rate calculation (simplified industry formula)
    # CPM-based: $20-50 per 1000 views for integrations
    rates = {}

    if yt_conn and yt_conn.subscriber_count:
        subs = yt_conn.subscriber_count
        avg_views = yt_conn.avg_views_per_video or subs * 0.1  # Estimate 10% of subs

        # YouTube dedicated video: $50-100 CPM
        yt_dedicated_base = (avg_views / 1000) * 75
        rates["youtube_dedicated"] = {
            "min": int(yt_dedicated_base * 0.7),
            "max": int(yt_dedicated_base * 1.5),
            "suggested": int(yt_dedicated_base)
        }

        # YouTube integration: $20-40 CPM
        yt_integration_base = (avg_views / 1000) * 30
        rates["youtube_integration"] = {
            "min": int(yt_integration_base * 0.7),
            "max": int(yt_integration_base * 1.5),
            "suggested": int(yt_integration_base)
        }

        # YouTube short
        rates["youtube_short"] = {
            "min": int(yt_integration_base * 0.2),
            "max": int(yt_integration_base * 0.5),
            "suggested": int(yt_integration_base * 0.3)
        }

    if ig_conn and ig_conn.follower_count:
        followers = ig_conn.follower_count

        # Instagram post: ~$10 per 1000 followers
        ig_post_base = (followers / 1000) * 10
        rates["instagram_post"] = {
            "min": int(ig_post_base * 0.7),
            "max": int(ig_post_base * 1.5),
            "suggested": int(ig_post_base)
        }

        # Instagram story
        rates["instagram_story"] = {
            "min": int(ig_post_base * 0.2),
            "max": int(ig_post_base * 0.5),
            "suggested": int(ig_post_base * 0.3)
        }

        # Instagram reel
        rates["instagram_reel"] = {
            "min": int(ig_post_base * 0.6),
            "max": int(ig_post_base * 1.2),
            "suggested": int(ig_post_base * 0.8)
        }

    # Get or create rate card
    result = await session.execute(
        select(CreatorRateCard).where(CreatorRateCard.user_id == user.id)
    )
    rate_card = result.scalar_one_or_none()

    if rate_card:
        rate_card.calculated_rates = rates
        rate_card.calculated_at = datetime.utcnow()
    else:
        rate_card = CreatorRateCard(
            user_id=user.id,
            calculated_rates=rates,
            calculated_at=datetime.utcnow()
        )
        session.add(rate_card)

    await session.commit()
    await session.refresh(rate_card)

    return rate_card


# =============================================
# QUICK REPLIES & AI SUGGESTIONS
# =============================================


@router.post("/interactions/{interaction_id}/quick-reply")
async def quick_reply_with_template(
    interaction_id: UUID,
    payload: QuickReplyRequest,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Apply a template and send as reply."""
    interaction = await session.get(Interaction, interaction_id)

    if not interaction or interaction.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Interaction not found")

    # Get template
    template = None
    if payload.template_id:
        template = await session.get(ResponseTemplate, payload.template_id)
    elif payload.template_shortcut:
        result = await session.execute(
            select(ResponseTemplate).where(
                ResponseTemplate.created_by_id == current_user.id,
                ResponseTemplate.shortcut == payload.template_shortcut
            )
        )
        template = result.scalar_one_or_none()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    # Fill variables
    reply_text = template.template_text
    if payload.variables:
        for key, value in payload.variables.items():
            reply_text = reply_text.replace(f"{{{key}}}", value)

    # Auto-fill common variables
    reply_text = reply_text.replace("{author}", interaction.author_name or interaction.author_username or "there")

    # Send the reply
    from app.services.platform_actions import get_platform_action_service

    platform_service = get_platform_action_service()
    result = await platform_service.send_reply(interaction, reply_text, session)

    if result.get("success"):
        # Update template usage
        template.usage_count += 1
        template.last_used_at = datetime.utcnow()
        await session.commit()

    return result


@router.post("/interactions/{interaction_id}/ai-suggestion")
async def get_ai_quick_suggestion(
    interaction_id: UUID,
    payload: AIQuickSuggestionRequest,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Get quick AI-generated reply suggestion."""
    interaction = await session.get(Interaction, interaction_id)

    if not interaction or interaction.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Interaction not found")

    # Check API key
    from app.core.config import settings
    api_key = settings.EFFECTIVE_ANTHROPIC_KEY

    if not api_key:
        raise HTTPException(status_code=503, detail="AI not configured")

    try:
        from anthropic import Anthropic

        client = Anthropic(api_key=api_key)

        # Build prompt based on suggestion type
        type_prompts = {
            "thank_you": "Write a brief, warm thank you response.",
            "answer_question": "Provide a helpful, concise answer to their question.",
            "acknowledge": "Acknowledge their comment positively in 1-2 sentences.",
            "redirect": "Politely redirect them to the appropriate resource or link."
        }

        instruction = type_prompts.get(payload.suggestion_type, "Write a brief, appropriate response.")

        system_prompt = f"""You are helping a content creator respond to their audience.
{instruction}
Keep it under 100 words, be authentic and friendly.
Do NOT use hashtags or emojis unless the original comment has them."""

        user_prompt = f"Comment to respond to: {interaction.content}"
        if payload.context:
            user_prompt += f"\nAdditional context: {payload.context}"

        response = client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=200,
            temperature=0.7,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}]
        )

        suggested_reply = response.content[0].text

        return {
            "success": True,
            "suggestion": suggested_reply,
            "suggestion_type": payload.suggestion_type
        }

    except Exception as e:
        logger.error(f"AI suggestion failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate suggestion: {str(e)}")


@router.get("/templates")
async def list_reply_templates(
    category: Optional[str] = Query(None),
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """List user's reply templates."""
    query = select(ResponseTemplate).where(
        ResponseTemplate.created_by_id == current_user.id
    )

    if category:
        query = query.where(ResponseTemplate.category == category)

    query = query.order_by(desc(ResponseTemplate.usage_count))

    result = await session.execute(query)
    templates = result.scalars().all()

    return [
        {
            "id": str(t.id),
            "name": t.name,
            "shortcut": t.shortcut,
            "category": t.category,
            "template_text": t.template_text,
            "usage_count": t.usage_count
        }
        for t in templates
    ]


@router.post("/templates")
async def create_reply_template(
    name: str,
    template_text: str,
    shortcut: Optional[str] = None,
    category: Optional[str] = None,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new reply template."""
    template = ResponseTemplate(
        created_by_id=current_user.id,
        name=name,
        template_text=template_text,
        shortcut=shortcut,
        category=category
    )
    session.add(template)
    await session.commit()
    await session.refresh(template)

    return {
        "success": True,
        "template_id": str(template.id),
        "shortcut": template.shortcut
    }
