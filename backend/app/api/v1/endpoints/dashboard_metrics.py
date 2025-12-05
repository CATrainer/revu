"""
Dashboard metrics endpoint - aggregates metrics from connected platforms.

This endpoint provides unified metrics for the creator dashboard, working in two modes:
- Demo Mode: Fetches metrics from demo profile (demo service)
- Real Mode: Aggregates metrics from actual connected platforms (YouTube, Instagram, TikTok)

The response structure is identical in both modes, allowing the frontend to work
the same way regardless of data source.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import httpx
import logging

from app.core.database import get_async_session
from app.core.security import get_current_user
from app.core.config import settings
from app.models.user import User
from app.models.youtube import YouTubeConnection, YouTubeVideo, YouTubeComment
from app.models.instagram import InstagramConnection
from app.models.interaction import Interaction
from app.models.workflow import Workflow

router = APIRouter()
logger = logging.getLogger(__name__)


async def get_demo_profile(user_id: str) -> Optional[Dict[str, Any]]:
    """Fetch demo profile from demo service."""
    demo_service_url = getattr(settings, 'DEMO_SERVICE_URL', None)

    if not demo_service_url:
        logger.warning("DEMO_SERVICE_URL not configured")
        return None

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{demo_service_url}/profiles/{user_id}")
            if response.status_code == 200:
                return response.json()
            else:
                logger.warning(f"Demo profile not found for user {user_id}: {response.status_code}")
                return None
    except (httpx.RequestError, httpx.TimeoutException) as e:
        logger.error(f"Failed to fetch demo profile: {e}")
        return None


async def get_demo_metrics(
    db: AsyncSession,
    current_user: User,
) -> Dict[str, Any]:
    """
    Get metrics for demo mode by fetching from demo service and querying demo interactions.
    This mirrors exactly what real mode returns, but from demo data sources.
    """
    # Fetch demo profile from demo service
    demo_profile = await get_demo_profile(str(current_user.id))

    # Calculate interaction counts from demo data
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday_start = today_start - timedelta(days=1)

    # Interactions today (demo)
    today_stmt = select(func.count(Interaction.id)).where(
        Interaction.user_id == current_user.id,
        Interaction.is_demo == True,
        Interaction.created_at >= today_start
    )
    today_result = await db.execute(today_stmt)
    interactions_today = today_result.scalar() or 0

    # Interactions yesterday (demo)
    yesterday_stmt = select(func.count(Interaction.id)).where(
        Interaction.user_id == current_user.id,
        Interaction.is_demo == True,
        Interaction.created_at >= yesterday_start,
        Interaction.created_at < today_start
    )
    yesterday_result = await db.execute(yesterday_stmt)
    interactions_yesterday = yesterday_result.scalar() or 0

    # Calculate interaction change
    if interactions_yesterday > 0:
        interactions_change = round(((interactions_today - interactions_yesterday) / interactions_yesterday) * 100, 1)
    else:
        interactions_change = 100.0 if interactions_today > 0 else 0.0

    # Active workflows
    workflow_stmt = select(func.count(Workflow.id)).where(
        Workflow.user_id == current_user.id,
        Workflow.is_active == True
    )
    workflow_result = await db.execute(workflow_stmt)
    active_workflows = workflow_result.scalar() or 0

    # Extract metrics from demo profile, or use sensible defaults if profile fetch failed
    if demo_profile:
        platforms = demo_profile.get('platforms', {})
        yt = platforms.get('youtube', {})
        ig = platforms.get('instagram', {})
        tt = platforms.get('tiktok', {})

        total_subscribers = yt.get('subscribers', 0)
        total_followers = ig.get('followers', 0) + tt.get('followers', 0)

        # Calculate weighted engagement rate from all platforms
        yt_engagement = yt.get('engagement_rate', 0) or 0
        tt_engagement = tt.get('engagement_rate', 0) or 0
        # Instagram doesn't have engagement_rate in profile, estimate from avg_likes/followers
        ig_followers = ig.get('followers', 1)
        ig_avg_likes = ig.get('avg_likes', 0)
        ig_engagement = (ig_avg_likes / ig_followers * 100) if ig_followers > 0 else 0

        # Weighted average based on follower counts
        total_audience = total_subscribers + total_followers
        if total_audience > 0:
            engagement_rate = (
                (yt_engagement * total_subscribers) +
                (ig_engagement * ig.get('followers', 0)) +
                (tt_engagement * tt.get('followers', 0))
            ) / total_audience
        else:
            engagement_rate = 0

        # Demo mode simulates growth
        follower_change = 5.0
        engagement_change = 2.0

        connected_platforms = {
            'youtube': {'connected': True, 'subscribers': total_subscribers},
            'instagram': {'connected': True, 'followers': ig.get('followers', 0)},
            'tiktok': {'connected': True, 'followers': tt.get('followers', 0)},
        }
    else:
        # Fallback if demo service is unavailable - return zeros with error flag
        logger.error(f"Demo profile unavailable for user {current_user.id}")
        total_subscribers = 0
        total_followers = 0
        engagement_rate = 0
        follower_change = 0
        engagement_change = 0
        connected_platforms = {
            'youtube': {'connected': False, 'error': 'Demo service unavailable'},
            'instagram': {'connected': False, 'error': 'Demo service unavailable'},
            'tiktok': {'connected': False, 'error': 'Demo service unavailable'},
        }

    return {
        "total_followers": total_followers,
        "total_subscribers": total_subscribers,
        "engagement_rate": round(engagement_rate, 1),
        "interactions_today": interactions_today,
        "active_workflows": active_workflows,
        "follower_change": round(follower_change, 1),
        "engagement_change": round(engagement_change, 1),
        "interactions_change": interactions_change,
        "connected_platforms": connected_platforms,
        "is_demo": True,
    }


async def get_real_metrics(
    db: AsyncSession,
    current_user: User,
) -> Dict[str, Any]:
    """
    Get metrics from real platform connections.
    Aggregates data from YouTube, Instagram, and TikTok.
    """
    connected_platforms = {
        'youtube': {'connected': False},
        'instagram': {'connected': False},
        'tiktok': {'connected': False},
    }

    # === YouTube Metrics ===
    total_subscribers = 0
    yt_engagement_rate = 0.0

    yt_result = await db.execute(
        select(YouTubeConnection).where(
            YouTubeConnection.user_id == current_user.id,
            YouTubeConnection.connection_status == 'active'
        )
    )
    youtube_connections = yt_result.scalars().all()

    if youtube_connections:
        for connection in youtube_connections:
            # Use the direct subscriber_count field
            if connection.subscriber_count:
                total_subscribers += connection.subscriber_count
            if connection.engagement_rate:
                yt_engagement_rate = float(connection.engagement_rate)

        connected_platforms['youtube'] = {
            'connected': True,
            'subscribers': total_subscribers,
            'channel_name': youtube_connections[0].channel_name if youtube_connections else None,
        }

    # === Instagram Metrics ===
    ig_followers = 0

    ig_result = await db.execute(
        select(InstagramConnection).where(
            InstagramConnection.user_id == current_user.id,
            InstagramConnection.connection_status == 'active'
        )
    )
    instagram_connections = ig_result.scalars().all()

    if instagram_connections:
        for connection in instagram_connections:
            if connection.follower_count:
                ig_followers += connection.follower_count

        connected_platforms['instagram'] = {
            'connected': True,
            'followers': ig_followers,
            'username': instagram_connections[0].username if instagram_connections else None,
        }

    # === TikTok Metrics ===
    # TikTok connection model doesn't exist yet - prepared for future
    tt_followers = 0
    # TODO: Add TikTokConnection query when model is created
    connected_platforms['tiktok'] = {
        'connected': False,
        'message': 'TikTok integration coming soon',
    }

    # === Calculate totals ===
    total_followers = ig_followers + tt_followers

    # === Engagement Rate Calculation ===
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    total_views = 0
    total_engagements = 0

    # Get YouTube videos from last 30 days for engagement calculation
    video_result = await db.execute(
        select(YouTubeVideo).join(
            YouTubeConnection,
            YouTubeVideo.channel_id == YouTubeConnection.id
        ).where(
            YouTubeConnection.user_id == current_user.id,
            YouTubeVideo.published_at >= thirty_days_ago
        )
    )
    youtube_videos = video_result.scalars().all()

    for video in youtube_videos:
        if video.view_count:
            total_views += video.view_count
        if video.like_count:
            total_engagements += video.like_count
        if video.comment_count:
            total_engagements += video.comment_count

    engagement_rate = (total_engagements / total_views * 100) if total_views > 0 else 0

    # === Interactions Today ===
    twenty_four_hours_ago = datetime.utcnow() - timedelta(hours=24)

    # Count from unified Interaction model (real data only)
    interaction_stmt = select(func.count(Interaction.id)).where(
        Interaction.user_id == current_user.id,
        Interaction.is_demo == False,
        Interaction.created_at >= twenty_four_hours_ago
    )
    interaction_result = await db.execute(interaction_stmt)
    interactions_today = interaction_result.scalar() or 0

    # Also count YouTube comments directly if not in unified model yet
    yt_comment_stmt = select(func.count(YouTubeComment.id)).join(
        YouTubeVideo,
        YouTubeComment.video_id == YouTubeVideo.id
    ).join(
        YouTubeConnection,
        YouTubeVideo.channel_id == YouTubeConnection.id
    ).where(
        YouTubeConnection.user_id == current_user.id,
        YouTubeComment.published_at >= twenty_four_hours_ago
    )
    yt_comment_result = await db.execute(yt_comment_stmt)
    yt_comments_today = yt_comment_result.scalar() or 0

    # Use whichever is higher (in case data is in both places during migration)
    interactions_today = max(interactions_today, yt_comments_today)

    # === Active Workflows ===
    workflow_stmt = select(func.count(Workflow.id)).where(
        Workflow.user_id == current_user.id,
        Workflow.is_active == True
    )
    workflow_result = await db.execute(workflow_stmt)
    active_workflows = workflow_result.scalar() or 0

    # === Calculate Changes ===
    # Follower change - would need historical data
    # For now, use growth fields from YouTube connection if available
    follower_change = 0.0
    if youtube_connections and youtube_connections[0].subscriber_growth_30d:
        if total_subscribers > 0:
            follower_change = (youtube_connections[0].subscriber_growth_30d / total_subscribers) * 100

    # Engagement change - compare to previous 30 days
    sixty_days_ago = datetime.utcnow() - timedelta(days=60)
    prev_video_result = await db.execute(
        select(YouTubeVideo).join(
            YouTubeConnection,
            YouTubeVideo.channel_id == YouTubeConnection.id
        ).where(
            YouTubeConnection.user_id == current_user.id,
            YouTubeVideo.published_at >= sixty_days_ago,
            YouTubeVideo.published_at < thirty_days_ago
        )
    )
    prev_videos = prev_video_result.scalars().all()

    prev_views = sum(v.view_count or 0 for v in prev_videos)
    prev_engagements = sum((v.like_count or 0) + (v.comment_count or 0) for v in prev_videos)
    prev_engagement_rate = (prev_engagements / prev_views * 100) if prev_views > 0 else 0
    engagement_change = engagement_rate - prev_engagement_rate

    # Interactions change - compare to yesterday
    forty_eight_hours_ago = datetime.utcnow() - timedelta(hours=48)

    yesterday_interaction_stmt = select(func.count(Interaction.id)).where(
        Interaction.user_id == current_user.id,
        Interaction.is_demo == False,
        Interaction.created_at >= forty_eight_hours_ago,
        Interaction.created_at < twenty_four_hours_ago
    )
    yesterday_result = await db.execute(yesterday_interaction_stmt)
    interactions_yesterday = yesterday_result.scalar() or 0

    if interactions_yesterday > 0:
        interactions_change = ((interactions_today - interactions_yesterday) / interactions_yesterday) * 100
    else:
        interactions_change = 100.0 if interactions_today > 0 else 0.0

    return {
        "total_followers": total_followers,
        "total_subscribers": total_subscribers,
        "engagement_rate": round(engagement_rate, 1),
        "interactions_today": interactions_today,
        "active_workflows": active_workflows,
        "follower_change": round(follower_change, 1),
        "engagement_change": round(engagement_change, 1),
        "interactions_change": round(interactions_change, 1),
        "connected_platforms": connected_platforms,
        "is_demo": False,
    }


@router.get("/dashboard-metrics")
async def get_dashboard_metrics(
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """
    Get aggregated metrics for dashboard widgets.

    Returns unified metrics structure regardless of demo/real mode:
    - total_followers: Instagram + TikTok followers
    - total_subscribers: YouTube subscribers
    - engagement_rate: Weighted engagement across platforms
    - interactions_today: Comments + DMs + mentions in last 24 hours
    - active_workflows: Number of active automation workflows
    - follower_change: % change in followers (30 day)
    - engagement_change: Change in engagement rate
    - interactions_change: % change from yesterday
    - connected_platforms: Status of each platform connection
    - is_demo: Whether this is demo mode data

    Demo mode fetches from demo service profile.
    Real mode aggregates from actual platform connections.
    """
    is_demo_mode = (current_user.demo_mode_status == 'enabled')

    if is_demo_mode:
        return await get_demo_metrics(db, current_user)
    else:
        return await get_real_metrics(db, current_user)
