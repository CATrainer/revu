"""
Dashboard metrics endpoint - aggregates metrics from connected platforms
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, and_, select
from datetime import datetime, timedelta
import random

from app.core.database import get_async_session
from app.core.security import get_current_user
from app.models.user import User
from app.models.youtube import YouTubeConnection, YouTubeVideo, YouTubeComment
from app.models.workflow import Workflow

router = APIRouter()

@router.get("/dashboard-metrics")
async def get_dashboard_metrics(
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """
    Get aggregated metrics for dashboard widgets:
    - Total Followers/Subscribers across all platforms
    - Engagement Rate (calculated from connected accounts)
    - Interactions Today (comments + DMs + mentions in last 24 hours)
    - Workflows Active (number of active workflows)
    
    Returns demo data if user is in demo mode.
    """
    
    # Check if user is in demo mode
    show_demo_data = (current_user.demo_mode_status == 'enabled')
    
    # If demo mode, query real demo interactions instead of returning fake random data
    if show_demo_data:
        from app.models.interaction import Interaction
        from sqlalchemy import func
        from datetime import datetime, timedelta
        
        # Count today's interactions
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        yesterday_start = today_start - timedelta(days=1)
        
        # Interactions today
        today_stmt = select(func.count(Interaction.id)).where(
            Interaction.user_id == current_user.id,
            Interaction.is_demo == True,
            Interaction.created_at >= today_start
        )
        today_result = await db.execute(today_stmt)
        interactions_today = today_result.scalar() or 0
        
        # Interactions yesterday
        yesterday_stmt = select(func.count(Interaction.id)).where(
            Interaction.user_id == current_user.id,
            Interaction.is_demo == True,
            Interaction.created_at >= yesterday_start,
            Interaction.created_at < today_start
        )
        yesterday_result = await db.execute(yesterday_stmt)
        interactions_yesterday = yesterday_result.scalar() or 0
        
        # Calculate percentage change
        if interactions_yesterday > 0:
            interactions_change = round(((interactions_today - interactions_yesterday) / interactions_yesterday) * 100, 1)
        else:
            interactions_change = 0.0
        
        # Return real metrics from demo data
        return {
            "total_followers": 50000,  # Static for demo
            "total_subscribers": 100000,  # Static for demo
            "engagement_rate": 4.2,  # Static for demo
            "interactions_today": interactions_today,
            "active_workflows": 4,  # Static for demo
            "follower_change": 5.0,  # Static for demo
            "engagement_change": 2.0,  # Static for demo
            "interactions_change": interactions_change,
        }
    
    # Total Subscribers from YouTube
    total_subscribers = 0
    result = await db.execute(
        select(YouTubeConnection).filter(YouTubeConnection.user_id == current_user.id)
    )
    youtube_connections = result.scalars().all()
    
    for connection in youtube_connections:
        if connection.channel_statistics:
            stats = connection.channel_statistics
            if isinstance(stats, dict) and 'subscriberCount' in stats:
                try:
                    total_subscribers += int(stats['subscriberCount'])
                except (ValueError, TypeError):
                    pass
    
    # Total followers from other platforms (placeholder for future integrations)
    total_followers = 0
    
    # Engagement Rate Calculation
    # Formula: (Total Engagements / Total Views) * 100
    # Engagements = likes + comments + shares
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    
    total_views = 0
    total_engagements = 0
    
    # Get YouTube videos from last 30 days
    result = await db.execute(
        select(YouTubeVideo).join(
            YouTubeConnection,
            YouTubeVideo.connection_id == YouTubeConnection.id
        ).filter(
            YouTubeConnection.user_id == current_user.id,
            YouTubeVideo.published_at >= thirty_days_ago
        )
    )
    youtube_videos = result.scalars().all()
    
    for video in youtube_videos:
        if video.statistics:
            stats = video.statistics
            if isinstance(stats, dict):
                try:
                    views = int(stats.get('viewCount', 0))
                    likes = int(stats.get('likeCount', 0))
                    comments = int(stats.get('commentCount', 0))
                    
                    total_views += views
                    total_engagements += likes + comments
                except (ValueError, TypeError):
                    pass
    
    engagement_rate = (total_engagements / total_views * 100) if total_views > 0 else 0
    
    # Interactions Today (last 24 hours)
    # Count YouTube comments in last 24 hours
    twenty_four_hours_ago = datetime.utcnow() - timedelta(hours=24)
    
    result = await db.execute(
        select(func.count(YouTubeComment.id)).join(
            YouTubeVideo,
            YouTubeComment.video_id == YouTubeVideo.id
        ).join(
            YouTubeConnection,
            YouTubeVideo.connection_id == YouTubeConnection.id
        ).filter(
            YouTubeConnection.user_id == current_user.id,
            YouTubeComment.published_at >= twenty_four_hours_ago
        )
    )
    interactions_today = result.scalar() or 0
    
    # Add DMs and mentions when those are implemented
    # For now, just YouTube comments
    
    # Active Workflows
    result = await db.execute(
        select(func.count(Workflow.id)).filter(
            Workflow.user_id == current_user.id,
            Workflow.is_active == True
        )
    )
    active_workflows = result.scalar() or 0
    
    # Calculate changes (compare to previous period)
    # Previous month's subscriber count
    sixty_days_ago = datetime.utcnow() - timedelta(days=60)
    
    # For simplicity, calculate follower change as percentage
    # In a real implementation, you'd store historical data
    follower_change = 0  # Placeholder - would need historical data
    
    # Previous month's engagement rate
    result = await db.execute(
        select(YouTubeVideo).join(
            YouTubeConnection,
            YouTubeVideo.connection_id == YouTubeConnection.id
        ).filter(
            YouTubeConnection.user_id == current_user.id,
            YouTubeVideo.published_at >= sixty_days_ago,
            YouTubeVideo.published_at < thirty_days_ago
        )
    )
    prev_month_videos = result.scalars().all()
    
    prev_views = 0
    prev_engagements = 0
    
    for video in prev_month_videos:
        if video.statistics:
            stats = video.statistics
            if isinstance(stats, dict):
                try:
                    views = int(stats.get('viewCount', 0))
                    likes = int(stats.get('likeCount', 0))
                    comments = int(stats.get('commentCount', 0))
                    
                    prev_views += views
                    prev_engagements += likes + comments
                except (ValueError, TypeError):
                    pass
    
    prev_engagement_rate = (prev_engagements / prev_views * 100) if prev_views > 0 else 0
    engagement_change = engagement_rate - prev_engagement_rate if prev_engagement_rate > 0 else 0
    
    # Previous day's interactions
    forty_eight_hours_ago = datetime.utcnow() - timedelta(hours=48)
    
    result = await db.execute(
        select(func.count(YouTubeComment.id)).join(
            YouTubeVideo,
            YouTubeComment.video_id == YouTubeVideo.id
        ).join(
            YouTubeConnection,
            YouTubeVideo.connection_id == YouTubeConnection.id
        ).filter(
            YouTubeConnection.user_id == current_user.id,
            YouTubeComment.published_at >= forty_eight_hours_ago,
            YouTubeComment.published_at < twenty_four_hours_ago
        )
    )
    interactions_yesterday = result.scalar() or 0
    
    interactions_change = 0
    if interactions_yesterday > 0:
        interactions_change = ((interactions_today - interactions_yesterday) / interactions_yesterday) * 100
    elif interactions_today > 0:
        interactions_change = 100
    
    return {
        "total_followers": total_followers,
        "total_subscribers": total_subscribers,
        "engagement_rate": round(engagement_rate, 1),
        "interactions_today": interactions_today,
        "active_workflows": active_workflows,
        "follower_change": round(follower_change, 1),
        "engagement_change": round(engagement_change, 1),
        "interactions_change": round(interactions_change, 1),
    }
