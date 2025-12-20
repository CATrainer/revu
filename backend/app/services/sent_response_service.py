"""Service for tracking sent responses."""
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from sqlalchemy import select, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.models.sent_response import SentResponse
from app.models.interaction import Interaction


class SentResponseService:
    """Service for tracking and querying sent responses.
    
    Every response sent (manual, semi-automated, or automated) is recorded
    for the Sent view and analytics.
    """
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def record_sent_response(
        self,
        interaction_id: UUID,
        response_text: str,
        user_id: UUID,
        response_type: str = 'manual',
        ai_model: Optional[str] = None,
        ai_confidence: Optional[float] = None,
        was_edited: bool = False,
        original_ai_text: Optional[str] = None,
        workflow_id: Optional[UUID] = None,
        platform_response_id: Optional[str] = None,
        platform_error: Optional[str] = None,
        organization_id: Optional[UUID] = None,
        is_demo: bool = False,
    ) -> SentResponse:
        """Record a sent response.
        
        Args:
            interaction_id: The interaction this response was for
            response_text: The actual text that was sent
            user_id: The user who sent (or owns) this response
            response_type: 'manual', 'semi_automated', or 'automated'
            ai_model: AI model used if AI-generated
            ai_confidence: AI confidence score if available
            was_edited: True if user edited AI response before sending
            original_ai_text: Original AI text before edits
            workflow_id: Workflow that triggered this response
            platform_response_id: ID returned by platform API
            platform_error: Error message if send failed
            organization_id: Organization ID if applicable
            is_demo: Whether this is demo mode data
            
        Returns:
            The created SentResponse record
        """
        sent_response = SentResponse(
            interaction_id=interaction_id,
            response_text=response_text,
            response_type=response_type,
            ai_model=ai_model,
            ai_confidence=ai_confidence,
            was_edited=was_edited,
            original_ai_text=original_ai_text,
            workflow_id=workflow_id,
            platform_response_id=platform_response_id,
            platform_error=platform_error,
            sent_at=datetime.utcnow(),
            user_id=user_id,
            organization_id=organization_id,
            is_demo=is_demo,
        )
        
        self.session.add(sent_response)
        await self.session.flush()
        
        logger.info(f"Recorded {response_type} response for interaction {interaction_id}")
        
        return sent_response
    
    async def get_sent_responses(
        self,
        user_id: UUID,
        is_demo: bool = False,
        page: int = 1,
        page_size: int = 20,
        response_type: Optional[str] = None,
    ) -> tuple[List[dict], int]:
        """Get sent responses with their original interactions.
        
        Args:
            user_id: The user to get responses for
            is_demo: Whether to get demo mode data
            page: Page number (1-indexed)
            page_size: Number of items per page
            response_type: Filter by response type
            
        Returns:
            Tuple of (list of response dicts with interaction, total count)
        """
        # Build query
        conditions = [
            SentResponse.user_id == user_id,
            SentResponse.is_demo == is_demo,
        ]
        
        if response_type:
            conditions.append(SentResponse.response_type == response_type)
        
        # Get total count
        count_query = select(SentResponse).where(and_(*conditions))
        count_result = await self.session.execute(count_query)
        total = len(count_result.scalars().all())
        
        # Get paginated results with interactions
        query = (
            select(SentResponse)
            .where(and_(*conditions))
            .order_by(desc(SentResponse.sent_at))
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        
        result = await self.session.execute(query)
        sent_responses = result.scalars().all()
        
        # Build response with interaction data
        responses_with_interactions = []
        for sr in sent_responses:
            interaction = await self.session.get(Interaction, sr.interaction_id)
            
            responses_with_interactions.append({
                'id': str(sr.id),
                'response_text': sr.response_text,
                'response_type': sr.response_type,
                'ai_model': sr.ai_model,
                'was_edited': sr.was_edited,
                'original_ai_text': sr.original_ai_text,
                'sent_at': sr.sent_at.isoformat() if sr.sent_at else None,
                'platform_response_id': sr.platform_response_id,
                'platform_error': sr.platform_error,
                'interaction': {
                    'id': str(interaction.id) if interaction else None,
                    'platform': interaction.platform if interaction else None,
                    'type': interaction.type if interaction else None,
                    'content': interaction.content if interaction else None,
                    'author_name': interaction.author_name if interaction else None,
                    'author_username': interaction.author_username if interaction else None,
                    'author_avatar_url': interaction.author_avatar_url if interaction else None,
                    'parent_content_title': interaction.parent_content_title if interaction else None,
                    'parent_content_url': interaction.parent_content_url if interaction else None,
                    'platform_created_at': interaction.platform_created_at.isoformat() if interaction and interaction.platform_created_at else None,
                } if interaction else None,
            })
        
        return responses_with_interactions, total
    
    async def get_response_stats(self, user_id: UUID, is_demo: bool = False) -> dict:
        """Get statistics about sent responses.
        
        Args:
            user_id: The user to get stats for
            is_demo: Whether to get demo mode stats
            
        Returns:
            Dictionary with response statistics
        """
        base_conditions = [
            SentResponse.user_id == user_id,
            SentResponse.is_demo == is_demo,
        ]
        
        # Total responses
        total_result = await self.session.execute(
            select(SentResponse).where(and_(*base_conditions))
        )
        total = len(total_result.scalars().all())
        
        # By type
        manual_result = await self.session.execute(
            select(SentResponse).where(
                and_(*base_conditions, SentResponse.response_type == 'manual')
            )
        )
        manual_count = len(manual_result.scalars().all())
        
        semi_auto_result = await self.session.execute(
            select(SentResponse).where(
                and_(*base_conditions, SentResponse.response_type == 'semi_automated')
            )
        )
        semi_auto_count = len(semi_auto_result.scalars().all())
        
        auto_result = await self.session.execute(
            select(SentResponse).where(
                and_(*base_conditions, SentResponse.response_type == 'automated')
            )
        )
        auto_count = len(auto_result.scalars().all())
        
        # Edited AI responses
        edited_result = await self.session.execute(
            select(SentResponse).where(
                and_(*base_conditions, SentResponse.was_edited == True)
            )
        )
        edited_count = len(edited_result.scalars().all())
        
        return {
            'total_responses': total,
            'manual_responses': manual_count,
            'semi_automated_responses': semi_auto_count,
            'automated_responses': auto_count,
            'edited_ai_responses': edited_count,
            'ai_edit_rate': (edited_count / semi_auto_count * 100) if semi_auto_count > 0 else 0,
        }


def get_sent_response_service(session: AsyncSession) -> SentResponseService:
    """Factory function to get a SentResponseService instance."""
    return SentResponseService(session)
