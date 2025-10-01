"""
Dashboard metrics endpoint - aggregates metrics from connected platforms
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, timedelta

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.youtube import YouTubeConnection, YouTubeVideo, YouTubeComment
from app.models.workflows import Workflow

router = APIRouter()

@router.get("/dashboard-metrics")
async def get_dashboard_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get aggregated metrics for dashboard widgets:
    - Total Followers/Subscribers across all platforms
    - Engagement Rate (calculated from connected accounts)
    - Interactions Today (comments + DMs + mentions in last 24 hours)
    - Workflows Active (number of active workflows)
    """
    
    # Total Subscribers from YouTube
    total_subscribers = 0
    youtube_connections = db.query(YouTubeConnection).filter(
        YouTubeConnection.user_id == current_user.id
    ).all()
    
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
    youtube_videos = db.query(YouTubeVideo).join(
        YouTubeConnection,
        YouTubeVideo.connection_id == YouTubeConnection.id
    ).filter(
        YouTubeConnection.user_id == current_user.id,
        YouTubeVideo.published_at >= thirty_days_ago
    ).all()
    
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
    
    interactions_today = db.query(func.count(YouTubeComment.id)).join(
        YouTubeVideo,
        YouTubeComment.video_id == YouTubeVideo.id
    ).join(
        YouTubeConnection,
        YouTubeVideo.connection_id == YouTubeConnection.id
    ).filter(
        YouTubeConnection.user_id == current_user.id,
        YouTubeComment.published_at >= twenty_four_hours_ago
    ).scalar() or 0
    
    # Add DMs and mentions when those are implemented
    # For now, just YouTube comments
    
    # Active Workflows
    active_workflows = db.query(func.count(Workflow.id)).filter(
        Workflow.user_id == current_user.id,
        Workflow.is_active == True
    ).scalar() or 0
    
    # Calculate changes (compare to previous period)
    # Previous month's subscriber count
    sixty_days_ago = datetime.utcnow() - timedelta(days=60)
    
    # For simplicity, calculate follower change as percentage
    # In a real implementation, you'd store historical data
    follower_change = 0  # Placeholder - would need historical data
    
    # Previous month's engagement rate
    prev_month_videos = db.query(YouTubeVideo).join(
        YouTubeConnection,
        YouTubeVideo.connection_id == YouTubeConnection.id
    ).filter(
        YouTubeConnection.user_id == current_user.id,
        YouTubeVideo.published_at >= sixty_days_ago,
        YouTubeVideo.published_at < thirty_days_ago
    ).all()
    
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
    
    interactions_yesterday = db.query(func.count(YouTubeComment.id)).join(
        YouTubeVideo,
        YouTubeComment.video_id == YouTubeVideo.id
    ).join(
        YouTubeConnection,
        YouTubeVideo.connection_id == YouTubeConnection.id
    ).filter(
        YouTubeConnection.user_id == current_user.id,
        YouTubeComment.published_at >= forty_eight_hours_ago,
        YouTubeComment.published_at < twenty_four_hours_ago
    ).scalar() or 0
    
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
