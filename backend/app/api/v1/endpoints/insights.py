"""Insights endpoints for "What's Working" dashboard."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime, timedelta
from uuid import UUID

from app.core.database import get_async_session
from app.core.security import get_current_active_user
from app.models.user import User
from app.models.content import (
    ContentPiece,
    ContentPerformance,
    ContentInsight,
    ContentTheme,
)

router = APIRouter()


# Response models
class ContentPerformanceResponse(BaseModel):
    id: str
    views: int
    likes: int
    comments_count: int
    shares: int
    engagement_rate: Optional[float]
    performance_score: Optional[float]
    percentile_rank: Optional[int]
    performance_category: Optional[str]
    
    @field_validator('id', mode='before')
    @classmethod
    def convert_uuid_to_str(cls, v):
        if isinstance(v, UUID):
            return str(v)
        return v
    
    class Config:
        from_attributes = True


class ContentInsightResponse(BaseModel):
    id: str
    insight_type: str
    category: Optional[str]
    title: str
    description: str
    impact_level: Optional[str]
    is_positive: Optional[bool]
    supporting_data: Optional[dict]
    
    @field_validator('id', mode='before')
    @classmethod
    def convert_uuid_to_str(cls, v):
        if isinstance(v, UUID):
            return str(v)
        return v
    
    class Config:
        from_attributes = True


class ContentPieceResponse(BaseModel):
    id: str
    platform: str
    content_type: str
    title: str
    url: str
    thumbnail_url: Optional[str]
    published_at: datetime
    theme: Optional[str]
    summary: Optional[str]
    performance: Optional[ContentPerformanceResponse]
    insights: List[ContentInsightResponse] = []
    
    @field_validator('id', mode='before')
    @classmethod
    def convert_uuid_to_str(cls, v):
        if isinstance(v, UUID):
            return str(v)
        return v
    
    class Config:
        from_attributes = True


class DashboardSummaryResponse(BaseModel):
    total_content: int
    overperforming_count: int
    normal_count: int
    underperforming_count: int
    avg_engagement_rate: float
    total_views: int
    total_reach: int
    engagement_trend: str  # up, down, stable


class ThemePerformanceResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    content_count: int
    avg_engagement_rate: Optional[float]
    avg_performance_score: Optional[float]
    total_views: int
    
    @field_validator('id', mode='before')
    @classmethod
    def convert_uuid_to_str(cls, v):
        if isinstance(v, UUID):
            return str(v)
        return v
    
    class Config:
        from_attributes = True


class PlatformComparisonResponse(BaseModel):
    platform: str
    content_count: int
    avg_engagement_rate: float
    total_views: int
    avg_performance_score: float


class InsightsDashboardResponse(BaseModel):
    summary: DashboardSummaryResponse
    top_performers: List[ContentPieceResponse]
    needs_attention: List[ContentPieceResponse]
    top_themes: List[ThemePerformanceResponse]
    platform_comparison: List[PlatformComparisonResponse]


@router.get("/dashboard", response_model=InsightsDashboardResponse)
async def get_insights_dashboard(
    time_period: str = Query("30d", pattern="^(7d|30d|90d|custom)$"),
    platform_filter: Optional[str] = Query(None, pattern="^(youtube|instagram|tiktok|all)$"),
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Get the main insights dashboard data."""
    
    # Calculate date range
    if time_period == "custom":
        if not start_date or not end_date:
            raise HTTPException(400, "start_date and end_date required for custom time period")
        date_from = start_date
        date_to = end_date
    else:
        days = int(time_period.replace('d', ''))
        date_to = datetime.utcnow()
        date_from = date_to - timedelta(days=days)
    
    # Base query filters
    filters = [
        ContentPiece.user_id == current_user.id,
        ContentPiece.published_at >= date_from,
        ContentPiece.published_at <= date_to,
        ContentPiece.is_deleted == False,
    ]
    
    # CRITICAL: Filter by demo status based on user's demo mode
    # If user is in demo mode, show ONLY demo content (is_demo=True)
    # If user is NOT in demo mode, show ONLY real content (is_demo=False)
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"🔍 Insights query - User {current_user.id}, demo_mode_status: {current_user.demo_mode_status}")
    
    if current_user.demo_mode_status == 'enabled':
        filters.append(ContentPiece.is_demo == True)
        logger.info(f"✅ Filtering for demo content (is_demo=True)")
    else:
        filters.append(ContentPiece.is_demo == False)
        logger.info(f"✅ Filtering for real content (is_demo=False)")
    
    if platform_filter and platform_filter != "all":
        filters.append(ContentPiece.platform == platform_filter)
    
    # Get summary statistics
    stmt = (
        select(
            func.count(ContentPiece.id).label('total_content'),
            func.count(ContentPiece.id).filter(ContentPerformance.performance_category == 'overperforming').label('overperforming_count'),
            func.count(ContentPiece.id).filter(ContentPerformance.performance_category == 'normal').label('normal_count'),
            func.count(ContentPiece.id).filter(ContentPerformance.performance_category == 'underperforming').label('underperforming_count'),
            func.avg(ContentPerformance.engagement_rate).label('avg_engagement_rate'),
            func.sum(ContentPerformance.views).label('total_views'),
            func.sum(ContentPerformance.impressions).label('total_reach'),
        )
        .select_from(ContentPiece)
        .outerjoin(ContentPerformance, ContentPiece.id == ContentPerformance.content_id)
        .where(and_(*filters))
    )
    
    result = await session.execute(stmt)
    summary_data = result.first()
    
    logger.info(f"📊 Query results - total_content: {summary_data.total_content}, date_from: {date_from}, date_to: {date_to}")
    
    # Calculate engagement trend (compare to previous period)
    prev_date_from = date_from - (date_to - date_from)
    prev_filters = [
        ContentPiece.user_id == current_user.id,
        ContentPiece.published_at >= prev_date_from,
        ContentPiece.published_at < date_from,
        ContentPiece.is_deleted == False,
    ]
    
    # Apply same demo filter to previous period
    if current_user.demo_mode_status == 'enabled':
        prev_filters.append(ContentPiece.is_demo == True)
    else:
        prev_filters.append(ContentPiece.is_demo == False)
    
    if platform_filter and platform_filter != "all":
        prev_filters.append(ContentPiece.platform == platform_filter)
    
    prev_stmt = (
        select(func.avg(ContentPerformance.engagement_rate))
        .select_from(ContentPiece)
        .outerjoin(ContentPerformance, ContentPiece.id == ContentPerformance.content_id)
        .where(and_(*prev_filters))
    )
    prev_result = await session.execute(prev_stmt)
    prev_avg = float(prev_result.scalar() or 0)
    
    current_avg = float(summary_data.avg_engagement_rate or 0)
    if prev_avg == 0:
        trend = "stable"
    elif current_avg > prev_avg * 1.05:
        trend = "up"
    elif current_avg < prev_avg * 0.95:
        trend = "down"
    else:
        trend = "stable"
    
    summary = DashboardSummaryResponse(
        total_content=summary_data.total_content or 0,
        overperforming_count=summary_data.overperforming_count or 0,
        normal_count=summary_data.normal_count or 0,
        underperforming_count=summary_data.underperforming_count or 0,
        avg_engagement_rate=float(summary_data.avg_engagement_rate or 0),
        total_views=summary_data.total_views or 0,
        total_reach=summary_data.total_reach or 0,
        engagement_trend=trend,
    )
    
    # Get top performers (limit 5)
    top_performers_stmt = (
        select(ContentPiece)
        .join(ContentPerformance, ContentPiece.id == ContentPerformance.content_id)
        .where(and_(*filters))
        .where(ContentPerformance.performance_category == 'overperforming')
        .order_by(desc(ContentPerformance.performance_score))
        .limit(5)
    )
    top_performers_result = await session.execute(top_performers_stmt)
    top_performers_raw = top_performers_result.scalars().all()
    
    # Load related data for top performers
    top_performers = []
    for content in top_performers_raw:
        # Load performance
        perf_stmt = select(ContentPerformance).where(ContentPerformance.content_id == content.id)
        perf_result = await session.execute(perf_stmt)
        performance = perf_result.scalar_one_or_none()
        
        # Load insights
        insights_stmt = (
            select(ContentInsight)
            .where(ContentInsight.content_id == content.id)
            .order_by(desc(ContentInsight.impact_level))
            .limit(4)
        )
        insights_result = await session.execute(insights_stmt)
        insights = insights_result.scalars().all()
        
        top_performers.append(ContentPieceResponse(
            id=str(content.id),
            platform=content.platform,
            content_type=content.content_type,
            title=content.title,
            url=content.url,
            thumbnail_url=content.thumbnail_url,
            published_at=content.published_at,
            theme=content.theme,
            summary=content.summary,
            performance=ContentPerformanceResponse.from_orm(performance) if performance else None,
            insights=[ContentInsightResponse.from_orm(i) for i in insights],
        ))
    
    # Get content that needs attention (limit 3)
    needs_attention_stmt = (
        select(ContentPiece)
        .join(ContentPerformance, ContentPiece.id == ContentPerformance.content_id)
        .where(and_(*filters))
        .where(ContentPerformance.performance_category == 'underperforming')
        .order_by(ContentPerformance.performance_score)
        .limit(3)
    )
    needs_attention_result = await session.execute(needs_attention_stmt)
    needs_attention_raw = needs_attention_result.scalars().all()
    
    needs_attention = []
    for content in needs_attention_raw:
        perf_stmt = select(ContentPerformance).where(ContentPerformance.content_id == content.id)
        perf_result = await session.execute(perf_stmt)
        performance = perf_result.scalar_one_or_none()
        
        insights_stmt = (
            select(ContentInsight)
            .where(ContentInsight.content_id == content.id)
            .where(ContentInsight.is_positive == False)
            .limit(3)
        )
        insights_result = await session.execute(insights_stmt)
        insights = insights_result.scalars().all()
        
        needs_attention.append(ContentPieceResponse(
            id=str(content.id),
            platform=content.platform,
            content_type=content.content_type,
            title=content.title,
            url=content.url,
            thumbnail_url=content.thumbnail_url,
            published_at=content.published_at,
            theme=content.theme,
            summary=content.summary,
            performance=ContentPerformanceResponse.from_orm(performance) if performance else None,
            insights=[ContentInsightResponse.from_orm(i) for i in insights],
        ))
    
    # Get top themes
    themes_stmt = (
        select(ContentTheme)
        .where(ContentTheme.user_id == current_user.id)
        .order_by(desc(ContentTheme.avg_performance_score))
        .limit(6)
    )
    themes_result = await session.execute(themes_stmt)
    themes_raw = themes_result.scalars().all()
    top_themes = [ThemePerformanceResponse.from_orm(t) for t in themes_raw]
    
    # Get platform comparison
    platforms = ['youtube', 'instagram', 'tiktok']
    platform_comparison = []
    
    for platform in platforms:
        platform_filters = filters + [ContentPiece.platform == platform]
        platform_stmt = (
            select(
                func.count(ContentPiece.id).label('content_count'),
                func.avg(ContentPerformance.engagement_rate).label('avg_engagement_rate'),
                func.sum(ContentPerformance.views).label('total_views'),
                func.avg(ContentPerformance.performance_score).label('avg_performance_score'),
            )
            .select_from(ContentPiece)
            .outerjoin(ContentPerformance, ContentPiece.id == ContentPerformance.content_id)
            .where(and_(*platform_filters))
        )
        platform_result = await session.execute(platform_stmt)
        platform_data = platform_result.first()
        
        if platform_data.content_count > 0:
            platform_comparison.append(PlatformComparisonResponse(
                platform=platform,
                content_count=platform_data.content_count,
                avg_engagement_rate=float(platform_data.avg_engagement_rate or 0),
                total_views=platform_data.total_views or 0,
                avg_performance_score=float(platform_data.avg_performance_score or 0),
            ))
    
    return InsightsDashboardResponse(
        summary=summary,
        top_performers=top_performers,
        needs_attention=needs_attention,
        top_themes=top_themes,
        platform_comparison=platform_comparison,
    )


