"""Demo mode endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
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
    
    if current_user.demo_mode:
        raise HTTPException(400, "Demo mode already enabled")
    
    # Call demo simulator service to create profile
    demo_service_url = getattr(settings, 'DEMO_SERVICE_URL', None)
    
    if not demo_service_url:
        raise HTTPException(500, "Demo service not configured")
    
    payload = {
        "user_id": str(current_user.id),
        **config.dict(),
    }
    
    async with httpx.AsyncClient(timeout=10.0) as client:  # 10s timeout for creation
        try:
            response = await client.post(
                f"{demo_service_url}/profiles",
                json=payload,
            )
            
            # If profile already exists and is active, deactivate it first then retry
            if response.status_code == 400 and "already has an active" in response.text:
                # Deactivate existing profile
                await client.delete(f"{demo_service_url}/profiles/{current_user.id}")
                
                # Retry creation
                response = await client.post(
                    f"{demo_service_url}/profiles",
                    json=payload,
                )
            
            if response.status_code != 200:
                raise HTTPException(500, f"Failed to create demo profile: {response.text}")
            
            profile_data = response.json()
            
        except httpx.TimeoutException:
            raise HTTPException(504, "Demo service timed out - it may be restarting. Please try again in a moment.")
        except httpx.RequestError as e:
            raise HTTPException(500, f"Demo service unavailable: {str(e)}")
    
    # Enable demo mode for user
    current_user.demo_mode = True
    await session.commit()
    
    return {
        "status": "demo_enabled",
        "profile": profile_data,
    }


@router.post("/demo/disable")
async def disable_demo_mode(
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Disable demo mode for the current user."""
    
    if not current_user.demo_mode:
        raise HTTPException(400, "Demo mode not enabled")
    
    # Call demo simulator to deactivate profile
    demo_service_url = getattr(settings, 'DEMO_SERVICE_URL', None)
    
    if demo_service_url:
        async with httpx.AsyncClient(timeout=5.0) as client:
            try:
                await client.delete(
                    f"{demo_service_url}/profiles/{current_user.id}",
                )
            except (httpx.RequestError, httpx.TimeoutException):
                # Continue even if deactivation fails
                pass
    
    # Disable demo mode
    current_user.demo_mode = False
    await session.commit()
    
    return {"status": "demo_disabled"}


@router.get("/demo/status")
async def get_demo_status(
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Get demo mode status for current user."""
    
    status_data = {
        "demo_mode": current_user.demo_mode,
        "user_id": str(current_user.id),
    }
    
    if current_user.demo_mode:
        # Get profile info from demo service
        demo_service_url = getattr(settings, 'DEMO_SERVICE_URL', None)
        
        if demo_service_url:
            async with httpx.AsyncClient(timeout=5.0) as client:  # Reduced to 5s
                try:
                    response = await client.get(
                        f"{demo_service_url}/profiles/{current_user.id}",
                    )
                    
                    if response.status_code == 200:
                        status_data["profile"] = response.json()
                    elif response.status_code == 404:
                        # Profile not found - demo mode enabled but profile doesn't exist
                        status_data["profile"] = None
                        
                except (httpx.RequestError, httpx.TimeoutException):
                    # Demo service unavailable - return basic status without profile info
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
