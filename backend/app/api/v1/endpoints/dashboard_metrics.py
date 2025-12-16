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
from app.models.monetization import ActiveProject, ProjectTaskCompletion
from app.models.agency import Agency
from app.models.agency_opportunity import AgencyOpportunity

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
        Workflow.created_by_id == current_user.id,
        Workflow.status == 'active'
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
        Workflow.created_by_id == current_user.id,
        Workflow.status == 'active'
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


@router.get("/dashboard-summary")
async def get_dashboard_summary(
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """
    Get comprehensive dashboard summary for the new widget-based layout.
    
    Returns all data needed for the 4 dashboard widgets:
    - platform_warning: Disconnected platforms that need attention
    - engagement: Views, engagement rate, new followers with period comparisons
    - pending_actions: Unanswered messages, awaiting approval, scheduled posts
    - monetization: Active project status, progress, estimated revenue
    - agency: Agency connection status, new opportunities, last message
    """
    is_demo_mode = (current_user.demo_mode_status == 'enabled')
    
    # Get base metrics (reuse existing logic)
    if is_demo_mode:
        base_metrics = await get_demo_metrics(db, current_user)
    else:
        base_metrics = await get_real_metrics(db, current_user)
    
    # === Platform Warning ===
    connected_platforms = base_metrics.get('connected_platforms', {})
    disconnected_platforms = []
    for platform, status in connected_platforms.items():
        if not status.get('connected', False) and not status.get('message'):  # Skip "coming soon" platforms
            disconnected_platforms.append(platform)
    
    platform_warning = {
        "show": len(disconnected_platforms) > 0 and not all(
            connected_platforms.get(p, {}).get('message') for p in disconnected_platforms
        ),
        "disconnected": disconnected_platforms,
        "connected_count": sum(1 for p in connected_platforms.values() if p.get('connected', False)),
        "total_platforms": 3,  # YouTube, Instagram, TikTok
    }
    
    # === Engagement Summary (7 days) ===
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    fourteen_days_ago = datetime.utcnow() - timedelta(days=14)
    
    # Calculate views from YouTube videos (last 7 days)
    total_views_7d = 0
    total_views_prev_7d = 0
    
    if not is_demo_mode:
        # Current 7 days
        views_stmt = select(func.sum(YouTubeVideo.view_count)).join(
            YouTubeConnection,
            YouTubeVideo.channel_id == YouTubeConnection.id
        ).where(
            YouTubeConnection.user_id == current_user.id,
            YouTubeVideo.published_at >= seven_days_ago
        )
        views_result = await db.execute(views_stmt)
        total_views_7d = views_result.scalar() or 0
        
        # Previous 7 days
        prev_views_stmt = select(func.sum(YouTubeVideo.view_count)).join(
            YouTubeConnection,
            YouTubeVideo.channel_id == YouTubeConnection.id
        ).where(
            YouTubeConnection.user_id == current_user.id,
            YouTubeVideo.published_at >= fourteen_days_ago,
            YouTubeVideo.published_at < seven_days_ago
        )
        prev_views_result = await db.execute(prev_views_stmt)
        total_views_prev_7d = prev_views_result.scalar() or 0
    else:
        # Demo mode - use simulated data
        total_views_7d = 125000
        total_views_prev_7d = 110000
    
    views_change = 0.0
    if total_views_prev_7d > 0:
        views_change = round(((total_views_7d - total_views_prev_7d) / total_views_prev_7d) * 100, 1)
    elif total_views_7d > 0:
        views_change = 100.0
    
    # New followers calculation
    new_followers = 0
    new_followers_change = 0.0
    
    if not is_demo_mode:
        # Get YouTube subscriber growth
        yt_result = await db.execute(
            select(YouTubeConnection).where(
                YouTubeConnection.user_id == current_user.id,
                YouTubeConnection.connection_status == 'active'
            )
        )
        yt_connections = yt_result.scalars().all()
        for conn in yt_connections:
            if conn.subscriber_growth_30d:
                # Estimate 7-day growth as ~25% of 30-day growth
                new_followers += int(conn.subscriber_growth_30d * 0.25)
        
        # Get Instagram follower growth (if available)
        ig_result = await db.execute(
            select(InstagramConnection).where(
                InstagramConnection.user_id == current_user.id,
                InstagramConnection.connection_status == 'active'
            )
        )
        ig_connections = ig_result.scalars().all()
        # Instagram doesn't have growth tracking yet, so skip for now
    else:
        # Demo mode
        new_followers = 1250
        new_followers_change = 8.5
    
    engagement_summary = {
        "views_7d": total_views_7d,
        "views_change": views_change,
        "engagement_rate": base_metrics.get('engagement_rate', 0),
        "engagement_change": base_metrics.get('engagement_change', 0),
        "new_followers": new_followers,
        "new_followers_change": new_followers_change,
        "has_data": base_metrics.get('total_followers', 0) + base_metrics.get('total_subscribers', 0) > 0,
    }
    
    # === Pending Actions ===
    show_demo_data = is_demo_mode
    
    # Unanswered messages (status = unread or read, not answered)
    unanswered_stmt = select(func.count(Interaction.id)).where(
        Interaction.user_id == current_user.id,
        Interaction.is_demo == show_demo_data,
        Interaction.status.in_(['unread', 'read'])
    )
    unanswered_result = await db.execute(unanswered_stmt)
    unanswered_count = unanswered_result.scalar() or 0
    
    # Awaiting approval
    approval_stmt = select(func.count(Interaction.id)).where(
        Interaction.user_id == current_user.id,
        Interaction.is_demo == show_demo_data,
        Interaction.status == 'awaiting_approval'
    )
    approval_result = await db.execute(approval_stmt)
    awaiting_approval_count = approval_result.scalar() or 0
    
    # Scheduled posts today (we don't have a scheduled posts table yet, so return 0)
    # This can be expanded when content scheduling is implemented
    scheduled_today = 0
    
    pending_actions = {
        "unanswered_messages": unanswered_count,
        "awaiting_approval": awaiting_approval_count,
        "scheduled_today": scheduled_today,
        "total": unanswered_count + awaiting_approval_count + scheduled_today,
        "all_caught_up": (unanswered_count + awaiting_approval_count + scheduled_today) == 0,
    }
    
    # === Monetization Status ===
    monetization_status = {
        "has_project": False,
        "project_id": None,
        "project_name": None,
        "tasks_completed": 0,
        "tasks_total": 22,  # Standard task count
        "progress_percent": 0,
        "estimated_revenue": None,
    }
    
    # Get active monetization project
    project_result = await db.execute(
        select(ActiveProject).where(
            ActiveProject.user_id == current_user.id,
            ActiveProject.status == 'active'
        ).order_by(ActiveProject.last_activity_at.desc())
    )
    active_project = project_result.scalar_one_or_none()
    
    if active_project:
        # Count completed tasks
        tasks_result = await db.execute(
            select(func.count(ProjectTaskCompletion.id)).where(
                ProjectTaskCompletion.project_id == active_project.id
            )
        )
        completed_tasks = tasks_result.scalar() or 0
        
        monetization_status = {
            "has_project": True,
            "project_id": str(active_project.id),
            "project_name": active_project.opportunity_title,
            "tasks_completed": completed_tasks,
            "tasks_total": 22,
            "progress_percent": active_project.overall_progress or 0,
            "estimated_revenue": None,  # Can be calculated from opportunity template
        }
    
    # === Agency Connection ===
    agency_connection = {
        "is_connected": False,
        "agency_id": None,
        "agency_name": None,
        "agency_logo_url": None,
        "new_opportunities": 0,
        "last_message_date": None,
    }
    
    if current_user.agency_id:
        # Get agency details
        agency_result = await db.execute(
            select(Agency).where(Agency.id == current_user.agency_id)
        )
        agency = agency_result.scalar_one_or_none()
        
        if agency:
            # Count new opportunities (sent or viewed status)
            opps_result = await db.execute(
                select(func.count(AgencyOpportunity.id)).where(
                    AgencyOpportunity.creator_id == current_user.id,
                    AgencyOpportunity.status.in_(['sent', 'viewed'])
                )
            )
            new_opps = opps_result.scalar() or 0
            
            # Get last opportunity date as proxy for last message
            last_opp_result = await db.execute(
                select(AgencyOpportunity.sent_at).where(
                    AgencyOpportunity.creator_id == current_user.id
                ).order_by(AgencyOpportunity.sent_at.desc()).limit(1)
            )
            last_opp_date = last_opp_result.scalar_one_or_none()
            
            agency_connection = {
                "is_connected": True,
                "agency_id": str(agency.id),
                "agency_name": agency.name,
                "agency_logo_url": agency.logo_url,
                "new_opportunities": new_opps,
                "last_message_date": last_opp_date.isoformat() if last_opp_date else None,
            }
    
    return {
        "platform_warning": platform_warning,
        "engagement": engagement_summary,
        "pending_actions": pending_actions,
        "monetization": monetization_status,
        "agency": agency_connection,
        "connected_platforms": connected_platforms,
        "is_demo": is_demo_mode,
    }
