"""Insights V2 API - Comprehensive content performance analytics.

Three main sections:
- Overview: Dashboard with key metrics and visualizations
- What's Working: Top performers with AI analysis
- What's Not Working: Underperformers with constructive AI feedback
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc, case
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from uuid import UUID
from decimal import Decimal

from app.core.database import get_async_session
from app.core.security import get_current_active_user
from app.models.user import User
from app.models.content import ContentPiece, ContentPerformance, ContentInsight
from app.services.content_analysis_service import get_content_analysis_service

router = APIRouter()


# ==================== Response Models ====================

class MetricWithChange(BaseModel):
    """A metric value with period-over-period change."""
    value: float
    previous_value: float
    change_percent: float
    trend: str  # up, down, stable


class PerformanceDistribution(BaseModel):
    """Distribution of content across performance categories."""
    top_performers: int
    average: int
    underperformers: int
    top_performers_percent: float
    average_percent: float
    underperformers_percent: float


class PlatformMetrics(BaseModel):
    """Metrics for a single platform."""
    platform: str
    platform_display: str
    content_count: int
    total_views: int
    avg_engagement_rate: float
    avg_views_per_content: float
    top_performer_count: int


class ThemeMetrics(BaseModel):
    """Metrics for a content theme."""
    theme: str
    content_count: int
    avg_engagement_rate: float
    total_views: int
    performance_trend: str


class OverviewResponse(BaseModel):
    """Complete overview dashboard data."""
    # Core metrics with changes
    total_content: MetricWithChange
    avg_engagement_rate: MetricWithChange
    total_views: MetricWithChange
    total_interactions: MetricWithChange
    
    # Distribution
    performance_distribution: PerformanceDistribution
    
    # Platform comparison
    platforms: List[PlatformMetrics]
    
    # Top themes
    top_themes: List[ThemeMetrics]
    
    # Period info
    period_start: datetime
    period_end: datetime
    period_label: str


class ContentAnalysis(BaseModel):
    """AI-generated analysis for a piece of content."""
    why_summary: str
    key_factors: List[str]
    recommendations: List[str]
    content_type_insight: Optional[str] = None
    timing_insight: Optional[str] = None
    salvage_potential: Optional[str] = None
    learning_opportunity: Optional[str] = None


class ContentPerformerItem(BaseModel):
    """A content piece with performance data and analysis."""
    id: str
    platform: str
    content_type: str
    title: str
    url: str
    thumbnail_url: Optional[str]
    published_at: datetime
    theme: Optional[str]
    
    # Performance metrics
    views: int
    likes: int
    comments: int
    shares: int
    engagement_rate: float
    performance_score: float
    
    # Comparison to average
    views_vs_average: float  # e.g., 2.5 means 2.5x average
    engagement_vs_average: float
    
    # AI Analysis
    analysis: Optional[ContentAnalysis] = None
    has_analysis: bool = False


class TrendsSummary(BaseModel):
    """AI-generated summary of patterns."""
    summary: str
    patterns: List[Dict[str, Any]]
    top_recommendation: str
    quick_wins: List[str]


class PerformersResponse(BaseModel):
    """Response for What's Working / What's Not Working pages."""
    # Trends summary card
    trends_summary: TrendsSummary
    
    # Content list
    content: List[ContentPerformerItem]
    total_count: int
    
    # User's baseline for context
    user_avg_engagement: float
    user_avg_views: float
    
    # Period info
    period_start: datetime
    period_end: datetime


# ==================== Helper Functions ====================

def calculate_change(current: float, previous: float) -> tuple[float, str]:
    """Calculate percentage change and trend."""
    if previous == 0:
        if current > 0:
            return 100.0, "up"
        return 0.0, "stable"
    
    change = ((current - previous) / previous) * 100
    
    if change > 5:
        trend = "up"
    elif change < -5:
        trend = "down"
    else:
        trend = "stable"
    
    return round(change, 1), trend


def get_platform_display(platform: str) -> str:
    """Get display name for platform."""
    return {
        'youtube': 'YouTube',
        'instagram': 'Instagram',
        'tiktok': 'TikTok',
        'twitter': 'Twitter/X',
    }.get(platform, platform.title())


# ==================== Endpoints ====================

@router.get("/overview", response_model=OverviewResponse)
async def get_insights_overview(
    period: str = Query("30d", pattern="^(7d|30d|90d|all)$"),
    platform: Optional[str] = Query(None, pattern="^(youtube|instagram|tiktok|all)$"),
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Get the insights overview dashboard with key metrics."""
    
    # Determine date range
    now = datetime.utcnow()
    if period == "all":
        date_from = datetime(2020, 1, 1)  # Far past
        period_label = "All Time"
    else:
        days = int(period.replace('d', ''))
        date_from = now - timedelta(days=days)
        period_label = f"Last {days} days"
    
    # Previous period for comparison
    period_length = now - date_from
    prev_date_from = date_from - period_length
    prev_date_to = date_from
    
    # Demo mode check
    is_demo = current_user.demo_mode_status == 'enabled'
    
    # Base filters
    def base_filters(start_date, end_date):
        filters = [
            ContentPiece.user_id == current_user.id,
            ContentPiece.is_demo == is_demo,
            ContentPiece.is_deleted == False,
            ContentPiece.published_at >= start_date,
            ContentPiece.published_at <= end_date,
        ]
        if platform and platform != "all":
            filters.append(ContentPiece.platform == platform)
        return filters
    
    # Current period metrics
    current_result = await session.execute(
        select(
            func.count(ContentPiece.id).label('total_content'),
            func.coalesce(func.avg(ContentPerformance.engagement_rate), 0).label('avg_engagement'),
            func.coalesce(func.sum(ContentPerformance.views), 0).label('total_views'),
            func.coalesce(
                func.sum(ContentPerformance.likes) + 
                func.sum(ContentPerformance.comments_count) + 
                func.sum(ContentPerformance.shares), 0
            ).label('total_interactions'),
        )
        .select_from(ContentPiece)
        .outerjoin(ContentPerformance, ContentPiece.id == ContentPerformance.content_id)
        .where(and_(*base_filters(date_from, now)))
    )
    current = current_result.first()
    
    # Previous period metrics
    prev_result = await session.execute(
        select(
            func.count(ContentPiece.id).label('total_content'),
            func.coalesce(func.avg(ContentPerformance.engagement_rate), 0).label('avg_engagement'),
            func.coalesce(func.sum(ContentPerformance.views), 0).label('total_views'),
            func.coalesce(
                func.sum(ContentPerformance.likes) + 
                func.sum(ContentPerformance.comments_count) + 
                func.sum(ContentPerformance.shares), 0
            ).label('total_interactions'),
        )
        .select_from(ContentPiece)
        .outerjoin(ContentPerformance, ContentPiece.id == ContentPerformance.content_id)
        .where(and_(*base_filters(prev_date_from, prev_date_to)))
    )
    prev = prev_result.first()
    
    # Build metrics with changes
    content_change, content_trend = calculate_change(current.total_content, prev.total_content)
    engagement_change, engagement_trend = calculate_change(float(current.avg_engagement), float(prev.avg_engagement))
    views_change, views_trend = calculate_change(float(current.total_views), float(prev.total_views))
    interactions_change, interactions_trend = calculate_change(float(current.total_interactions), float(prev.total_interactions))
    
    # Performance distribution
    dist_result = await session.execute(
        select(
            func.count(ContentPiece.id).filter(ContentPerformance.performance_category == 'overperforming').label('top'),
            func.count(ContentPiece.id).filter(ContentPerformance.performance_category == 'normal').label('avg'),
            func.count(ContentPiece.id).filter(ContentPerformance.performance_category == 'underperforming').label('under'),
        )
        .select_from(ContentPiece)
        .outerjoin(ContentPerformance, ContentPiece.id == ContentPerformance.content_id)
        .where(and_(*base_filters(date_from, now)))
    )
    dist = dist_result.first()
    total_categorized = (dist.top or 0) + (dist.avg or 0) + (dist.under or 0)
    
    distribution = PerformanceDistribution(
        top_performers=dist.top or 0,
        average=dist.avg or 0,
        underperformers=dist.under or 0,
        top_performers_percent=round((dist.top or 0) / max(total_categorized, 1) * 100, 1),
        average_percent=round((dist.avg or 0) / max(total_categorized, 1) * 100, 1),
        underperformers_percent=round((dist.under or 0) / max(total_categorized, 1) * 100, 1),
    )
    
    # Platform comparison
    platforms_result = await session.execute(
        select(
            ContentPiece.platform,
            func.count(ContentPiece.id).label('count'),
            func.coalesce(func.sum(ContentPerformance.views), 0).label('views'),
            func.coalesce(func.avg(ContentPerformance.engagement_rate), 0).label('engagement'),
            func.count(ContentPiece.id).filter(ContentPerformance.performance_category == 'overperforming').label('top_count'),
        )
        .select_from(ContentPiece)
        .outerjoin(ContentPerformance, ContentPiece.id == ContentPerformance.content_id)
        .where(and_(*[f for f in base_filters(date_from, now) if 'platform' not in str(f)]))
        .group_by(ContentPiece.platform)
        .order_by(desc(func.sum(ContentPerformance.views)))
    )
    
    platforms = []
    for row in platforms_result.fetchall():
        platforms.append(PlatformMetrics(
            platform=row.platform,
            platform_display=get_platform_display(row.platform),
            content_count=row.count,
            total_views=int(row.views),
            avg_engagement_rate=round(float(row.engagement), 2),
            avg_views_per_content=round(int(row.views) / max(row.count, 1), 0),
            top_performer_count=row.top_count or 0,
        ))
    
    # Top themes
    themes_result = await session.execute(
        select(
            ContentPiece.theme,
            func.count(ContentPiece.id).label('count'),
            func.coalesce(func.avg(ContentPerformance.engagement_rate), 0).label('engagement'),
            func.coalesce(func.sum(ContentPerformance.views), 0).label('views'),
        )
        .select_from(ContentPiece)
        .outerjoin(ContentPerformance, ContentPiece.id == ContentPerformance.content_id)
        .where(and_(*base_filters(date_from, now), ContentPiece.theme.isnot(None)))
        .group_by(ContentPiece.theme)
        .having(func.count(ContentPiece.id) >= 1)
        .order_by(desc(func.avg(ContentPerformance.engagement_rate)))
        .limit(6)
    )
    
    themes = []
    for row in themes_result.fetchall():
        themes.append(ThemeMetrics(
            theme=row.theme,
            content_count=row.count,
            avg_engagement_rate=round(float(row.engagement), 2),
            total_views=int(row.views),
            performance_trend="stable",  # Could calculate this with more queries
        ))
    
    return OverviewResponse(
        total_content=MetricWithChange(
            value=current.total_content,
            previous_value=prev.total_content,
            change_percent=content_change,
            trend=content_trend,
        ),
        avg_engagement_rate=MetricWithChange(
            value=round(float(current.avg_engagement), 2),
            previous_value=round(float(prev.avg_engagement), 2),
            change_percent=engagement_change,
            trend=engagement_trend,
        ),
        total_views=MetricWithChange(
            value=float(current.total_views),
            previous_value=float(prev.total_views),
            change_percent=views_change,
            trend=views_trend,
        ),
        total_interactions=MetricWithChange(
            value=float(current.total_interactions),
            previous_value=float(prev.total_interactions),
            change_percent=interactions_change,
            trend=interactions_trend,
        ),
        performance_distribution=distribution,
        platforms=platforms,
        top_themes=themes,
        period_start=date_from,
        period_end=now,
        period_label=period_label,
    )


