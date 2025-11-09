"""Maps YouTube videos to ContentPiece and ContentPerformance models."""
from __future__ import annotations

from typing import Optional
from uuid import UUID
from datetime import datetime

from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.models.youtube import YouTubeVideo, YouTubeConnection
from app.models.content import ContentPiece, ContentPerformance
from app.services.content_enrichment_service import get_content_enrichment_service


class YouTubeContentMapper:
    """Maps YouTube videos to unified ContentPiece model."""
    
    def __init__(self, session: AsyncSession):
        self.session = session
        self.enrichment_service = get_content_enrichment_service()
    
    async def map_video_to_content(
        self,
        video: YouTubeVideo,
        user_id: UUID,
        organization_id: Optional[UUID] = None,
        is_demo: bool = False
    ) -> tuple[ContentPiece, ContentPerformance]:
        """
        Map a YouTube video to ContentPiece and ContentPerformance records.
        
        Args:
            video: YouTubeVideo record
            user_id: Creator's user ID
            organization_id: Optional organization ID
            is_demo: Whether this is demo data
            
        Returns:
            Tuple of (ContentPiece, ContentPerformance)
        """
        # Check if content already exists
        existing = await self._find_existing_content(video.video_id)
        if existing:
            logger.debug(f"Content already exists for video {video.video_id}")
            # Update performance and return
            performance = await self._update_performance(existing, video)
            return existing, performance
        
        # Get channel info for context
        channel = await self._get_channel(video.channel_id)
        channel_avg_views = channel.average_views_per_video if channel else None
        
        # Enrich video if not already done
        if video.performance_score is None:
            enrichment = await self.enrichment_service.enrich_content(
                title=video.title or '',
                description=video.description,
                tags=video.video_tags or video.tags,
                view_count=video.view_count or 0,
                like_count=video.like_count or 0,
                comment_count=video.comment_count or 0,
                published_at=video.published_at,
                channel_avg_views=channel_avg_views
            )
            
            # Update video with enrichment
            video.performance_score = enrichment['performance_score']
        else:
            # Use existing enrichment
            enrichment = {
                'theme': self._determine_theme_from_tags(video.tags),
                'detected_topics': video.video_tags or [],
                'hashtags': self._extract_hashtags_from_description(video.description),
                'performance_score': video.performance_score,
                'summary': video.title or ''
            }
        
        # Determine content type (video vs short)
        content_type = 'short' if 'shorts' in (video.tags or []) else 'video'
        
        # Extract posting time data
        posting_data = self.enrichment_service.extract_posting_time_data(
            video.published_at
        ) if video.published_at else {}
        
        # Create ContentPiece
        content = ContentPiece(
            user_id=user_id,
            organization_id=organization_id,
            platform='youtube',
            platform_id=video.video_id,
            content_type=content_type,
            title=video.title or '',
            description=video.description,
            url=f"https://youtube.com/watch?v={video.video_id}",
            thumbnail_url=video.thumbnail_url,
            duration_seconds=self._parse_duration(video.duration),
            hashtags=enrichment.get('hashtags', []),
            caption=video.description,
            published_at=video.published_at or datetime.utcnow(),
            day_of_week=posting_data.get('day_of_week'),
            hour_of_day=posting_data.get('hour_of_day'),
            follower_count_at_post=channel.subscriber_count if channel else None,
            theme=enrichment.get('theme', 'general'),
            summary=enrichment.get('summary', video.title or ''),
            detected_topics=enrichment.get('detected_topics', []),
            is_demo=is_demo,
            last_synced_at=datetime.utcnow()
        )
        
        self.session.add(content)
        await self.session.flush()
        
        # Create ContentPerformance
        performance = await self._create_performance(content, video, channel_avg_views)
        
        logger.info(f"Mapped YouTube video {video.video_id} to content {content.id}")
        return content, performance
    
    async def map_videos_batch(
        self,
        videos: list[YouTubeVideo],
        user_id: UUID,
        organization_id: Optional[UUID] = None,
        is_demo: bool = False
    ) -> list[tuple[ContentPiece, ContentPerformance]]:
        """
        Map multiple YouTube videos to ContentPiece records in batch.
        
        Args:
            videos: List of YouTubeVideo records
            user_id: Creator's user ID
            organization_id: Optional organization ID
            is_demo: Whether this is demo data
            
        Returns:
            List of (ContentPiece, ContentPerformance) tuples
        """
        results = []
        for video in videos:
            try:
                content, performance = await self.map_video_to_content(
                    video=video,
                    user_id=user_id,
                    organization_id=organization_id,
                    is_demo=is_demo
                )
                results.append((content, performance))
            except Exception as e:
                logger.error(f"Failed to map video {video.video_id}: {e}")
                continue
        
        return results
    
    async def _create_performance(
        self,
        content: ContentPiece,
        video: YouTubeVideo,
        channel_avg_views: Optional[int]
    ) -> ContentPerformance:
        """Create ContentPerformance record from video data."""
        # Calculate percentile rank
        all_scores = await self._get_all_performance_scores(content.user_id)
        percentile_rank = self.enrichment_service.calculate_percentile_rank(
            video.performance_score or 50.0,
            all_scores
        )
        
        performance_category = self.enrichment_service.determine_performance_category(
            percentile_rank
        )
        
        # Calculate engagement rate
        total_engagement = (video.like_count or 0) + (video.comment_count or 0)
        engagement_rate = (total_engagement / max(1, video.view_count or 1)) * 100 if video.view_count else 0
        
        performance = ContentPerformance(
            content_id=content.id,
            views=video.view_count or 0,
            impressions=video.impressions,
            likes=video.like_count or 0,
            comments_count=video.comment_count or 0,
            shares=video.shares_count,
            watch_time_minutes=video.watch_time_minutes,
            average_view_duration_seconds=video.average_view_duration,
            retention_rate=video.average_view_percentage,
            engagement_rate=engagement_rate,
            click_through_rate=video.click_through_rate,
            followers_gained=video.subscribers_gained or 0,
            performance_score=video.performance_score,
            percentile_rank=percentile_rank,
            performance_category=performance_category,
            platform_specific_metrics={
                'traffic_sources': video.traffic_sources,
                'device_types': video.device_types,
                'audience_demographics': video.audience_demographics,
                'is_trending': video.is_trending
            }
        )
        
        self.session.add(performance)
        await self.session.flush()
        return performance
    
    async def _update_performance(
        self,
        content: ContentPiece,
        video: YouTubeVideo
    ) -> ContentPerformance:
        """Update existing ContentPerformance with latest video data."""
        stmt = select(ContentPerformance).where(
            ContentPerformance.content_id == content.id
        )
        result = await self.session.execute(stmt)
        performance = result.scalars().first()
        
        if not performance:
            # Create if doesn't exist
            channel = await self._get_channel(video.channel_id)
            return await self._create_performance(
                content,
                video,
                channel.average_views_per_video if channel else None
            )
        
        # Update metrics
        performance.views = video.view_count or 0
        performance.impressions = video.impressions
        performance.likes = video.like_count or 0
        performance.comments_count = video.comment_count or 0
        performance.shares = video.shares_count
        performance.watch_time_minutes = video.watch_time_minutes
        performance.average_view_duration_seconds = video.average_view_duration
        performance.retention_rate = video.average_view_percentage
        performance.click_through_rate = video.click_through_rate
        performance.followers_gained = video.subscribers_gained or 0
        performance.performance_score = video.performance_score
        
        # Recalculate engagement rate
        total_engagement = (video.like_count or 0) + (video.comment_count or 0)
        performance.engagement_rate = (total_engagement / max(1, video.view_count or 1)) * 100 if video.view_count else 0
        
        # Update platform-specific metrics
        performance.platform_specific_metrics = {
            'traffic_sources': video.traffic_sources,
            'device_types': video.device_types,
            'audience_demographics': video.audience_demographics,
            'is_trending': video.is_trending
        }
        
        performance.last_updated = datetime.utcnow()
        
        return performance
    
    async def _find_existing_content(self, platform_id: str) -> Optional[ContentPiece]:
        """Find existing content by platform ID."""
        stmt = select(ContentPiece).where(
            and_(
                ContentPiece.platform == 'youtube',
                ContentPiece.platform_id == platform_id
            )
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()
    
    async def _get_channel(self, channel_id: UUID) -> Optional[YouTubeConnection]:
        """Get channel by internal ID."""
        stmt = select(YouTubeConnection).where(YouTubeConnection.id == channel_id)
        result = await self.session.execute(stmt)
        return result.scalars().first()
    
    async def _get_all_performance_scores(self, user_id: UUID) -> list[float]:
        """Get all performance scores for a user's content."""
        stmt = select(ContentPerformance.performance_score).join(
            ContentPiece
        ).where(
            and_(
                ContentPiece.user_id == user_id,
                ContentPerformance.performance_score.isnot(None)
            )
        )
        result = await self.session.execute(stmt)
        return [score for score, in result.all()]
    
    def _parse_duration(self, duration_str: Optional[str]) -> Optional[int]:
        """Parse ISO 8601 duration to seconds."""
        if not duration_str:
            return None
        
        import re
        match = re.match(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?', duration_str)
        if not match:
            return None
        
        hours = int(match.group(1) or 0)
        minutes = int(match.group(2) or 0)
        seconds = int(match.group(3) or 0)
        
        return hours * 3600 + minutes * 60 + seconds
    
    def _determine_theme_from_tags(self, tags: Optional[list[str]]) -> str:
        """Determine theme from tags."""
        if not tags:
            return 'general'
        
        tags_lower = [t.lower() for t in tags]
        if 'shorts' in tags_lower:
            return 'short'
        return 'video'
    
    def _extract_hashtags_from_description(self, description: Optional[str]) -> list[str]:
        """Extract hashtags from description."""
        if not description:
            return []
        
        import re
        hashtags = re.findall(r'#(\w+)', description)
        return [h.lower() for h in hashtags]


def get_youtube_content_mapper(session: AsyncSession) -> YouTubeContentMapper:
    """Get YouTube content mapper instance."""
    return YouTubeContentMapper(session)
