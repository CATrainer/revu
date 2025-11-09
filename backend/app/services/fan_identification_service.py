"""Fan identification and engagement scoring service.

Maps comment authors to Fan records and calculates engagement scores.
"""
from __future__ import annotations

from typing import Dict, List, Optional
from uuid import UUID
from datetime import datetime, timedelta

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.models.fan import Fan
from app.models.interaction import Interaction


class FanIdentificationService:
    """Service for identifying and scoring fans across platforms."""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def find_or_create_fan(
        self,
        username: str,
        platform: str,
        user_id: UUID,
        author_profile_url: Optional[str] = None,
        author_avatar_url: Optional[str] = None,
        is_demo: bool = False
    ) -> Fan:
        """
        Find existing fan or create new one.
        
        Args:
            username: Author username
            platform: Platform (youtube, instagram, tiktok)
            user_id: Creator's user ID
            author_profile_url: Author's profile URL
            author_avatar_url: Author's avatar URL
            is_demo: Whether this is demo data
            
        Returns:
            Fan record
        """
        # Try to find existing fan by username and user_id
        stmt = select(Fan).where(
            and_(
                Fan.username == username,
                Fan.user_id == user_id,
                Fan.is_demo == is_demo
            )
        )
        result = await self.session.execute(stmt)
        fan = result.scalars().first()
        
        if fan:
            # Update platform info if new
            platforms = fan.platforms or {}
            if platform not in platforms:
                platforms[platform] = username
                fan.platforms = platforms
                fan.updated_at = datetime.utcnow()
            return fan
        
        # Create new fan
        fan = Fan(
            username=username,
            user_id=user_id,
            platforms={platform: username},
            profile_url=author_profile_url,
            avatar_url=author_avatar_url,
            total_interactions=0,
            engagement_score=50,  # Start at neutral
            is_demo=is_demo,
            first_interaction_at=datetime.utcnow(),
            last_interaction_at=datetime.utcnow()
        )
        
        self.session.add(fan)
        await self.session.flush()
        return fan
    
    async def update_fan_from_interaction(
        self,
        fan_id: UUID,
        sentiment: str,
        interaction_date: datetime
    ) -> None:
        """
        Update fan record after new interaction.
        
        Args:
            fan_id: Fan ID
            sentiment: Interaction sentiment
            interaction_date: When interaction occurred
        """
        stmt = select(Fan).where(Fan.id == fan_id)
        result = await self.session.execute(stmt)
        fan = result.scalars().first()
        
        if not fan:
            return
        
        # Update counts
        fan.total_interactions = (fan.total_interactions or 0) + 1
        fan.last_interaction_at = interaction_date
        
        # Update average sentiment (simple running average)
        if fan.avg_sentiment:
            # Convert to numeric for calculation
            sentiment_values = {'positive': 1, 'neutral': 0, 'negative': -1}
            current_val = sentiment_values.get(fan.avg_sentiment, 0)
            new_val = sentiment_values.get(sentiment, 0)
            
            # Weighted average (give more weight to recent)
            avg_val = (current_val * 0.7) + (new_val * 0.3)
            
            # Convert back to sentiment
            if avg_val > 0.3:
                fan.avg_sentiment = 'positive'
            elif avg_val < -0.3:
                fan.avg_sentiment = 'negative'
            else:
                fan.avg_sentiment = 'neutral'
        else:
            fan.avg_sentiment = sentiment
        
        fan.updated_at = datetime.utcnow()
    
    async def calculate_engagement_score(self, fan_id: UUID) -> int:
        """
        Calculate engagement score (1-100) for a fan.
        
        Factors:
        - Total interactions
        - Interaction frequency
        - Sentiment
        - Recency
        - Interaction types
        
        Returns:
            Score from 1-100
        """
        # Get fan
        stmt = select(Fan).where(Fan.id == fan_id)
        result = await self.session.execute(stmt)
        fan = result.scalars().first()
        
        if not fan:
            return 50
        
        score = 50  # Base score
        
        # 1. Total interactions (30 points)
        total = fan.total_interactions or 0
        if total >= 50:
            score += 30
        elif total >= 20:
            score += 20
        elif total >= 10:
            score += 15
        elif total >= 5:
            score += 10
        elif total >= 2:
            score += 5
        
        # 2. Sentiment (20 points)
        if fan.avg_sentiment == 'positive':
            score += 20
        elif fan.avg_sentiment == 'neutral':
            score += 10
        # Negative = no bonus
        
        # 3. Recency (20 points)
        if fan.last_interaction_at:
            days_since = (datetime.utcnow() - fan.last_interaction_at).days
            if days_since <= 7:
                score += 20  # Active this week
            elif days_since <= 30:
                score += 15  # Active this month
            elif days_since <= 90:
                score += 10  # Active this quarter
            elif days_since <= 180:
                score += 5   # Active this half-year
            # Older = no bonus
        
        # 4. Frequency (15 points)
        if fan.first_interaction_at and fan.last_interaction_at:
            days_active = max(1, (fan.last_interaction_at - fan.first_interaction_at).days)
            interactions_per_week = (total / days_active) * 7
            
            if interactions_per_week >= 3:
                score += 15  # Very frequent
            elif interactions_per_week >= 1:
                score += 10  # Weekly
            elif interactions_per_week >= 0.25:
                score += 5   # Monthly
            # Less frequent = no bonus
        
        # 5. Cross-platform (15 points)
        platforms = fan.platforms or {}
        platform_count = len(platforms)
        if platform_count >= 3:
            score += 15
        elif platform_count >= 2:
            score += 10
        elif platform_count >= 1:
            score += 5
        
        # Cap at 1-100
        return max(1, min(100, score))
    
    async def identify_superfans(self, user_id: UUID, threshold: int = 80) -> List[Fan]:
        """
        Identify superfans for a user.
        
        Args:
            user_id: Creator's user ID
            threshold: Minimum engagement score (default 80)
            
        Returns:
            List of superfan records
        """
        # Get all fans for user
        stmt = select(Fan).where(
            and_(
                Fan.user_id == user_id,
                Fan.engagement_score >= threshold,
                Fan.is_demo == False
            )
        ).order_by(Fan.engagement_score.desc())
        
        result = await self.session.execute(stmt)
        fans = result.scalars().all()
        
        # Mark as superfans
        for fan in fans:
            if not fan.is_superfan:
                fan.is_superfan = True
                fan.updated_at = datetime.utcnow()
        
        return list(fans)
    
    async def update_all_fan_scores(self, user_id: UUID) -> int:
        """
        Recalculate engagement scores for all fans of a user.
        
        Args:
            user_id: Creator's user ID
            
        Returns:
            Number of fans updated
        """
        # Get all fans for user
        stmt = select(Fan).where(
            and_(
                Fan.user_id == user_id,
                Fan.is_demo == False
            )
        )
        result = await self.session.execute(stmt)
        fans = result.scalars().all()
        
        count = 0
        for fan in fans:
            new_score = await self.calculate_engagement_score(fan.id)
            if new_score != fan.engagement_score:
                fan.engagement_score = new_score
                fan.updated_at = datetime.utcnow()
                count += 1
        
        await self.session.flush()
        return count
    
    async def link_cross_platform(
        self,
        fan_id: UUID,
        platform: str,
        username: str
    ) -> None:
        """
        Link a fan to another platform.
        
        Args:
            fan_id: Fan ID
            platform: Platform name
            username: Username on that platform
        """
        stmt = select(Fan).where(Fan.id == fan_id)
        result = await self.session.execute(stmt)
        fan = result.scalars().first()
        
        if not fan:
            return
        
        platforms = fan.platforms or {}
        platforms[platform] = username
        fan.platforms = platforms
        fan.updated_at = datetime.utcnow()
    
    async def get_fan_interaction_history(
        self,
        fan_id: UUID,
        limit: int = 50
    ) -> List[Interaction]:
        """
        Get recent interactions for a fan.
        
        Args:
            fan_id: Fan ID
            limit: Max number of interactions to return
            
        Returns:
            List of interactions
        """
        stmt = select(Interaction).where(
            Interaction.fan_id == fan_id
        ).order_by(
            Interaction.platform_created_at.desc()
        ).limit(limit)
        
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
    
    async def get_fan_stats(self, fan_id: UUID) -> Dict:
        """
        Get detailed stats for a fan.
        
        Returns:
            Dict with stats: total_interactions, avg_sentiment, platforms, etc.
        """
        stmt = select(Fan).where(Fan.id == fan_id)
        result = await self.session.execute(stmt)
        fan = result.scalars().first()
        
        if not fan:
            return {}
        
        # Get interaction breakdown
        interaction_stmt = select(
            Interaction.sentiment,
            func.count(Interaction.id).label('count')
        ).where(
            Interaction.fan_id == fan_id
        ).group_by(Interaction.sentiment)
        
        result = await self.session.execute(interaction_stmt)
        sentiment_breakdown = {row.sentiment: row.count for row in result}
        
        return {
            'fan_id': str(fan.id),
            'username': fan.username,
            'engagement_score': fan.engagement_score,
            'total_interactions': fan.total_interactions,
            'avg_sentiment': fan.avg_sentiment,
            'is_superfan': fan.is_superfan,
            'is_vip': fan.is_vip,
            'platforms': fan.platforms,
            'first_interaction': fan.first_interaction_at.isoformat() if fan.first_interaction_at else None,
            'last_interaction': fan.last_interaction_at.isoformat() if fan.last_interaction_at else None,
            'sentiment_breakdown': sentiment_breakdown
        }


def get_fan_identification_service(session: AsyncSession) -> FanIdentificationService:
    """Get fan identification service instance."""
    return FanIdentificationService(session)
