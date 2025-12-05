"""
Agency dashboard endpoints.

Provides dashboard widgets data: stats, action items, deadlines, activity, etc.
"""

from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from loguru import logger
from sqlalchemy import select, func, and_, or_, case
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_async_session
from app.core.security import get_current_user
from app.models.user import User
from app.models.agency_campaign import AgencyCampaign, CampaignDeliverable, AgencyDeal
from app.models.agency_finance import AgencyInvoice, CreatorPayout, AgencyCreatorProfile
from app.models.agency_notification import AgencyActivity, AgencyNotification, AgencyTask
from app.schemas.agency_dashboard import (
    DashboardStats,
    ActionRequiredItem,
    UpcomingDeadline,
    ActivityItem,
    FinancialStats,
    PipelineStats,
    PipelineStageStats,
    NotificationResponse,
    TaskResponse,
    TaskCreate,
    TaskUpdate,
    TaskStatus,
    SearchResults,
    SearchResult,
)

router = APIRouter()


# ============================================
# Helper Functions
# ============================================

async def get_user_agency_id(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
) -> UUID:
    """Get the agency ID for the current agency user."""
    if current_user.account_type != "agency":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Agency account required",
        )

    from app.models.agency import AgencyMember
    result = await db.execute(
        select(AgencyMember.agency_id).where(
            AgencyMember.user_id == current_user.id,
            AgencyMember.status == "active"
        )
    )
    agency_id = result.scalar_one_or_none()

    if not agency_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No agency found for user",
        )
    return agency_id


# ============================================
# Dashboard Stats
# ============================================

@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    agency_id: UUID = Depends(get_user_agency_id),
    db: AsyncSession = Depends(get_async_session),
) -> Any:
    """Get overview statistics for the dashboard."""
    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # Active campaigns count
    result = await db.execute(
        select(func.count(AgencyCampaign.id)).where(
            AgencyCampaign.agency_id == agency_id,
            AgencyCampaign.status.in_(['scheduled', 'in_progress']),
        )
    )
    active_campaigns = result.scalar() or 0

    # Total creators
    result = await db.execute(
        select(func.count(AgencyCreatorProfile.id)).where(
            AgencyCreatorProfile.agency_id == agency_id,
            AgencyCreatorProfile.relationship_status == 'active',
        )
    )
    total_creators = result.scalar() or 0

    # If no creator profiles yet, fall back to agency_members with creator role
    if total_creators == 0:
        from app.models.agency import AgencyMember
        from app.models.user import User as UserModel
        result = await db.execute(
            select(func.count(AgencyMember.id))
            .join(UserModel, AgencyMember.user_id == UserModel.id)
            .where(
                AgencyMember.agency_id == agency_id,
                AgencyMember.status == 'active',
                UserModel.account_type == 'creator',
            )
        )
        total_creators = result.scalar() or 0

    # Revenue this month
    result = await db.execute(
        select(func.coalesce(func.sum(AgencyInvoice.paid_amount), 0)).where(
            AgencyInvoice.agency_id == agency_id,
            AgencyInvoice.status == 'paid',
            AgencyInvoice.paid_at >= month_start,
        )
    )
    revenue_this_month = result.scalar() or Decimal("0")

    # Pipeline value (all non-completed/lost deals)
    result = await db.execute(
        select(func.coalesce(func.sum(AgencyDeal.value), 0)).where(
            AgencyDeal.agency_id == agency_id,
            AgencyDeal.stage.notin_(['completed', 'lost']),
        )
    )
    pipeline_value = result.scalar() or Decimal("0")

    # Completion rate (deliverables completed / total this month)
    result = await db.execute(
        select(
            func.count(case((CampaignDeliverable.status.in_(['completed', 'approved']), 1))),
            func.count(CampaignDeliverable.id),
        )
        .join(AgencyCampaign)
        .where(
            AgencyCampaign.agency_id == agency_id,
            CampaignDeliverable.created_at >= month_start,
        )
    )
    row = result.one()
    completed = row[0] or 0
    total = row[1] or 0
    completion_rate = (completed / total * 100) if total > 0 else 100.0

    return DashboardStats(
        total_active_campaigns=active_campaigns,
        total_creators=total_creators,
        revenue_this_month=revenue_this_month,
        pipeline_value=pipeline_value,
        completion_rate=round(completion_rate, 1),
    )


