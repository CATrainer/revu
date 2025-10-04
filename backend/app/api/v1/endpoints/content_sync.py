"""Content Sync - Sync social media content to unified performance table"""
from __future__ import annotations

import json
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel

from app.core.database import get_async_session
from app.core.security import get_current_active_user
from app.models.user import User
from app.services.youtube_performance_sync import (
    sync_youtube_to_performance,
    get_youtube_performance_summary,
    get_content_recommendations
)

try:
    from anthropic import Anthropic
except ImportError:
    Anthropic = None

import os
from app.core.config import settings

router = APIRouter()


class SyncResponse(BaseModel):
    success: bool
    platform: str
    videos_synced: int
    message: str
    channel: Optional[dict] = None
    errors: Optional[list] = None


class PerformanceSummary(BaseModel):
    platform: str
    video_count: int
    avg_engagement: float
    total_views: int
    total_likes: int
    total_comments: int
    best_engagement: float
    worst_engagement: float
    top_videos: list
    period_days: int


class AIInsightsResponse(BaseModel):
    platform: str
    summary: dict
    ai_insights: str
    recommendations: list
    generated_at: str


# ==================== YOUTUBE SYNC ====================

@router.post("/sync/youtube", response_model=SyncResponse)
async def sync_youtube_content(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    days_back: int = Query(90, ge=1, le=365, description="Days of history to sync")
):
    """
    Sync YouTube videos to unified content performance table.
    
    This pulls data from your existing youtube_videos table and transforms it
    into the unified format for AI analysis.
    """
    result = await sync_youtube_to_performance(current_user.id, db, days_back)
    
    if not result["success"]:
        raise HTTPException(
            status_code=400,
            detail=result.get("error", "Failed to sync YouTube content")
        )
    
    return SyncResponse(
        success=True,
        platform="youtube",
        videos_synced=result["videos_synced"],
        message=f"Successfully synced {result['videos_synced']} videos",
        channel=result.get("channel"),
        errors=result.get("errors")
    )


@router.get("/performance/youtube", response_model=PerformanceSummary)
async def get_youtube_performance(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze")
):
    """Get YouTube performance summary for the user."""
    
    summary = await get_youtube_performance_summary(current_user.id, db, days)
    
    return PerformanceSummary(
        platform="youtube",
        **summary
    )


# ==================== AI INSIGHTS ====================

@router.get("/insights", response_model=AIInsightsResponse)
async def get_ai_content_insights(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    platform: str = Query("youtube", description="Platform to analyze")
):
    """
    Generate AI-powered insights from user's content performance.
    
    This uses Claude to analyze patterns in your content and provide
    actionable recommendations.
    """
    
    # Get performance data
    performance_result = await db.execute(
        text("""
            SELECT 
                post_type,
                AVG(engagement_rate) as avg_engagement,
                COUNT(*) as post_count,
                SUM(views) as total_views,
                SUM(likes) as total_likes,
                SUM(comments) as total_comments,
                ARRAY_AGG(
                    caption ORDER BY engagement_rate DESC
                ) FILTER (WHERE caption IS NOT NULL) as top_captions
            FROM user_content_performance
            WHERE user_id = :uid
            AND platform = :platform
            AND posted_at > NOW() - INTERVAL '90 days'
            GROUP BY post_type
        """),
        {"uid": str(current_user.id), "platform": platform}
    )
    
    performance_data = [dict(r._mapping) for r in performance_result.fetchall()]
    
    if not performance_data:
        raise HTTPException(
            status_code=404,
            detail=f"No {platform} content found. Sync your content first."
        )
    
    # Get summary stats
    summary = await get_youtube_performance_summary(current_user.id, db, 30)
    
    # Get basic recommendations
    recommendations_data = await get_content_recommendations(current_user.id, db)
    
    # Generate AI insights using Claude
    ai_insights = "Basic analysis complete. Set CLAUDE_API_KEY for AI-powered insights."
    
    client_key = os.getenv("CLAUDE_API_KEY", getattr(settings, "CLAUDE_API_KEY", None))
    if Anthropic and client_key:
        try:
            client = Anthropic(api_key=client_key)
            
            # Format data for Claude
            data_summary = {
                "platform": platform,
                "video_count": summary["video_count"],
                "avg_engagement": summary["avg_engagement"],
                "total_views": summary["total_views"],
                "best_performing": summary["top_videos"][:3] if summary["top_videos"] else []
            }
            
            analysis_prompt = f"""Analyze this YouTube creator's performance data and provide insights:

{json.dumps(data_summary, indent=2)}

Provide a concise analysis covering:
1. Overall performance assessment
2. What's working well (be specific)
3. Areas for improvement
4. 2-3 actionable recommendations

Keep it practical and data-driven. Focus on things they can implement immediately."""

            response = client.messages.create(
                model="claude-sonnet-4.5-20250929",
                max_tokens=500,
                temperature=0.7,
                messages=[{"role": "user", "content": analysis_prompt}]
            )
            
            content_blocks = getattr(response, "content", [])
            if isinstance(content_blocks, list) and content_blocks:
                ai_insights = getattr(content_blocks[0], "text", ai_insights)
                
        except Exception as e:
            from loguru import logger
            logger.error(f"Failed to generate AI insights: {e}")
            # Continue with basic insights
    
    from datetime import datetime
    
    return AIInsightsResponse(
        platform=platform,
        summary=summary,
        ai_insights=ai_insights,
        recommendations=recommendations_data["recommendations"],
        generated_at=datetime.utcnow().isoformat()
    )


# ==================== BULK SYNC ====================

@router.post("/sync/all")
async def sync_all_platforms(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """
    Sync all connected platforms.
    
    Currently supports:
    - YouTube
    
    Future: Instagram, TikTok, Twitter
    """
    results = []
    
    # Sync YouTube
    youtube_result = await sync_youtube_to_performance(current_user.id, db, 90)
    results.append({
        "platform": "youtube",
        "success": youtube_result["success"],
        "videos_synced": youtube_result.get("videos_synced", 0),
        "error": youtube_result.get("error")
    })
    
    # Future: Add Instagram, TikTok here
    
    return {
        "results": results,
        "total_synced": sum(r["videos_synced"] for r in results if r["success"])
    }


# ==================== CONTENT STATS ====================

@router.get("/stats")
async def get_content_stats(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Get overall content statistics across all platforms."""
    
    result = await db.execute(
        text("""
            SELECT 
                platform,
                COUNT(*) as post_count,
                AVG(engagement_rate) as avg_engagement,
                SUM(views) as total_views,
                MAX(posted_at) as last_post
            FROM user_content_performance
            WHERE user_id = :uid
            GROUP BY platform
        """),
        {"uid": str(current_user.id)}
    )
    
    stats = [
        {
            "platform": r.platform,
            "post_count": r.post_count,
            "avg_engagement": round(float(r.avg_engagement or 0), 2),
            "total_views": r.total_views,
            "last_post": r.last_post.isoformat() if r.last_post else None
        }
        for r in result.fetchall()
    ]
    
    return {"platforms": stats}