@router.get("/whats-working", response_model=PerformersResponse)
async def get_whats_working(
    period: str = Query("90d", pattern="^(30d|90d|all)$"),
    platform: Optional[str] = Query(None, pattern="^(youtube|instagram|tiktok|all)$"),
    limit: int = Query(10, ge=1, le=50),
    generate_analysis: bool = Query(True),
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Get top performing content with AI analysis."""
    
    is_demo = current_user.demo_mode_status == 'enabled'
    analysis_service = get_content_analysis_service(session)
    
    # Ensure content is classified
    await analysis_service.classify_content(current_user.id, is_demo)
    
    # Get baseline
    baseline = await analysis_service.calculate_user_baseline(current_user.id, is_demo=is_demo)
    
    # Date range
    now = datetime.utcnow()
    if period == "all":
        date_from = datetime(2020, 1, 1)
    else:
        days = int(period.replace('d', ''))
        date_from = now - timedelta(days=days)
    
    # Get top performers
    performers = await analysis_service.get_top_performers(
        current_user.id, is_demo, limit=limit, days=(now - date_from).days
    )
    
    # Generate trends summary
    trends = await analysis_service.generate_trends_summary(
        current_user.id, is_demo, is_positive=True, days=(now - date_from).days
    )
    
    # Build response items
    content_items = []
    for p in performers:
        content = p['content']
        perf = p['performance']
        
        # Calculate vs average
        views_vs_avg = float(perf.views or 0) / max(baseline['avg_views'], 1)
        engagement_vs_avg = float(perf.engagement_rate or 0) / max(baseline['avg_engagement'], 0.01)
        
        # Generate analysis if requested and not already done
        analysis = None
        if generate_analysis:
            analysis_data = await analysis_service.generate_content_analysis(
                content, perf, baseline, is_top_performer=True
            )
            analysis = ContentAnalysis(**analysis_data)
        
        content_items.append(ContentPerformerItem(
            id=str(content.id),
            platform=content.platform,
            content_type=content.content_type,
            title=content.title,
            url=content.url,
            thumbnail_url=content.thumbnail_url,
            published_at=content.published_at,
            theme=content.theme,
            views=perf.views or 0,
            likes=perf.likes or 0,
            comments=perf.comments_count or 0,
            shares=perf.shares or 0,
            engagement_rate=round(float(perf.engagement_rate or 0), 2),
            performance_score=round(float(perf.performance_score or 0), 1),
            views_vs_average=round(views_vs_avg, 1),
            engagement_vs_average=round(engagement_vs_avg, 1),
            analysis=analysis,
            has_analysis=analysis is not None,
        ))
    
    return PerformersResponse(
        trends_summary=TrendsSummary(**trends),
        content=content_items,
        total_count=len(content_items),
        user_avg_engagement=round(baseline['avg_engagement'], 2),
        user_avg_views=round(baseline['avg_views'], 0),
        period_start=date_from,
        period_end=now,
    )


@router.get("/whats-not-working", response_model=PerformersResponse)
async def get_whats_not_working(
    period: str = Query("90d", pattern="^(30d|90d|all)$"),
    platform: Optional[str] = Query(None, pattern="^(youtube|instagram|tiktok|all)$"),
    limit: int = Query(10, ge=1, le=50),
    generate_analysis: bool = Query(True),
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Get underperforming content with constructive AI analysis."""
    
    is_demo = current_user.demo_mode_status == 'enabled'
    analysis_service = get_content_analysis_service(session)
    
    # Ensure content is classified
    await analysis_service.classify_content(current_user.id, is_demo)
    
    # Get baseline
    baseline = await analysis_service.calculate_user_baseline(current_user.id, is_demo=is_demo)
    
    # Date range
    now = datetime.utcnow()
    if period == "all":
        date_from = datetime(2020, 1, 1)
    else:
        days = int(period.replace('d', ''))
        date_from = now - timedelta(days=days)
    
    # Get underperformers
    performers = await analysis_service.get_underperformers(
        current_user.id, is_demo, limit=limit, days=(now - date_from).days
    )
    
    # Generate trends summary
    trends = await analysis_service.generate_trends_summary(
        current_user.id, is_demo, is_positive=False, days=(now - date_from).days
    )
    
    # Build response items
    content_items = []
    for p in performers:
        content = p['content']
        perf = p['performance']
        
        # Calculate vs average
        views_vs_avg = float(perf.views or 0) / max(baseline['avg_views'], 1)
        engagement_vs_avg = float(perf.engagement_rate or 0) / max(baseline['avg_engagement'], 0.01)
        
        # Generate analysis if requested
        analysis = None
        if generate_analysis:
            analysis_data = await analysis_service.generate_content_analysis(
                content, perf, baseline, is_top_performer=False
            )
            analysis = ContentAnalysis(**analysis_data)
        
        content_items.append(ContentPerformerItem(
            id=str(content.id),
            platform=content.platform,
            content_type=content.content_type,
            title=content.title,
            url=content.url,
            thumbnail_url=content.thumbnail_url,
            published_at=content.published_at,
            theme=content.theme,
            views=perf.views or 0,
            likes=perf.likes or 0,
            comments=perf.comments_count or 0,
            shares=perf.shares or 0,
            engagement_rate=round(float(perf.engagement_rate or 0), 2),
            performance_score=round(float(perf.performance_score or 0), 1),
            views_vs_average=round(views_vs_avg, 1),
            engagement_vs_average=round(engagement_vs_avg, 1),
            analysis=analysis,
            has_analysis=analysis is not None,
        ))
    
    return PerformersResponse(
        trends_summary=TrendsSummary(**trends),
        content=content_items,
        total_count=len(content_items),
        user_avg_engagement=round(baseline['avg_engagement'], 2),
        user_avg_views=round(baseline['avg_views'], 0),
        period_start=date_from,
        period_end=now,
    )


@router.post("/analyze/{content_id}")
async def analyze_single_content(
    content_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Generate or regenerate AI analysis for a specific piece of content."""
    
    is_demo = current_user.demo_mode_status == 'enabled'
    
    # Get content
    result = await session.execute(
        select(ContentPiece, ContentPerformance)
        .join(ContentPerformance, ContentPiece.id == ContentPerformance.content_id)
        .where(
            and_(
                ContentPiece.id == content_id,
                ContentPiece.user_id == current_user.id,
                ContentPiece.is_demo == is_demo,
            )
        )
    )
    row = result.first()
    
    if not row:
        raise HTTPException(404, "Content not found")
    
    content, performance = row
    
    analysis_service = get_content_analysis_service(session)
    baseline = await analysis_service.calculate_user_baseline(current_user.id, is_demo=is_demo)
    
    is_top = performance.performance_category == 'overperforming'
    analysis = await analysis_service.generate_content_analysis(
        content, performance, baseline, is_top_performer=is_top
    )
    
    return {
        "content_id": str(content_id),
        "analysis": analysis,
        "performance_category": performance.performance_category,
    }


@router.post("/reclassify")
async def reclassify_content(
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Force reclassification of all user content."""
    
    is_demo = current_user.demo_mode_status == 'enabled'
    analysis_service = get_content_analysis_service(session)
    
    counts = await analysis_service.classify_content(
        current_user.id, is_demo, force_reclassify=True
    )
    
    return {
        "message": "Content reclassified successfully",
        "counts": counts,
    }