# ============================================
# Action Required
# ============================================

@router.get("/action-required", response_model=List[ActionRequiredItem])
async def get_action_required(
    agency_id: UUID = Depends(get_user_agency_id),
    db: AsyncSession = Depends(get_async_session),
) -> Any:
    """Get items requiring immediate attention."""
    now = datetime.utcnow()
    today_end = now.replace(hour=23, minute=59, second=59)
    week_end = now + timedelta(days=7)
    items = []

    # Overdue deliverables
    result = await db.execute(
        select(CampaignDeliverable)
        .join(AgencyCampaign)
        .where(
            AgencyCampaign.agency_id == agency_id,
            CampaignDeliverable.status.notin_(['completed', 'approved', 'cancelled']),
            CampaignDeliverable.due_date < now,
        )
        .order_by(CampaignDeliverable.due_date.asc())
        .limit(10)
    )
    for d in result.scalars().all():
        days_overdue = (now - d.due_date).days
        items.append(ActionRequiredItem(
            id=str(d.id),
            type="deliverable",
            title=d.title,
            description=f"Overdue by {days_overdue} day(s)",
            urgency="overdue",
            days_overdue=days_overdue,
            action_url=f"/agency/campaigns/{d.campaign_id}",
            quick_action="complete",
        ))

    # Overdue invoices
    result = await db.execute(
        select(AgencyInvoice).where(
            AgencyInvoice.agency_id == agency_id,
            AgencyInvoice.status == 'overdue',
        )
        .order_by(AgencyInvoice.due_date.asc())
        .limit(5)
    )
    for inv in result.scalars().all():
        days_overdue = (now - inv.due_date).days
        items.append(ActionRequiredItem(
            id=str(inv.id),
            type="invoice",
            title=f"Invoice #{inv.invoice_number} - {inv.brand_name}",
            description=f"Overdue by {days_overdue} day(s)",
            urgency="overdue",
            days_overdue=days_overdue,
            action_url=f"/agency/finance?invoice={inv.id}",
            quick_action="send_reminder",
        ))

    # Due today deliverables
    result = await db.execute(
        select(CampaignDeliverable)
        .join(AgencyCampaign)
        .where(
            AgencyCampaign.agency_id == agency_id,
            CampaignDeliverable.status.notin_(['completed', 'approved', 'cancelled']),
            CampaignDeliverable.due_date >= now,
            CampaignDeliverable.due_date <= today_end,
        )
        .limit(10)
    )
    for d in result.scalars().all():
        items.append(ActionRequiredItem(
            id=str(d.id),
            type="deliverable",
            title=d.title,
            description="Due today",
            urgency="due_today",
            action_url=f"/agency/campaigns/{d.campaign_id}",
            quick_action="complete",
        ))

    # Pending payouts
    result = await db.execute(
        select(CreatorPayout)
        .options(selectinload(CreatorPayout.creator))
        .where(
            CreatorPayout.agency_id == agency_id,
            CreatorPayout.status == 'pending',
            CreatorPayout.due_date <= week_end,
        )
        .limit(5)
    )
    for p in result.scalars().all():
        creator_name = p.creator.full_name if p.creator else "Creator"
        urgency = "overdue" if p.due_date < now else "due_this_week"
        items.append(ActionRequiredItem(
            id=str(p.id),
            type="payment",
            title=f"Payout to {creator_name}",
            description=f"{p.currency} {p.amount} for {p.campaign_name or 'Campaign'}",
            creator_name=creator_name,
            urgency=urgency,
            action_url=f"/agency/finance?tab=payouts",
            quick_action="mark_paid",
        ))

    # Sort by urgency
    urgency_order = {"overdue": 0, "due_today": 1, "due_this_week": 2}
    items.sort(key=lambda x: urgency_order.get(x.urgency, 3))

    return items[:15]


# ============================================
# Upcoming Deadlines
# ============================================

