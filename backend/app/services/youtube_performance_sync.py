"""YouTube Performance Sync - Sync YouTube data to unified content performance table"""
from __future__ import annotations

import json
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from loguru import logger


async def calculate_engagement_rate(
    likes: int,
    comments: int,
    views: int,
    subscriber_count: int
) -> float:
    """
    Calculate engagement rate for a video.
    
    Formula: ((likes + comments) / views) * 100
    Or if views are low: ((likes + comments) / subscriber_count) * 100
    """
    if views > 100:
        # Use view-based engagement
        rate = ((likes + comments) / views) * 100
    elif subscriber_count > 0:
        # Use subscriber-based engagement for low-view videos
        rate = ((likes + comments) / subscriber_count) * 100
    else:
        rate = 0.0
    
    return round(rate, 2)


async def sync_youtube_to_performance(
    user_id: UUID,
    db: AsyncSession,
    days_back: int = 90
) -> Dict[str, Any]:
    """
    Sync YouTube videos to unified content performance table.
    
    Args:
        user_id: User ID to sync
        db: Database session
        days_back: How many days of history to sync
    
    Returns:
        Dictionary with sync statistics
    """
    try:
        # Get user's YouTube connection
        connection_result = await db.execute(
            text("""
                SELECT yc.id, yc.channel_id, yc.channel_title, yc.subscriber_count, yc.access_token
                FROM youtube_connections yc
                WHERE yc.user_id = :uid
                AND yc.access_token IS NOT NULL
                ORDER BY yc.created_at DESC
                LIMIT 1
            """),
            {"uid": str(user_id)}
        )
        
        connection = connection_result.first()
        if not connection:
            logger.warning(f"No YouTube connection found for user {user_id}")
            return {
                "success": False,
                "error": "No YouTube connection found",
                "videos_synced": 0
            }
        
        # Get videos from the last N days
        cutoff_date = datetime.utcnow() - timedelta(days=days_back)
        
        videos_result = await db.execute(
            text("""
                SELECT 
                    yv.video_id,
                    yv.title,
                    yv.description,
                    yv.published_at,
                    yv.view_count,
                    yv.like_count,
                    yv.comment_count,
                    yv.duration,
                    yv.thumbnail_url,
                    yv.tags
                FROM youtube_videos yv
                WHERE yv.channel_id = :channel_id
                AND yv.published_at >= :cutoff
                ORDER BY yv.published_at DESC
            """),
            {
                "channel_id": connection.channel_id,
                "cutoff": cutoff_date
            }
        )
        
        videos = videos_result.fetchall()
        videos_synced = 0
        errors = []
        
        for video in videos:
            try:
                # Calculate engagement rate
                engagement_rate = await calculate_engagement_rate(
                    video.like_count or 0,
                    video.comment_count or 0,
                    video.view_count or 0,
                    connection.subscriber_count or 0
                )
                
                # Prepare metrics JSON
                metrics = {
                    "duration": video.duration,
                    "thumbnail_url": video.thumbnail_url,
                    "tags": video.tags or [],
                    "channel_id": connection.channel_id,
                    "channel_title": connection.channel_title,
                    "description_preview": (video.description or "")[:200]
                }
                
                # Upsert to unified content performance table
                await db.execute(
                    text("""
                        INSERT INTO user_content_performance
                        (user_id, platform, post_id, post_type, caption, posted_at,
                         views, likes, comments, engagement_rate, metrics)
                        VALUES (:uid, 'youtube', :vid, 'video', :title, :posted,
                                :views, :likes, :comments, :engagement, :metrics)
                        ON CONFLICT (user_id, platform, post_id)
                        DO UPDATE SET
                            views = EXCLUDED.views,
                            likes = EXCLUDED.likes,
                            comments = EXCLUDED.comments,
                            engagement_rate = EXCLUDED.engagement_rate,
                            metrics = EXCLUDED.metrics
                    """),
                    {
                        "uid": str(user_id),
                        "vid": video.video_id,
                        "title": video.title,
                        "posted": video.published_at,
                        "views": video.view_count or 0,
                        "likes": video.like_count or 0,
                        "comments": video.comment_count or 0,
                        "engagement": engagement_rate,
                        "metrics": json.dumps(metrics)
                    }
                )
                
                videos_synced += 1
                
            except Exception as e:
                logger.error(f"Failed to sync video {video.video_id}: {e}")
                errors.append(f"{video.video_id}: {str(e)}")
        
        await db.commit()
        
        logger.info(f"Successfully synced {videos_synced} YouTube videos for user {user_id}")
        
        return {
            "success": True,
            "videos_synced": videos_synced,
            "total_videos": len(videos),
            "errors": errors if errors else None,
            "channel": {
                "id": connection.channel_id,
                "title": connection.channel_title,
                "subscribers": connection.subscriber_count
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to sync YouTube content for user {user_id}: {e}")
        await db.rollback()
        return {
            "success": False,
            "error": str(e),
            "videos_synced": 0
        }


async def get_youtube_performance_summary(
    user_id: UUID,
    db: AsyncSession,
    days: int = 30
) -> Dict[str, Any]:
    """
    Get YouTube performance summary for a user.
    
    Args:
        user_id: User ID
        db: Database session
        days: Number of days to analyze
    
    Returns:
        Performance summary with statistics
    """
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    result = await db.execute(
        text("""
            SELECT 
                COUNT(*) as video_count,
                AVG(engagement_rate) as avg_engagement,
                SUM(views) as total_views,
                SUM(likes) as total_likes,
                SUM(comments) as total_comments,
                MAX(engagement_rate) as best_engagement,
                MIN(engagement_rate) as worst_engagement
            FROM user_content_performance
            WHERE user_id = :uid
            AND platform = 'youtube'
            AND posted_at >= :cutoff
        """),
        {"uid": str(user_id), "cutoff": cutoff_date}
    )
    
    summary = result.first()
    
    if not summary or summary.video_count == 0:
        return {
            "video_count": 0,
            "avg_engagement": 0,
            "total_views": 0,
            "total_likes": 0,
            "total_comments": 0,
            "period_days": days
        }
    
    # Get top performing videos
    top_videos_result = await db.execute(
        text("""
            SELECT caption, engagement_rate, views, likes, comments, posted_at
            FROM user_content_performance
            WHERE user_id = :uid
            AND platform = 'youtube'
            AND posted_at >= :cutoff
            ORDER BY engagement_rate DESC
            LIMIT 5
        """),
        {"uid": str(user_id), "cutoff": cutoff_date}
    )
    
    top_videos = [
        {
            "title": v.caption,
            "engagement_rate": float(v.engagement_rate),
            "views": v.views,
            "likes": v.likes,
            "comments": v.comments,
            "posted_at": v.posted_at.isoformat() if v.posted_at else None
        }
        for v in top_videos_result.fetchall()
    ]
    
    return {
        "video_count": summary.video_count,
        "avg_engagement": round(float(summary.avg_engagement or 0), 2),
        "total_views": summary.total_views,
        "total_likes": summary.total_likes,
        "total_comments": summary.total_comments,
        "best_engagement": round(float(summary.best_engagement or 0), 2),
        "worst_engagement": round(float(summary.worst_engagement or 0), 2),
        "top_videos": top_videos,
        "period_days": days
    }


async def get_content_recommendations(
    user_id: UUID,
    db: AsyncSession
) -> Dict[str, Any]:
    """
    Get AI-powered content recommendations based on performance data.
    
    Args:
        user_id: User ID
        db: Database session
    
    Returns:
        Recommendations dictionary
    """
    # Get performance data
    performance = await db.execute(
        text("""
            SELECT 
                caption,
                engagement_rate,
                views,
                likes,
                comments,
                metrics
            FROM user_content_performance
            WHERE user_id = :uid
            AND platform = 'youtube'
            AND posted_at > NOW() - INTERVAL '90 days'
            ORDER BY engagement_rate DESC
            LIMIT 10
        """),
        {"uid": str(user_id)}
    )
    
    top_performers = performance.fetchall()
    
    if not top_performers:
        return {
            "recommendations": [
                "Start creating content to get personalized recommendations",
                "Focus on consistency - post regularly to build audience",
                "Engage with your audience in comments"
            ],
            "based_on_data": False
        }
    
    # Analyze patterns
    recommendations = []
    
    # Average engagement
    avg_engagement = sum(p.engagement_rate for p in top_performers) / len(top_performers)
    
    if avg_engagement > 5.0:
        recommendations.append(f"Great engagement rate of {avg_engagement:.1f}%! Keep doing what you're doing.")
    elif avg_engagement > 3.0:
        recommendations.append(f"Solid {avg_engagement:.1f}% engagement. Try stronger hooks in first 3 seconds.")
    else:
        recommendations.append(f"Engagement at {avg_engagement:.1f}%. Focus on compelling thumbnails and titles.")
    
    # Best video analysis
    best_video = top_performers[0]
    recommendations.append(
        f"Your best video '{best_video.caption[:50]}...' got {best_video.engagement_rate:.1f}% engagement. "
        f"Analyze what made it successful and create similar content."
    )
    
    # View count patterns
    high_view_count = sum(1 for p in top_performers if p.views > 10000)
    if high_view_count > 5:
        recommendations.append("You have strong viewership! Focus on converting viewers to subscribers.")
    else:
        recommendations.append("Improve SEO with better titles, descriptions, and tags to increase views.")
    
    return {
        "recommendations": recommendations,
        "based_on_data": True,
        "analyzed_videos": len(top_performers),
        "avg_engagement": round(avg_engagement, 2)
    }