@router.get("/content/{content_id}", response_model=ContentPieceResponse)
async def get_content_details(
    content_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Get detailed information about a specific piece of content."""
    
    # Get content piece
    stmt = select(ContentPiece).where(
        ContentPiece.id == content_id,
        ContentPiece.user_id == current_user.id,
    )
    result = await session.execute(stmt)
    content = result.scalar_one_or_none()
    
    if not content:
        raise HTTPException(404, "Content not found")
    
    # Get performance
    perf_stmt = select(ContentPerformance).where(ContentPerformance.content_id == content.id)
    perf_result = await session.execute(perf_stmt)
    performance = perf_result.scalar_one_or_none()
    
    # Get all insights
    insights_stmt = (
        select(ContentInsight)
        .where(ContentInsight.content_id == content.id)
        .order_by(desc(ContentInsight.impact_level), desc(ContentInsight.confidence_score))
    )
    insights_result = await session.execute(insights_stmt)
    insights = insights_result.scalars().all()
    
    return ContentPieceResponse(
        id=str(content.id),
        platform=content.platform,
        content_type=content.content_type,
        title=content.title,
        url=content.url,
        thumbnail_url=content.thumbnail_url,
        published_at=content.published_at,
        theme=content.theme,
        summary=content.summary,
        performance=ContentPerformanceResponse.from_orm(performance) if performance else None,
        insights=[ContentInsightResponse.from_orm(i) for i in insights],
    )


@router.get("/content", response_model=List[ContentPieceResponse])
async def list_content(
    platform: Optional[str] = Query(None, pattern="^(youtube|instagram|tiktok)$"),
    theme: Optional[str] = None,
    performance_category: Optional[str] = Query(None, pattern="^(overperforming|normal|underperforming)$"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """List content pieces with optional filters."""
    
    filters = [
        ContentPiece.user_id == current_user.id,
        ContentPiece.is_deleted == False,
    ]
    
    # Filter by demo status
    if current_user.demo_mode_status == 'enabled':
        filters.append(ContentPiece.is_demo == True)
    else:
        filters.append(ContentPiece.is_demo == False)
    
    if platform:
        filters.append(ContentPiece.platform == platform)
    if theme:
        filters.append(ContentPiece.theme == theme)
    
    stmt = (
        select(ContentPiece)
        .outerjoin(ContentPerformance, ContentPiece.id == ContentPerformance.content_id)
        .where(and_(*filters))
    )
    
    if performance_category:
        stmt = stmt.where(ContentPerformance.performance_category == performance_category)
    
    stmt = stmt.order_by(desc(ContentPiece.published_at)).limit(limit).offset(offset)
    
    result = await session.execute(stmt)
    content_pieces = result.scalars().all()
    
    # Build responses with related data
    responses = []
    for content in content_pieces:
        perf_stmt = select(ContentPerformance).where(ContentPerformance.content_id == content.id)
        perf_result = await session.execute(perf_stmt)
        performance = perf_result.scalar_one_or_none()
        
        insights_stmt = (
            select(ContentInsight)
            .where(ContentInsight.content_id == content.id)
            .limit(3)
        )
        insights_result = await session.execute(insights_stmt)
        insights = insights_result.scalars().all()
        
        responses.append(ContentPieceResponse(
            id=str(content.id),
            platform=content.platform,
            content_type=content.content_type,
            title=content.title,
            url=content.url,
            thumbnail_url=content.thumbnail_url,
            published_at=content.published_at,
            theme=content.theme,
            summary=content.summary,
            performance=ContentPerformanceResponse.from_orm(performance) if performance else None,
            insights=[ContentInsightResponse.from_orm(i) for i in insights],
        ))
    
    return responses


@router.get("/themes", response_model=List[ThemePerformanceResponse])
async def list_themes(
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Get all content themes with performance data."""
    
    stmt = (
        select(ContentTheme)
        .where(ContentTheme.user_id == current_user.id)
        .order_by(desc(ContentTheme.content_count))
    )
    result = await session.execute(stmt)
    themes = result.scalars().all()
    
    return [ThemePerformanceResponse.from_orm(t) for t in themes]
