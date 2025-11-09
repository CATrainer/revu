"""Maps Instagram media to ContentPiece and ContentPerformance models."""
from __future__ import annotations

from typing import Optional
from uuid import UUID
from datetime import datetime

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.models.instagram import InstagramMedia, InstagramConnection
from app.models.content import ContentPiece, ContentPerformance
from app.services.content_enrichment_service import get_content_enrichment_service


class InstagramContentMapper:
    """Maps Instagram media to unified ContentPiece model."""
    
    def __init__(self, session: AsyncSession):
        self.session = session
        self.enrichment_service = get_content_enrichment_service()
    
    async def map_media_to_content(
        self,
        media: InstagramMedia,
        user_id: UUID,
        organization_id: Optional[UUID] = None,
        is_demo: bool = False
    ) -> tuple[ContentPiece, ContentPerformance]:
        """
        Map Instagram media to ContentPiece and ContentPerformance records.
        
        Args:
            media: InstagramMedia record
            user_id: Creator's user ID
            organization_id: Optional organization ID
            is_demo: Whether this is demo data
            
        Returns:
            Tuple of (ContentPiece, ContentPerformance)
        """
        # Check if content already exists
        existing = await self._find_existing_content(media.media_id)
        if existing:
            logger.debug(f"Content already exists for media {media.media_id}")
            # Update performance and return
            performance = await self._update_performance(existing, media)
            return existing, performance
        
        # Get account info for context
        account = await self._get_account(media.connection_id)
        
        # Enrich media
        enrichment = await self.enrichment_service.enrich_content(
            title=media.caption[:100] if media.caption else '',
            description=media.caption,
            tags=media.hashtags,
            view_count=media.play_count or 0,  # For videos/reels
            like_count=media.like_count or 0,
            comment_count=media.comment_count or 0,
            published_at=media.timestamp,
            channel_avg_views=None  # Instagram doesn't provide this
        )
        
        # Determine content type
        content_type_map = {
            'IMAGE': 'post',
            'VIDEO': 'video',
            'CAROUSEL_ALBUM': 'carousel',
            'REEL': 'reel'
        }
        content_type = content_type_map.get(media.media_type, 'post')
        
        # Extract posting time data
        posting_data = self.enrichment_service.extract_posting_time_data(
            media.timestamp
        ) if media.timestamp else {}
        
        # Create ContentPiece
        content = ContentPiece(
            user_id=user_id,
            organization_id=organization_id,
            platform='instagram',
            platform_id=media.media_id,
            content_type=content_type,
            title=media.caption[:200] if media.caption else '',
            description=media.caption,
            url=media.permalink or '',
            thumbnail_url=media.thumbnail_url or media.media_url,
            hashtags=media.hashtags or [],
            caption=media.caption,
            published_at=media.timestamp or datetime.utcnow(),
            day_of_week=posting_data.get('day_of_week'),
            hour_of_day=posting_data.get('hour_of_day'),
            follower_count_at_post=account.follower_count if account else None,
            theme=enrichment.get('theme', 'general'),
            summary=enrichment.get('summary', media.caption[:200] if media.caption else ''),
            detected_topics=enrichment.get('detected_topics', []),
            is_demo=is_demo,
            last_synced_at=datetime.utcnow()
        )
        
        self.session.add(content)
        await self.session.flush()
        
        # Create ContentPerformance
        performance = await self._create_performance(content, media)
        
        logger.info(f"Mapped Instagram media {media.media_id} to content {content.id}")
        return content, performance
    
    async def map_media_batch(
        self,
        media_items: list[InstagramMedia],
        user_id: UUID,
        organization_id: Optional[UUID] = None,
        is_demo: bool = False
    ) -> list[tuple[ContentPiece, ContentPerformance]]:
        """Map multiple Instagram media to ContentPiece records in batch."""
        results = []
        for media in media_items:
            try:
                content, performance = await self.map_media_to_content(
                    media=media,
                    user_id=user_id,
                    organization_id=organization_id,
                    is_demo=is_demo
                )
                results.append((content, performance))
            except Exception as e:
                logger.error(f"Failed to map media {media.media_id}: {e}")
                continue
        
        return results
    
    async def _create_performance(
        self,
        content: ContentPiece,
        media: InstagramMedia
    ) -> ContentPerformance:
        """Create ContentPerformance record from media data."""
        # Calculate percentile rank
        all_scores = await self._get_all_performance_scores(content.user_id)
        performance_score = self._calculate_instagram_performance_score(media)
        percentile_rank = self.enrichment_service.calculate_percentile_rank(
            performance_score,
            all_scores
        )
        
        performance_category = self.enrichment_service.determine_performance_category(
            percentile_rank
        )
        
        # Calculate engagement rate
        total_engagement = (media.like_count or 0) + (media.comment_count or 0) + (media.save_count or 0)
        views = media.play_count or media.reach or 1  # Use reach if no play count
        engagement_rate = (total_engagement / max(1, views)) * 100 if views else 0
        
        performance = ContentPerformance(
            content_id=content.id,
            views=media.play_count or 0,
            impressions=media.impressions,
            likes=media.like_count or 0,
            comments_count=media.comment_count or 0,
            shares=media.share_count,
            saves=media.save_count,
            engagement_rate=engagement_rate,
            performance_score=performance_score,
            percentile_rank=percentile_rank,
            performance_category=performance_category,
            platform_specific_metrics={
                'reach': media.reach,
                'media_type': media.media_type,
                'is_story': media.is_story
            }
        )
        
        self.session.add(performance)
        await self.session.flush()
        return performance
    
    async def _update_performance(
        self,
        content: ContentPiece,
        media: InstagramMedia
    ) -> ContentPerformance:
        """Update existing ContentPerformance with latest media data."""
        stmt = select(ContentPerformance).where(
            ContentPerformance.content_id == content.id
        )
        result = await self.session.execute(stmt)
        performance = result.scalars().first()
        
        if not performance:
            # Create if doesn't exist
            return await self._create_performance(content, media)
        
        # Update metrics
        performance.views = media.play_count or 0
        performance.impressions = media.impressions
        performance.likes = media.like_count or 0
        performance.comments_count = media.comment_count or 0
        performance.shares = media.share_count
        performance.saves = media.save_count
        
        # Recalculate engagement rate
        total_engagement = (media.like_count or 0) + (media.comment_count or 0) + (media.save_count or 0)
        views = media.play_count or media.reach or 1
        performance.engagement_rate = (total_engagement / max(1, views)) * 100 if views else 0
        
        # Recalculate performance score
        performance.performance_score = self._calculate_instagram_performance_score(media)
        
        # Update platform-specific metrics
        performance.platform_specific_metrics = {
            'reach': media.reach,
            'media_type': media.media_type,
            'is_story': media.is_story
        }
        
        performance.last_updated = datetime.utcnow()
        
        return performance
    
    def _calculate_instagram_performance_score(self, media: InstagramMedia) -> float:
        """
        Calculate performance score for Instagram media.
        
        Instagram-specific scoring based on:
        - Engagement rate (likes + comments + saves / reach)
        - Reach vs impressions ratio
        - Save rate (indicates valuable content)
        """
        score = 50.0  # Base score
        
        # 1. Engagement rate (40 points)
        if media.reach and media.reach > 0:
            total_engagement = (media.like_count or 0) + (media.comment_count or 0) + (media.save_count or 0)
            engagement_rate = (total_engagement / media.reach) * 100
            
            if engagement_rate >= 15:
                score += 40  # Viral engagement
            elif engagement_rate >= 10:
                score += 30  # Excellent
            elif engagement_rate >= 5:
                score += 20  # Great
            elif engagement_rate >= 3:
                score += 10  # Good
        
        # 2. Save rate (30 points) - indicates valuable content
        if media.reach and media.reach > 0 and media.save_count:
            save_rate = (media.save_count / media.reach) * 100
            if save_rate >= 5:
                score += 30  # Highly valuable
            elif save_rate >= 3:
                score += 20
            elif save_rate >= 1:
                score += 10
        
        # 3. Reach vs Impressions (20 points) - indicates shareability
        if media.reach and media.impressions and media.reach > 0:
            ratio = media.impressions / media.reach
            if ratio >= 2.0:
                score += 20  # Highly shared
            elif ratio >= 1.5:
                score += 15
            elif ratio >= 1.2:
                score += 10
        
        # 4. Absolute reach (10 points)
        if media.reach:
            if media.reach >= 100000:
                score += 10
            elif media.reach >= 50000:
                score += 7
            elif media.reach >= 10000:
                score += 5
            elif media.reach >= 5000:
                score += 3
        
        return max(0.0, min(100.0, score))
    
    async def _find_existing_content(self, platform_id: str) -> Optional[ContentPiece]:
        """Find existing content by platform ID."""
        stmt = select(ContentPiece).where(
            and_(
                ContentPiece.platform == 'instagram',
                ContentPiece.platform_id == platform_id
            )
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()
    
    async def _get_account(self, connection_id: UUID) -> Optional[InstagramConnection]:
        """Get account by internal ID."""
        stmt = select(InstagramConnection).where(InstagramConnection.id == connection_id)
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


def get_instagram_content_mapper(session: AsyncSession) -> InstagramContentMapper:
    """Get Instagram content mapper instance."""
    return InstagramContentMapper(session)
