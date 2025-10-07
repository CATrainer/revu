"""Analytics endpoints for interactions and workflows."""
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, and_, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.core.security import get_current_active_user
from app.models.user import User
from app.models.interaction import Interaction
from app.models.workflow import Workflow
from app.models.response_queue import ResponseQueue

router = APIRouter()


@router.get("/analytics/overview")
async def get_analytics_overview(
    days: int = Query(30, ge=1, le=365),
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Get overview analytics for interactions."""
    
    cutoff = datetime.utcnow() - timedelta(days=days)
    
    # Total interactions
    total_stmt = select(func.count(Interaction.id)).where(
        and_(
            Interaction.user_id == current_user.id,
            Interaction.created_at >= cutoff
        )
    )
    total_result = await session.execute(total_stmt)
    total_interactions = total_result.scalar()
    
    # By status
    status_stmt = select(
        Interaction.status,
        func.count(Interaction.id)
    ).where(
        and_(
            Interaction.user_id == current_user.id,
            Interaction.created_at >= cutoff
        )
    ).group_by(Interaction.status)
    
    status_result = await session.execute(status_stmt)
    status_counts = {status: count for status, count in status_result.all()}
    
    # By platform
    platform_stmt = select(
        Interaction.platform,
        func.count(Interaction.id)
    ).where(
        and_(
            Interaction.user_id == current_user.id,
            Interaction.created_at >= cutoff
        )
    ).group_by(Interaction.platform)
    
    platform_result = await session.execute(platform_stmt)
    platform_counts = {platform: count for platform, count in platform_result.all()}
    
    # By sentiment
    sentiment_stmt = select(
        Interaction.sentiment,
        func.count(Interaction.id)
    ).where(
        and_(
            Interaction.user_id == current_user.id,
            Interaction.created_at >= cutoff
        )
    ).group_by(Interaction.sentiment)
    
    sentiment_result = await session.execute(sentiment_stmt)
    sentiment_counts = {sentiment: count for sentiment, count in sentiment_result.all() if sentiment}
    
    # Avg response time (answered only)
    # Simplified: assume responded_at exists
    # In production, calculate from created_at to responded_at
    
    return {
        'period_days': days,
        'total_interactions': total_interactions,
        'by_status': status_counts,
        'by_platform': platform_counts,
        'by_sentiment': sentiment_counts,
        'response_rate': status_counts.get('answered', 0) / total_interactions if total_interactions > 0 else 0,
    }


@router.get("/analytics/workflows")
async def get_workflow_analytics(
    days: int = Query(30, ge=1, le=365),
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Get workflow performance analytics."""
    
    cutoff = datetime.utcnow() - timedelta(days=days)
    
    # Get all workflows
    workflows_stmt = select(Workflow).where(
        Workflow.created_by_id == current_user.id
    )
    workflows_result = await session.execute(workflows_stmt)
    workflows = list(workflows_result.scalars().all())
    
    workflow_stats = []
    
    for workflow in workflows:
        # Count interactions triggered by this workflow
        triggered_stmt = select(func.count(Interaction.id)).where(
            and_(
                Interaction.workflow_id == workflow.id,
                Interaction.created_at >= cutoff
            )
        )
        triggered_result = await session.execute(triggered_stmt)
        triggered_count = triggered_result.scalar()
        
        # Count auto-responded
        auto_responded_stmt = select(func.count(Interaction.id)).where(
            and_(
                Interaction.workflow_id == workflow.id,
                Interaction.workflow_action == 'auto_responded',
                Interaction.created_at >= cutoff
            )
        )
        auto_responded_result = await session.execute(auto_responded_stmt)
        auto_responded_count = auto_responded_result.scalar()
        
        # Count flagged for approval
        flagged_stmt = select(func.count(Interaction.id)).where(
            and_(
                Interaction.workflow_id == workflow.id,
                Interaction.workflow_action == 'flagged_for_approval',
                Interaction.created_at >= cutoff
            )
        )
        flagged_result = await session.execute(flagged_stmt)
        flagged_count = flagged_result.scalar()
        
        workflow_stats.append({
            'workflow_id': str(workflow.id),
            'workflow_name': workflow.name,
            'status': workflow.status,
            'triggered_count': triggered_count,
            'auto_responded_count': auto_responded_count,
            'flagged_count': flagged_count,
        })
    
    return {
        'period_days': days,
        'workflows': workflow_stats,
    }


@router.get("/analytics/response-queue")
async def get_response_queue_analytics(
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Get response queue statistics."""
    
    from app.services.response_queue_service import ResponseQueueService
    
    stats = await ResponseQueueService.get_queue_stats(
        session,
        current_user.id
    )
    
    # Add per-platform stats
    platforms = ['youtube', 'instagram', 'tiktok', 'twitter']
    platform_stats = {}
    
    for platform in platforms:
        platform_stats[platform] = await ResponseQueueService.get_queue_stats(
            session,
            current_user.id,
            platform
        )
    
    return {
        'overall': stats,
        'by_platform': platform_stats,
    }


@router.get("/analytics/timeline")
async def get_interactions_timeline(
    days: int = Query(30, ge=1, le=365),
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Get interactions over time for charts."""
    
    cutoff = datetime.utcnow() - timedelta(days=days)
    
    # Group by date
    stmt = select(
        func.date(Interaction.created_at).label('date'),
        func.count(Interaction.id).label('count')
    ).where(
        and_(
            Interaction.user_id == current_user.id,
            Interaction.created_at >= cutoff
        )
    ).group_by(func.date(Interaction.created_at)).order_by('date')
    
    result = await session.execute(stmt)
    timeline = [{'date': str(date), 'count': count} for date, count in result.all()]
    
    return {
        'period_days': days,
        'timeline': timeline,
    }
