"""Maps Instagram comments to Interaction model with enrichment."""
from __future__ import annotations

from typing import Optional
from uuid import UUID
from datetime import datetime

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.models.instagram import InstagramComment, InstagramMedia
from app.models.interaction import Interaction
from app.models.fan import Fan
from app.services.comment_enrichment_service import get_comment_enrichment_service
from app.services.fan_identification_service import get_fan_identification_service


class InstagramInteractionMapper:
    """Maps Instagram comments to unified Interaction model."""
    
    def __init__(self, session: AsyncSession):
        self.session = session
        self.enrichment_service = get_comment_enrichment_service()
        self.fan_service = get_fan_identification_service(session)
    
    async def map_comment_to_interaction(
        self,
        comment: InstagramComment,
        user_id: UUID,
        organization_id: Optional[UUID] = None,
        is_demo: bool = False
    ) -> Interaction:
        """
        Map an Instagram comment to an Interaction record.
        
        Args:
            comment: InstagramComment record
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
        
        # Get media info for context
        media = await self._get_media(comment.media_id)
        
        # Get or create fan
        fan = None
        if comment.username:
            fan = await self.fan_service.find_or_create_fan(
                username=comment.username,
                platform='instagram',
                user_id=user_id,
                author_profile_url=f"https://instagram.com/{comment.username}" if comment.username else None,
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
                text=comment.text or '',
                author_name=comment.username,
                like_count=comment.like_count or 0,
                reply_count=0,  # Instagram doesn't provide reply count per comment
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
            platform='instagram',
            type='comment',
            platform_id=comment.comment_id,
            content=comment.text or '',
            author_name=comment.username,
            author_username=comment.username,
            author_profile_url=f"https://instagram.com/{comment.username}" if comment.username else None,
            parent_content_id=media.media_id if media else None,
            parent_content_title=media.caption[:100] if media and media.caption else None,
            parent_content_url=media.permalink if media else None,
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
            platform_created_at=comment.timestamp,
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
                interaction_date=comment.timestamp or datetime.utcnow()
            )
        
        logger.info(f"Mapped Instagram comment {comment.comment_id} to interaction {interaction.id}")
        return interaction
    
    async def map_comments_batch(
        self,
        comments: list[InstagramComment],
        user_id: UUID,
        organization_id: Optional[UUID] = None,
        is_demo: bool = False
    ) -> list[Interaction]:
        """Map multiple Instagram comments to Interactions in batch."""
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
    
    async def sync_comment_updates(self, comment: InstagramComment) -> Optional[Interaction]:
        """Sync updates from Instagram comment to existing Interaction."""
        interaction = await self._find_existing_interaction(comment.comment_id)
        if not interaction:
            return None
        
        # Update fields that might have changed
        interaction.content = comment.text or ''
        interaction.like_count = comment.like_count or 0
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
                Interaction.platform == 'instagram',
                Interaction.platform_id == platform_id
            )
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()
    
    async def _get_media(self, media_id: UUID) -> Optional[InstagramMedia]:
        """Get media by internal ID."""
        stmt = select(InstagramMedia).where(InstagramMedia.id == media_id)
        result = await self.session.execute(stmt)
        return result.scalars().first()


def get_instagram_interaction_mapper(session: AsyncSession) -> InstagramInteractionMapper:
    """Get Instagram interaction mapper instance."""
    return InstagramInteractionMapper(session)