@router.get("/deadlines", response_model=List[UpcomingDeadline])
async def get_upcoming_deadlines(
    days: int = Query(default=7, ge=1, le=30),
    agency_id: UUID = Depends(get_user_agency_id),
    db: AsyncSession = Depends(get_async_session),
) -> Any:
    """Get upcoming deadlines for the next N days."""
    now = datetime.utcnow()
    end_date = now + timedelta(days=days)
    deadlines = []

    # Content posting dates
    result = await db.execute(
        select(AgencyCampaign).where(
            AgencyCampaign.agency_id == agency_id,
            AgencyCampaign.status.in_(['scheduled', 'in_progress']),
            AgencyCampaign.posting_date >= now,
            AgencyCampaign.posting_date <= end_date,
        )
        .order_by(AgencyCampaign.posting_date.asc())
    )
    for c in result.scalars().all():
        deadlines.append(UpcomingDeadline(
            id=str(c.id),
            date=c.posting_date,
            type="content_posting",
            title=c.title,
            campaign_name=c.title,
            brand_name=c.brand_name,
            is_overdue=c.posting_date < now,
        ))

    # Deliverable due dates
    result = await db.execute(
        select(CampaignDeliverable)
        .join(AgencyCampaign)
        .options(selectinload(CampaignDeliverable.campaign))
        .where(
            AgencyCampaign.agency_id == agency_id,
            CampaignDeliverable.status.notin_(['completed', 'approved', 'cancelled']),
            CampaignDeliverable.due_date >= now - timedelta(days=7),  # Include recent overdue
            CampaignDeliverable.due_date <= end_date,
        )
        .order_by(CampaignDeliverable.due_date.asc())
    )
    for d in result.scalars().all():
        deadlines.append(UpcomingDeadline(
            id=str(d.id),
            date=d.due_date,
            type="deliverable",
            title=d.title,
            campaign_name=d.campaign.title if d.campaign else None,
            is_overdue=d.due_date < now,
        ))

    # Invoice due dates
    result = await db.execute(
        select(AgencyInvoice).where(
            AgencyInvoice.agency_id == agency_id,
            AgencyInvoice.status.in_(['sent', 'viewed', 'overdue']),
            AgencyInvoice.due_date >= now - timedelta(days=7),
            AgencyInvoice.due_date <= end_date,
        )
        .order_by(AgencyInvoice.due_date.asc())
    )
    for inv in result.scalars().all():
        deadlines.append(UpcomingDeadline(
            id=str(inv.id),
            date=inv.due_date,
            type="payment",
            title=f"Invoice #{inv.invoice_number}",
            brand_name=inv.brand_name,
            amount=inv.total_amount,
            is_overdue=inv.due_date < now,
        ))

    # Sort by date
    deadlines.sort(key=lambda x: x.date)

    return deadlines[:20]


# ============================================
# Activity Feed
# ============================================

@router.get("/activity", response_model=List[ActivityItem])
async def get_recent_activity(
    limit: int = Query(default=20, ge=1, le=50),
    agency_id: UUID = Depends(get_user_agency_id),
    db: AsyncSession = Depends(get_async_session),
) -> Any:
    """Get recent activity feed."""
    result = await db.execute(
        select(AgencyActivity)
        .where(AgencyActivity.agency_id == agency_id)
        .order_by(AgencyActivity.created_at.desc())
        .limit(limit)
    )
    activities = result.scalars().all()

    return [
        ActivityItem(
            id=str(a.id),
            type=a.action,
            description=a.description,
            actor_name=a.actor_name or "System",
            actor_avatar=None,  # Could fetch from user
            timestamp=a.created_at,
            link_url=None,  # Could build from entity_type/entity_id
            metadata=a.metadata,
        )
        for a in activities
    ]


# ============================================
# Pipeline Summary
# ============================================

