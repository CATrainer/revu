"""Service for detecting and managing superfans based on interaction patterns."""
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID
import logging

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.fan import Fan
from app.models.interaction import Interaction

logger = logging.getLogger(__name__)


class FanDetectionService:
    """Detect and promote superfans based on engagement patterns."""
    
    # Superfan criteria
    MIN_INTERACTIONS = 10
    MIN_POSITIVE_SENTIMENT_RATIO = 0.7
    LOOKBACK_DAYS = 90
    
    @staticmethod
    async def evaluate_and_update_superfan_status(
        session: AsyncSession,
        fan_id: UUID,
    ) -> tuple[bool, dict]:
        """
        Evaluate if a fan should be marked as superfan.
        
        Returns: (is_superfan, metrics)
        """
        
        # Get fan
        fan_stmt = select(Fan).where(Fan.id == fan_id)
        result = await session.execute(fan_stmt)
        fan = result.scalar_one_or_none()
        
        if not fan:
            return False, {}
        
        # Get recent interactions
        cutoff_date = datetime.utcnow() - timedelta(days=FanDetectionService.LOOKBACK_DAYS)
        
        interactions_stmt = select(Interaction).where(
            and_(
                Interaction.author_username == fan.username,
                Interaction.created_at >= cutoff_date
            )
        )
        interactions_result = await session.execute(interactions_stmt)
        interactions = list(interactions_result.scalars().all())
        
        # Calculate metrics
        total_interactions = len(interactions)
        positive_count = len([i for i in interactions if i.sentiment == 'positive'])
        negative_count = len([i for i in interactions if i.sentiment == 'negative'])
        
        positive_ratio = positive_count / total_interactions if total_interactions > 0 else 0
        avg_priority = sum([i.priority_score or 50 for i in interactions]) / total_interactions if total_interactions > 0 else 0
        
        # Calculate lifetime value score (0-100)
        lifetime_value = min(100, (total_interactions * 2) + (positive_count * 5) + int(avg_priority))
        
        # Calculate sentiment score (-1.0 to 1.0)
        if total_interactions > 0:
            sentiment_score = (positive_count - negative_count) / total_interactions
        else:
            sentiment_score = 0
        
        metrics = {
            'total_interactions': total_interactions,
            'positive_count': positive_count,
            'negative_count': negative_count,
            'positive_ratio': positive_ratio,
            'avg_priority': avg_priority,
            'lifetime_value': lifetime_value,
            'sentiment_score': sentiment_score,
        }
        
        # Determine superfan status
        is_superfan = (
            total_interactions >= FanDetectionService.MIN_INTERACTIONS and
            positive_ratio >= FanDetectionService.MIN_POSITIVE_SENTIMENT_RATIO
        )
        
        # Update fan record
        if is_superfan and not fan.is_superfan:
            fan.is_superfan = True
            fan.superfan_since = datetime.utcnow()
            logger.info(f"Fan {fan.username} promoted to superfan!")
        elif not is_superfan and fan.is_superfan:
            fan.is_superfan = False
            fan.superfan_since = None
            logger.info(f"Fan {fan.username} demoted from superfan")
        
        fan.lifetime_value_score = lifetime_value
        fan.sentiment_score = sentiment_score
        fan.interaction_count = total_interactions
        
        await session.commit()
        
        return is_superfan, metrics
    
    @staticmethod
    async def batch_evaluate_all_fans(
        session: AsyncSession,
        user_id: UUID,
        limit: int = 100,
    ) -> dict:
        """Batch evaluate all fans for a user."""
        
        # Get all fans for user
        fans_stmt = select(Fan).where(Fan.user_id == user_id).limit(limit)
        result = await session.execute(fans_stmt)
        fans = list(result.scalars().all())
        
        promoted = 0
        demoted = 0
        
        for fan in fans:
            is_superfan, _ = await FanDetectionService.evaluate_and_update_superfan_status(
                session, fan.id
            )
            
            if is_superfan and not fan.is_superfan:
                promoted += 1
            elif not is_superfan and fan.is_superfan:
                demoted += 1
        
        logger.info(f"Batch evaluated {len(fans)} fans: {promoted} promoted, {demoted} demoted")
        
        return {
            'total_evaluated': len(fans),
            'promoted': promoted,
            'demoted': demoted,
        }
