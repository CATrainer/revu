"""Demo mode endpoints."""
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID
import httpx

from app.core.database import get_async_session
from app.core.security import get_current_active_user
from app.models.user import User
from app.models.content import ContentPiece, ContentPerformance, ContentInsight, ContentTheme
from app.core.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)


class DemoConfigRequest(BaseModel):
    profile_type: str  # 'auto' or 'manual'
    niche: Optional[str] = 'tech_reviews'
    personality: Optional[str] = 'friendly_professional'
    
    # YouTube config
    yt_subscribers: Optional[int] = 100000
    yt_avg_views: Optional[int] = 50000
    yt_upload_frequency: Optional[str] = 'daily'
    
    # Instagram config
    ig_followers: Optional[int] = 50000
    ig_post_frequency: Optional[str] = 'daily'
    
    # TikTok config
    tt_followers: Optional[int] = 200000
    tt_post_frequency: Optional[str] = 'daily'
    
    # Activity
    comment_volume: Optional[str] = 'medium'
    dm_frequency: Optional[str] = 'medium'


@router.post("/demo/enable")
async def enable_demo_mode(
    config: DemoConfigRequest,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Enable demo mode for the current user."""
    
    # Check current status
    if current_user.demo_mode_status in ('enabled', 'enabling'):
        raise HTTPException(400, f"Demo mode already {current_user.demo_mode_status}")
    
    # Immediately update status to 'enabling'
    current_user.demo_mode_status = 'enabling'
    current_user.demo_mode_error = None
    await session.commit()
    
    # Create background job
    from app.services.background_jobs import BackgroundJobService
    job_service = BackgroundJobService(session)
    job = await job_service.create_job(
        job_type='demo_enable',
        user_id=current_user.id,
    )
    
    # Queue Celery task
    from app.tasks.demo_operations import enable_demo_mode_task
    enable_demo_mode_task.delay(str(current_user.id), str(job.id))
    
    return {
        "status": "enabling",
        "job_id": str(job.id),
        "message": "Demo mode is being enabled. This may take a minute.",
    }


@router.post("/demo/disable")
async def disable_demo_mode(
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Disable demo mode for the current user."""
    
    if current_user.demo_mode_status not in ('enabled', 'failed'):
        raise HTTPException(400, f"Cannot disable demo mode with status: {current_user.demo_mode_status}")
    
    # Immediately update status to 'disabling'
    current_user.demo_mode_status = 'disabling'
    current_user.demo_mode_error = None
    await session.commit()
    
    # Create background job
    from app.services.background_jobs import BackgroundJobService
    job_service = BackgroundJobService(session)
    job = await job_service.create_job(
        job_type='demo_disable',
        user_id=current_user.id,
    )
    
    # Queue Celery task
    from app.tasks.demo_operations import disable_demo_mode_task
    disable_demo_mode_task.delay(str(current_user.id), str(job.id))
    
    return {
        "status": "disabling",
        "job_id": str(job.id),
        "message": "Demo mode is being disabled. This may take a minute.",
    }


@router.get("/demo/status")
async def get_demo_status(
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Get demo mode status for current user."""
    
    status_data = {
        "demo_mode": current_user.demo_mode_status == 'enabled',  # Backward compat
        "status": current_user.demo_mode_status,
        "error": current_user.demo_mode_error,
        "user_id": str(current_user.id),
    }
    
    # If enabling or disabling, get the latest job status
    if current_user.demo_mode_status in ('enabling', 'disabling'):
        from app.services.background_jobs import BackgroundJobService
        job_service = BackgroundJobService(session)
        
        job_type = 'demo_enable' if current_user.demo_mode_status == 'enabling' else 'demo_disable'
        latest_job = await job_service.get_latest_job(
            user_id=current_user.id,
            job_type=job_type,
        )
        
        if latest_job:
            status_data["job_id"] = str(latest_job.id)
            status_data["job_status"] = latest_job.status
            status_data["job_error"] = latest_job.error_message
    
    # If enabled, get profile info from demo service
    if current_user.demo_mode_status == 'enabled':
        demo_service_url = getattr(settings, 'DEMO_SERVICE_URL', None)
        
        if demo_service_url:
            async with httpx.AsyncClient(timeout=5.0) as client:
                try:
                    response = await client.get(
                        f"{demo_service_url}/profiles/{current_user.id}",
                    )
                    
                    if response.status_code == 200:
                        status_data["profile"] = response.json()
                    elif response.status_code == 404:
                        status_data["profile"] = None
                        
                except (httpx.RequestError, httpx.TimeoutException):
                    status_data["profile"] = None
    
    return status_data


class BulkContentRequest(BaseModel):
    user_id: str
    content_pieces: List[Dict[str, Any]]


@router.post("/demo/content/bulk-create")
async def bulk_create_content(
    request: BulkContentRequest,
    session: AsyncSession = Depends(get_async_session),
):
    """Bulk create content pieces from demo simulator."""
    
    try:
        # Get user
        user_stmt = select(User).where(User.id == UUID(request.user_id))
        user_result = await session.execute(user_stmt)
        user = user_result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(404, "User not found")
        
        created_count = 0
        themes_set = set()
        
        for content_data in request.content_pieces:
            # Create content piece
            content = ContentPiece(
                user_id=user.id,
                organization_id=user.organization_id,
                platform=content_data['platform'],
                platform_id=content_data['platform_id'],
                content_type=content_data['content_type'],
                title=content_data['title'],
                description=content_data.get('description'),
                url=content_data['url'],
                thumbnail_url=content_data.get('thumbnail_url'),
                duration_seconds=content_data.get('duration_seconds'),
                hashtags=content_data.get('hashtags', []),
                published_at=datetime.fromisoformat(content_data['published_at'].replace('Z', '+00:00')),
                timezone=content_data.get('timezone', 'UTC'),
                day_of_week=content_data.get('day_of_week'),
                hour_of_day=content_data.get('hour_of_day'),
                follower_count_at_post=content_data.get('follower_count_at_post'),
                theme=content_data.get('theme'),
                is_demo=True,  # CRITICAL: Mark as demo data
            )
            session.add(content)
            await session.flush()  # Get content ID
            
            if content.theme:
                themes_set.add(content.theme)
            
            # Create performance metrics
            perf_data = content_data.get('performance', {})
            performance = ContentPerformance(
                content_id=content.id,
                views=perf_data.get('views', 0),
                impressions=perf_data.get('impressions', 0),
                likes=perf_data.get('likes', 0),
                comments_count=perf_data.get('comments_count', 0),
                shares=perf_data.get('shares', 0),
                saves=perf_data.get('saves', 0),
                watch_time_minutes=perf_data.get('watch_time_minutes'),
                average_view_duration_seconds=perf_data.get('average_view_duration_seconds'),
                retention_rate=perf_data.get('retention_rate'),
                engagement_rate=perf_data.get('engagement_rate'),
                click_through_rate=perf_data.get('click_through_rate'),
                followers_gained=perf_data.get('followers_gained', 0),
                profile_visits=perf_data.get('profile_visits', 0),
                performance_score=perf_data.get('performance_score'),
                percentile_rank=perf_data.get('percentile_rank'),
                performance_category=perf_data.get('performance_category', 'normal'),
                views_last_24h=perf_data.get('views_last_24h', 0),
                engagement_last_24h=perf_data.get('engagement_last_24h', 0),
            )
            session.add(performance)
            
            # Create insights
            for insight_data in content_data.get('insights', []):
                insight = ContentInsight(
                    content_id=content.id,
                    insight_type=insight_data.get('insight_type', 'success_factor'),
                    category=insight_data.get('category'),
                    title=insight_data.get('title', ''),
                    description=insight_data.get('description', ''),
                    impact_level=insight_data.get('impact_level', 'medium'),
                    supporting_data=insight_data.get('supporting_data'),
                    confidence_score=insight_data.get('confidence_score', 0.8),
                    is_positive=insight_data.get('is_positive', True),
                    is_actionable=insight_data.get('is_actionable', False),
                )
                session.add(insight)
            
            created_count += 1
        
        # Create/update theme aggregates
        for theme_name in themes_set:
            # Check if theme exists
            theme_stmt = select(ContentTheme).where(
                ContentTheme.user_id == user.id,
                ContentTheme.name == theme_name,
            )
            theme_result = await session.execute(theme_stmt)
            theme = theme_result.scalar_one_or_none()
            
            # Calculate theme metrics
            theme_content_stmt = (
                select(
                    ContentPiece.id,
                    ContentPerformance.views,
                    ContentPerformance.engagement_rate,
                    ContentPerformance.performance_score,
                )
                .join(ContentPerformance, ContentPiece.id == ContentPerformance.content_id)
                .where(
                    ContentPiece.user_id == user.id,
                    ContentPiece.theme == theme_name,
                )
            )
            theme_content_result = await session.execute(theme_content_stmt)
            theme_content_data = theme_content_result.all()
            
            if theme_content_data:
                total_views = sum(row.views or 0 for row in theme_content_data)
                avg_engagement = sum(float(row.engagement_rate or 0) for row in theme_content_data) / len(theme_content_data)
                avg_performance = sum(float(row.performance_score or 0) for row in theme_content_data) / len(theme_content_data)
                
                if theme:
                    theme.content_count = len(theme_content_data)
                    theme.total_views = total_views
                    theme.avg_engagement_rate = avg_engagement
                    theme.avg_performance_score = avg_performance
                    theme.last_calculated_at = datetime.utcnow()
                else:
                    theme = ContentTheme(
                        user_id=user.id,
                        name=theme_name,
                        content_count=len(theme_content_data),
                        total_views=total_views,
                        avg_engagement_rate=avg_engagement,
                        avg_performance_score=avg_performance,
                        last_calculated_at=datetime.utcnow(),
                    )
                    session.add(theme)
        
        await session.commit()
        
        return {
            "status": "success",
            "created_count": created_count,
            "themes_created": len(themes_set),
        }
    
    except Exception as e:
        await session.rollback()
        import traceback
        error_details = traceback.format_exc()
        logger.error(f"Error creating bulk content: {str(e)}\n{error_details}")
        raise HTTPException(500, f"Failed to create content: {str(e)}")