@router.get("/pipeline", response_model=PipelineStats)
async def get_pipeline_summary(
    agency_id: UUID = Depends(get_user_agency_id),
    db: AsyncSession = Depends(get_async_session),
) -> Any:
    """Get pipeline statistics."""
    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    month_end = (month_start + timedelta(days=32)).replace(day=1) - timedelta(seconds=1)

    # By stage stats
    result = await db.execute(
        select(
            AgencyDeal.stage,
            func.count(AgencyDeal.id),
            func.coalesce(func.sum(AgencyDeal.value), 0),
        )
        .where(AgencyDeal.agency_id == agency_id)
        .group_by(AgencyDeal.stage)
    )
    by_stage = {}
    total_value = Decimal("0")
    total_count = 0

    for row in result.all():
        stage, count, value = row
        by_stage[stage] = PipelineStageStats(count=count, value=value)
        if stage not in ['completed', 'lost']:
            total_value += value
            total_count += count

    # Deals closing this month
    result = await db.execute(
        select(
            func.count(AgencyDeal.id),
            func.coalesce(func.sum(AgencyDeal.value), 0),
        )
        .where(
            AgencyDeal.agency_id == agency_id,
            AgencyDeal.stage.notin_(['completed', 'lost']),
            AgencyDeal.expected_close_date >= month_start,
            AgencyDeal.expected_close_date <= month_end,
        )
    )
    row = result.one()
    closing_count = row[0] or 0
    closing_value = row[1] or Decimal("0")

    # Win rate this month
    result = await db.execute(
        select(
            func.count(case((AgencyDeal.stage == 'completed', 1))),
            func.count(AgencyDeal.id),
        )
        .where(
            AgencyDeal.agency_id == agency_id,
            AgencyDeal.stage.in_(['completed', 'lost']),
            AgencyDeal.updated_at >= month_start,
        )
    )
    row = result.one()
    won = row[0] or 0
    total_closed = row[1] or 0
    win_rate = (won / total_closed * 100) if total_closed > 0 else 0

    # Stagnant deals (no movement in 14+ days)
    stagnant_threshold = now - timedelta(days=14)
    result = await db.execute(
        select(func.count(AgencyDeal.id)).where(
            AgencyDeal.agency_id == agency_id,
            AgencyDeal.stage.notin_(['completed', 'lost']),
            AgencyDeal.updated_at < stagnant_threshold,
        )
    )
    stagnant_count = result.scalar() or 0

    avg_deal_size = (total_value / total_count) if total_count > 0 else Decimal("0")

    return PipelineStats(
        total_value=total_value,
        avg_deal_size=avg_deal_size,
        deals_closing_this_month=closing_count,
        deals_closing_this_month_value=closing_value,
        win_rate_this_month=round(win_rate, 1),
        stagnant_deals=stagnant_count,
        by_stage=by_stage,
    )


# ============================================
# Notifications
# ============================================

@router.get("/notifications", response_model=List[NotificationResponse])
async def get_notifications(
    unread_only: bool = False,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    agency_id: UUID = Depends(get_user_agency_id),
    db: AsyncSession = Depends(get_async_session),
) -> Any:
    """Get notifications for the current user."""
    query = (
        select(AgencyNotification)
        .where(
            AgencyNotification.agency_id == agency_id,
            AgencyNotification.user_id == current_user.id,
        )
    )

    if unread_only:
        query = query.where(AgencyNotification.is_read == False)

    query = query.order_by(AgencyNotification.created_at.desc()).offset(offset).limit(limit)

    result = await db.execute(query)
    notifications = result.scalars().all()

    return [
        NotificationResponse(
            id=n.id,
            type=n.type,
            title=n.title,
            description=n.description,
            link_url=n.link_url,
            is_read=n.is_read,
            is_actioned=n.is_actioned,
            priority=n.priority,
            created_at=n.created_at,
            metadata=n.metadata,
        )
        for n in notifications
    ]


@router.get("/notifications/unread-count")
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    agency_id: UUID = Depends(get_user_agency_id),
    db: AsyncSession = Depends(get_async_session),
) -> Any:
    """Get count of unread notifications."""
    result = await db.execute(
        select(func.count(AgencyNotification.id)).where(
            AgencyNotification.agency_id == agency_id,
            AgencyNotification.user_id == current_user.id,
            AgencyNotification.is_read == False,
        )
    )
    count = result.scalar() or 0
    return {"count": count}


