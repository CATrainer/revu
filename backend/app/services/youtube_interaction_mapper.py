"""Maps YouTube comments to Interaction model with enrichment."""
from __future__ import annotations

from typing import Optional
from uuid import UUID
from datetime import datetime

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.models.youtube import YouTubeComment, YouTubeVideo
from app.models.interaction import Interaction
from app.models.fan import Fan
from app.services.comment_enrichment_service import get_comment_enrichment_service
from app.services.fan_identification_service import get_fan_identification_service


class YouTubeInteractionMapper:
    """Maps YouTube comments to unified Interaction model."""
    
    def __init__(self, session: AsyncSession):
        self.session = session
        self.enrichment_service = get_comment_enrichment_service()
        self.fan_service = get_fan_identification_service(session)
    
    async def map_comment_to_interaction(
        self,
        comment: YouTubeComment,
        user_id: UUID,
        organization_id: Optional[UUID] = None,
        is_demo: bool = False
    ) -> Interaction:
        """
        Map a YouTube comment to an Interaction record.
        
        Args:
            comment: YouTubeComment record
            user_id: Creator's user ID
            organization_id: Optional organization ID
            is_demo: Whether this is demo data
            
        Returns:
            Created Interaction record
        """
        # Check if interaction already exists
        existing = await self._find_existing_interaction(comment.comment_id)
        if existing:
            logger.debug(f"Interaction already exists for comment {comment.comment_id}")
            return existing
        
        # Get video info for context
        video = await self._get_video(comment.video_id)
        
        # Get or create fan
        fan = None
        if comment.author_channel_id:
            fan = await self.fan_service.find_or_create_fan(
                username=comment.author_name or 'Unknown',
                platform='youtube',
                user_id=user_id,
                author_profile_url=f"https://youtube.com/channel/{comment.author_channel_id}" if comment.author_channel_id else None,
                is_demo=is_demo
            )
        
        # Use existing enrichment if available, otherwise enrich now
        if comment.sentiment:
            enrichment = {
                'sentiment': comment.sentiment,
                'priority_score': comment.priority_score,
                'categories': comment.categories or [],
                'detected_keywords': comment.detected_keywords or [],
                'language': comment.language
            }
        else:
            # Get author history for better priority scoring
            author_history = None
            if fan:
                author_history = {
                    'total_comments': fan.total_interactions or 0
                }
            
            enrichment = await self.enrichment_service.enrich_comment(
                text=comment.content or '',
                author_name=comment.author_name,
                like_count=comment.like_count or 0,
                reply_count=comment.reply_count or 0,
                author_history=author_history
            )
            
            # Update comment with enrichment
            comment.sentiment = enrichment['sentiment']
            comment.priority_score = enrichment['priority_score']
            comment.categories = enrichment['categories']
            comment.detected_keywords = enrichment['detected_keywords']
            comment.language = enrichment['language']
        
        # Create interaction
        interaction = Interaction(
            platform='youtube',
            type='comment',
            platform_id=comment.comment_id,
            content=comment.content or '',
            author_name=comment.author_name,
            author_username=comment.author_name,  # YouTube doesn't have separate username
            author_profile_url=f"https://youtube.com/channel/{comment.author_channel_id}" if comment.author_channel_id else None,
            parent_content_id=video.video_id if video else None,
            parent_content_title=video.title if video else None,
            parent_content_url=f"https://youtube.com/watch?v={video.video_id}" if video else None,
            is_reply=bool(comment.parent_comment_id),
            sentiment=enrichment['sentiment'],
            priority_score=enrichment['priority_score'],
            categories=enrichment['categories'],
            detected_keywords=enrichment['detected_keywords'],
            language=enrichment['language'],
            fan_id=fan.id if fan else None,
            status=comment.status or 'unread',
            tags=comment.tags,
            assigned_to_user_id=comment.assigned_to_user_id,
            internal_notes=comment.internal_notes,
            workflow_id=comment.workflow_id,
            workflow_action=comment.workflow_action,
            like_count=comment.like_count or 0,
            reply_count=comment.reply_count or 0,
            platform_created_at=comment.published_at,
            replied_at=comment.replied_at,
            user_id=user_id,
            organization_id=organization_id,
            is_demo=is_demo
        )
        
        self.session.add(interaction)
        await self.session.flush()
        
        # Update fan if exists
        if fan:
            await self.fan_service.update_fan_from_interaction(
                fan_id=fan.id,
                sentiment=enrichment['sentiment'],
                interaction_date=comment.published_at or datetime.utcnow()
            )
        
        logger.info(f"Mapped YouTube comment {comment.comment_id} to interaction {interaction.id}")
        return interaction
    
    async def map_comments_batch(
        self,
        comments: list[YouTubeComment],
        user_id: UUID,
        organization_id: Optional[UUID] = None,
        is_demo: bool = False
    ) -> list[Interaction]:
        """
        Map multiple YouTube comments to Interactions in batch.
        
        Args:
            comments: List of YouTubeComment records
            user_id: Creator's user ID
            organization_id: Optional organization ID
            is_demo: Whether this is demo data
            
        Returns:
            List of created Interaction records
        """
        interactions = []
        for comment in comments:
            try:
                interaction = await self.map_comment_to_interaction(
                    comment=comment,
                    user_id=user_id,
                    organization_id=organization_id,
                    is_demo=is_demo
                )
                interactions.append(interaction)
            except Exception as e:
                logger.error(f"Failed to map comment {comment.comment_id}: {e}")
                continue
        
        return interactions
    
    async def sync_comment_updates(self, comment: YouTubeComment) -> Optional[Interaction]:
        """
        Sync updates from YouTube comment to existing Interaction.
        
        Args:
            comment: Updated YouTubeComment record
            
        Returns:
            Updated Interaction or None if not found
        """
        interaction = await self._find_existing_interaction(comment.comment_id)
        if not interaction:
            return None
        
        # Update fields that might have changed
        interaction.content = comment.content or ''
        interaction.like_count = comment.like_count or 0
        interaction.reply_count = comment.reply_count or 0
        interaction.status = comment.status or interaction.status
        interaction.tags = comment.tags or interaction.tags
        interaction.assigned_to_user_id = comment.assigned_to_user_id or interaction.assigned_to_user_id
        interaction.internal_notes = comment.internal_notes or interaction.internal_notes
        interaction.replied_at = comment.replied_at or interaction.replied_at
        
        # Update enrichment if comment was re-enriched
        if comment.sentiment:
            interaction.sentiment = comment.sentiment
            interaction.priority_score = comment.priority_score
            interaction.categories = comment.categories
            interaction.detected_keywords = comment.detected_keywords
            interaction.language = comment.language
        
        interaction.updated_at = datetime.utcnow()
        
        logger.info(f"Synced updates for comment {comment.comment_id}")
        return interaction
    
    async def _find_existing_interaction(self, platform_id: str) -> Optional[Interaction]:
        """Find existing interaction by platform ID."""
        stmt = select(Interaction).where(
            and_(
                Interaction.platform == 'youtube',
                Interaction.platform_id == platform_id
            )
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()
    
    async def _get_video(self, video_id: UUID) -> Optional[YouTubeVideo]:
        """Get video by internal ID."""
        stmt = select(YouTubeVideo).where(YouTubeVideo.id == video_id)
        result = await self.session.execute(stmt)
        return result.scalars().first()


def get_youtube_interaction_mapper(session: AsyncSession) -> YouTubeInteractionMapper:
    """Get YouTube interaction mapper instance."""
    return YouTubeInteractionMapper(session)