@router.post("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: UUID,
    current_user: User = Depends(get_current_user),
    agency_id: UUID = Depends(get_user_agency_id),
    db: AsyncSession = Depends(get_async_session),
) -> Any:
    """Mark a notification as read."""
    result = await db.execute(
        select(AgencyNotification).where(
            AgencyNotification.id == notification_id,
            AgencyNotification.agency_id == agency_id,
            AgencyNotification.user_id == current_user.id,
        )
    )
    notification = result.scalar_one_or_none()

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )

    notification.is_read = True
    notification.read_at = datetime.utcnow()
    await db.commit()

    return {"message": "Notification marked as read"}


@router.post("/notifications/mark-all-read")
async def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    agency_id: UUID = Depends(get_user_agency_id),
    db: AsyncSession = Depends(get_async_session),
) -> Any:
    """Mark all notifications as read."""
    from sqlalchemy import update
    await db.execute(
        update(AgencyNotification)
        .where(
            AgencyNotification.agency_id == agency_id,
            AgencyNotification.user_id == current_user.id,
            AgencyNotification.is_read == False,
        )
        .values(is_read=True, read_at=datetime.utcnow())
    )
    await db.commit()
    return {"message": "All notifications marked as read"}


# ============================================
# Search
# ============================================

@router.get("/search", response_model=SearchResults)
async def search_agency(
    q: str = Query(..., min_length=1),
    types: Optional[List[str]] = Query(None),
    limit: int = Query(default=10, ge=1, le=50),
    agency_id: UUID = Depends(get_user_agency_id),
    db: AsyncSession = Depends(get_async_session),
) -> Any:
    """Search across agency data."""
    results = SearchResults()
    search_types = types or ['campaigns', 'creators', 'brands', 'invoices', 'deals']
    search_term = f"%{q}%"

    if 'campaigns' in search_types:
        result = await db.execute(
            select(AgencyCampaign)
            .where(
                AgencyCampaign.agency_id == agency_id,
                or_(
                    AgencyCampaign.title.ilike(search_term),
                    AgencyCampaign.brand_name.ilike(search_term),
                )
            )
            .limit(limit)
        )
        for c in result.scalars().all():
            results.campaigns.append(SearchResult(
                id=str(c.id),
                type="campaign",
                title=c.title,
                subtitle=c.brand_name,
                status=c.status,
            ))

    if 'creators' in search_types:
        result = await db.execute(
            select(AgencyCreatorProfile)
            .options(selectinload(AgencyCreatorProfile.creator))
            .where(
                AgencyCreatorProfile.agency_id == agency_id,
                or_(
                    AgencyCreatorProfile.display_name.ilike(search_term),
                    AgencyCreatorProfile.contact_email.ilike(search_term),
                )
            )
            .limit(limit)
        )
        for p in result.scalars().all():
            name = p.display_name or (p.creator.full_name if p.creator else "Unknown")
            results.creators.append(SearchResult(
                id=str(p.id),
                type="creator",
                title=name,
                subtitle=p.contact_email,
            ))

    if 'invoices' in search_types:
        result = await db.execute(
            select(AgencyInvoice)
            .where(
                AgencyInvoice.agency_id == agency_id,
                or_(
                    AgencyInvoice.invoice_number.ilike(search_term),
                    AgencyInvoice.brand_name.ilike(search_term),
                )
            )
            .limit(limit)
        )
        for inv in result.scalars().all():
            results.invoices.append(SearchResult(
                id=str(inv.id),
                type="invoice",
                title=f"#{inv.invoice_number}",
                subtitle=inv.brand_name,
                status=inv.status,
            ))

    if 'deals' in search_types:
        result = await db.execute(
            select(AgencyDeal)
            .where(
                AgencyDeal.agency_id == agency_id,
                or_(
                    AgencyDeal.brand_name.ilike(search_term),
                    AgencyDeal.title.ilike(search_term),
                )
            )
            .limit(limit)
        )
        for d in result.scalars().all():
            results.deals.append(SearchResult(
                id=str(d.id),
                type="deal",
                title=d.title or d.brand_name,
                subtitle=d.brand_name if d.title else None,
                status=d.stage,
            ))

    results.total_count = (
        len(results.campaigns) +
        len(results.creators) +
        len(results.invoices) +
        len(results.deals)
    )

    return results
