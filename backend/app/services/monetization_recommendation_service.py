"""AI-powered recommendation engine for monetization templates."""

from typing import List, Optional, Dict, Any
from dataclasses import dataclass
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.models.monetization_v2 import MonetizationTemplate, MonetizationProject
from app.models.monetization import CreatorProfile
from app.models.platform import PlatformConnection
from app.models.content import ContentPiece, ContentPerformance
from app.core.config import settings


@dataclass
class AggregatedCreatorProfile:
    """Aggregated creator profile for recommendations."""
    user_id: UUID
    total_followers: int
    platforms: List[str]
    primary_platform: str
    niche: str
    content_focus: List[str]
    avg_engagement_rate: float
    posting_frequency: str
    top_performing_content_types: List[str]
    existing_revenue_streams: List[str]
    audience_demographics: Optional[Dict[str, Any]] = None


@dataclass
class PersonalizedRevenue:
    """Personalized revenue estimate for a template."""
    low: int
    high: int
    unit: str
    note: str


@dataclass
class Recommendation:
    """A template recommendation with personalization."""
    template: MonetizationTemplate
    match_score: float
    personalized_description: Optional[str]
    personalized_revenue: PersonalizedRevenue
    match_reasons: List[str]


class MonetizationRecommendationService:
    """Service for generating AI-powered monetization recommendations."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def build_creator_profile(self, user_id: UUID) -> AggregatedCreatorProfile:
        """
        Build an aggregated creator profile from multiple data sources.
        """
        # Get creator profile from creator_profiles table
        creator_profile = await self._get_creator_profile(user_id)
        
        # Get platform data
        platform_data = await self._get_platform_data(user_id)
        
        # Get engagement data from content
        engagement_data = await self._get_engagement_data(user_id)
        
        # Get existing monetization projects
        existing_streams = await self._get_existing_revenue_streams(user_id)
        
        # Get top performing content types
        top_content_types = await self._get_top_content_types(user_id)
        
        # Determine posting frequency
        posting_frequency = await self._calculate_posting_frequency(user_id)
        
        # Build the aggregated profile
        return AggregatedCreatorProfile(
            user_id=user_id,
            total_followers=platform_data.get("total_followers", creator_profile.get("follower_count", 0) if creator_profile else 0),
            platforms=platform_data.get("platforms", [creator_profile.get("primary_platform")] if creator_profile else []),
            primary_platform=platform_data.get("primary_platform", creator_profile.get("primary_platform", "youtube") if creator_profile else "youtube"),
            niche=creator_profile.get("niche", "lifestyle") if creator_profile else "lifestyle",
            content_focus=creator_profile.get("content_focus", []) if creator_profile else [],
            avg_engagement_rate=engagement_data.get("avg_engagement_rate", float(creator_profile.get("engagement_rate", 0)) if creator_profile else 0.0),
            posting_frequency=posting_frequency,
            top_performing_content_types=top_content_types,
            existing_revenue_streams=existing_streams,
            audience_demographics=creator_profile.get("audience_demographics") if creator_profile else None
        )
    
    async def _get_creator_profile(self, user_id: UUID) -> Optional[Dict[str, Any]]:
        """Get creator profile from creator_profiles table."""
        result = await self.db.execute(
            select(CreatorProfile).where(CreatorProfile.user_id == user_id)
        )
        profile = result.scalar_one_or_none()
        
        if not profile:
            return None
        
        return {
            "primary_platform": profile.primary_platform,
            "follower_count": profile.follower_count,
            "engagement_rate": profile.engagement_rate,
            "niche": profile.niche,
            "audience_demographics": profile.audience_demographics,
            "content_focus": [],  # Could be derived from content analysis
        }
    
    async def _get_platform_data(self, user_id: UUID) -> Dict[str, Any]:
        """
        Get aggregated platform data from platform_connections.
        Note: platform_connections is linked via location_id, not user_id directly.
        We need to join through locations table.
        """
        # Query to get platform data through locations
        query = text("""
            SELECT 
                pc.platform,
                COALESCE((pc.account_info->>'follower_count')::int, 0) as follower_count
            FROM platform_connections pc
            JOIN locations l ON l.id = pc.location_id
            WHERE l.user_id = :user_id 
              AND pc.connection_status = 'connected'
              AND pc.is_active = true
        """)
        
        result = await self.db.execute(query, {"user_id": str(user_id)})
        rows = result.fetchall()
        
        if not rows:
            return {"platforms": [], "total_followers": 0, "primary_platform": "youtube"}
        
        platforms = []
        total_followers = 0
        max_followers = 0
        primary_platform = "youtube"
        
        for row in rows:
            platforms.append(row.platform)
            followers = row.follower_count or 0
            total_followers += followers
            if followers > max_followers:
                max_followers = followers
                primary_platform = row.platform
        
        return {
            "platforms": platforms,
            "total_followers": total_followers,
            "primary_platform": primary_platform
        }
    
    async def _get_engagement_data(self, user_id: UUID) -> Dict[str, Any]:
        """Get engagement metrics from content performance."""
        # Calculate average engagement rate from last 90 days of content
        query = text("""
            SELECT 
                AVG(
                    CASE 
                        WHEN cp.views > 0 THEN 
                            (cp.likes + cp.comments_count)::float / cp.views * 100
                        ELSE 0 
                    END
                ) as avg_engagement_rate
            FROM content_pieces c
            JOIN content_performance cp ON cp.content_id = c.id
            WHERE c.user_id = :user_id 
              AND c.published_at > NOW() - INTERVAL '90 days'
              AND c.is_deleted = false
        """)
        
        result = await self.db.execute(query, {"user_id": str(user_id)})
        row = result.fetchone()
        
        return {
            "avg_engagement_rate": float(row.avg_engagement_rate or 0) if row else 0.0
        }
    
    async def _get_existing_revenue_streams(self, user_id: UUID) -> List[str]:
        """Get categories of existing monetization projects."""
        # Check both old and new project tables
        result = await self.db.execute(
            select(MonetizationProject.template_category)
            .where(MonetizationProject.user_id == user_id)
            .where(MonetizationProject.status.in_(["active", "completed"]))
            .distinct()
        )
        categories = [row[0] for row in result.fetchall() if row[0]]
        
        return categories
    
    async def _get_top_content_types(self, user_id: UUID) -> List[str]:
        """Get top performing content types based on engagement."""
        query = text("""
            SELECT 
                c.content_type,
                AVG(cp.performance_score) as avg_score
            FROM content_pieces c
            JOIN content_performance cp ON cp.content_id = c.id
            WHERE c.user_id = :user_id 
              AND c.is_deleted = false
              AND cp.performance_score IS NOT NULL
            GROUP BY c.content_type
            ORDER BY avg_score DESC
            LIMIT 3
        """)
        
        result = await self.db.execute(query, {"user_id": str(user_id)})
        rows = result.fetchall()
        
        return [row.content_type for row in rows] if rows else []
    
    async def _calculate_posting_frequency(self, user_id: UUID) -> str:
        """Calculate posting frequency based on recent content."""
        query = text("""
            SELECT COUNT(*) as post_count
            FROM content_pieces
            WHERE user_id = :user_id 
              AND published_at > NOW() - INTERVAL '30 days'
              AND is_deleted = false
        """)
        
        result = await self.db.execute(query, {"user_id": str(user_id)})
        row = result.fetchone()
        post_count = row.post_count if row else 0
        
        if post_count >= 30:
            return "daily"
        elif post_count >= 12:
            return "several_per_week"
        elif post_count >= 4:
            return "weekly"
        elif post_count >= 2:
            return "biweekly"
        else:
            return "monthly"
    
    def score_template(
        self,
        template: MonetizationTemplate,
        profile: AggregatedCreatorProfile
    ) -> tuple[float, List[str]]:
        """
        Score a template from 0-100 based on fit with creator profile.
        Returns (score, list of match reasons).
        """
        score = 50.0  # Base score
        reasons = []
        suitable_for = template.suitable_for or {}
        
        # Follower count match (-30 to +20)
        min_followers = suitable_for.get("min_followers", 0)
        if profile.total_followers < min_followers:
            ratio = profile.total_followers / max(min_followers, 1)
            penalty = 30 * (1 - ratio)
            score -= penalty
            if ratio < 0.5:
                reasons.append(f"You're building toward the {min_followers:,} follower threshold")
        else:
            score += 20
            if profile.total_followers >= min_followers * 2:
                reasons.append(f"Your {profile.total_followers:,} followers exceed the minimum by 2x+")
            else:
                reasons.append(f"Your audience size is a great fit")
        
        # Niche match (+20)
        template_niches = [n.lower() for n in suitable_for.get("niches", [])]
        if template_niches and profile.niche.lower() in template_niches:
            score += 20
            reasons.append(f"Perfect for {profile.niche} creators")
        elif template_niches:
            # Check for partial match
            for niche in template_niches:
                if profile.niche.lower() in niche or niche in profile.niche.lower():
                    score += 10
                    reasons.append(f"Related to your {profile.niche} niche")
                    break
        
        # Platform overlap (+10 per matching platform, max +20)
        template_platforms = [p.lower() for p in suitable_for.get("platforms", [])]
        if template_platforms:
            matching_platforms = set(p.lower() for p in profile.platforms) & set(template_platforms)
            platform_bonus = min(len(matching_platforms) * 10, 20)
            score += platform_bonus
            if matching_platforms:
                reasons.append(f"Works well on {', '.join(matching_platforms)}")
        
        # Diversification bonus (+10)
        if template.category not in profile.existing_revenue_streams:
            score += 10
            if profile.existing_revenue_streams:
                reasons.append("Diversifies your income streams")
        
        # Engagement rate bonus
        if profile.avg_engagement_rate > 5.0:
            score += 15
            reasons.append(f"Your {profile.avg_engagement_rate:.1f}% engagement is excellent")
        elif profile.avg_engagement_rate > 3.0:
            score += 10
            reasons.append(f"Your {profile.avg_engagement_rate:.1f}% engagement is solid")
        elif profile.avg_engagement_rate > 1.5:
            score += 5
        
        # Posting frequency bonus for certain categories
        if profile.posting_frequency in ["daily", "several_per_week"]:
            if template.category in ["platform_features", "partnerships"]:
                score += 5
                reasons.append("Your consistent posting helps with this strategy")
        
        # Clamp to 0-100
        return max(0, min(100, score)), reasons
    
    def calculate_personalized_revenue(
        self,
        template: MonetizationTemplate,
        profile: AggregatedCreatorProfile
    ) -> PersonalizedRevenue:
        """Adjust revenue estimates based on creator's specific metrics."""
        revenue_range = template.expected_revenue_range or {}
        base_low = revenue_range.get("low", 0)
        base_high = revenue_range.get("high", 0)
        unit = revenue_range.get("unit", "per_month")
        
        suitable_for = template.suitable_for or {}
        min_followers = suitable_for.get("min_followers", 1000)
        
        # Follower multiplier (1x at min_followers, up to 3x at 10x min)
        follower_ratio = profile.total_followers / max(min_followers, 1)
        follower_multiplier = min(1 + (follower_ratio - 1) * 0.2, 3.0)
        follower_multiplier = max(follower_multiplier, 0.5)  # Floor at 0.5x
        
        # Engagement multiplier
        if profile.avg_engagement_rate > 5.0:
            engagement_multiplier = 1.3
        elif profile.avg_engagement_rate > 3.0:
            engagement_multiplier = 1.15
        elif profile.avg_engagement_rate > 1.5:
            engagement_multiplier = 1.0
        else:
            engagement_multiplier = 0.85
        
        adjusted_low = int(base_low * follower_multiplier * engagement_multiplier)
        adjusted_high = int(base_high * follower_multiplier * engagement_multiplier)
        
        # Build note
        note_parts = []
        if profile.total_followers > 0:
            note_parts.append(f"{profile.total_followers:,} followers")
        if profile.avg_engagement_rate > 0:
            note_parts.append(f"{profile.avg_engagement_rate:.1f}% engagement")
        
        note = f"Based on your {' and '.join(note_parts)}" if note_parts else "Estimated range"
        
        return PersonalizedRevenue(
            low=adjusted_low,
            high=adjusted_high,
            unit=unit,
            note=note
        )
    
    async def generate_personalized_description(
        self,
        template: MonetizationTemplate,
        profile: AggregatedCreatorProfile,
        match_reasons: List[str]
    ) -> str:
        """
        Generate a personalized description explaining why this template
        is a good fit for this specific creator.
        """
        # If we have good match reasons, use them directly without AI
        if match_reasons:
            return " ".join(match_reasons[:3]) + "."
        
        # Fallback to a simple generated description
        suitable_for = template.suitable_for or {}
        min_followers = suitable_for.get("min_followers", 0)
        
        if profile.total_followers >= min_followers * 2:
            return f"With {profile.total_followers:,} followers, you're well-positioned for this opportunity."
        elif profile.total_followers >= min_followers:
            return f"Your {profile.niche} audience on {profile.primary_platform} is a great fit."
        else:
            return f"A growth opportunity as you build toward {min_followers:,} followers."
    
    async def generate_ai_personalized_description(
        self,
        template: MonetizationTemplate,
        profile: AggregatedCreatorProfile
    ) -> str:
        """
        Generate an AI-powered personalized description.
        Uses Claude/OpenAI to create a tailored explanation.
        """
        try:
            from anthropic import AsyncAnthropic
            
            client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
            
            revenue_range = template.expected_revenue_range or {}
            suitable_for = template.suitable_for or {}
            
            prompt = f"""You are a monetization advisor. Write 2-3 sentences explaining 
why this monetization opportunity is a good fit for this creator.

TEMPLATE:
- Title: {template.title}
- Category: {template.category}
- Revenue potential: ${revenue_range.get('low', 0)}-${revenue_range.get('high', 0)}/{revenue_range.get('unit', 'month')}
- Best for: {', '.join(suitable_for.get('niches', []))}

CREATOR PROFILE:
- Followers: {profile.total_followers:,}
- Platforms: {', '.join(profile.platforms)}
- Niche: {profile.niche}
- Engagement rate: {profile.avg_engagement_rate:.1f}%

Write a personalized explanation. Reference their specific numbers.
Be direct and specific, not generic. 2-3 sentences max."""

            response = await client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=150,
                messages=[{"role": "user", "content": prompt}]
            )
            
            return response.content[0].text.strip()
            
        except Exception as e:
            logger.warning(f"AI description generation failed: {e}")
            # Fallback to non-AI description
            return await self.generate_personalized_description(template, profile, [])
    
    async def get_recommendations(
        self,
        user_id: UUID,
        limit: int = 5,
        use_ai_descriptions: bool = False
    ) -> List[Recommendation]:
        """
        Get top N template recommendations for a creator.
        """
        # 1. Build creator profile
        profile = await self.build_creator_profile(user_id)
        
        # 2. Get all active templates
        result = await self.db.execute(
            select(MonetizationTemplate)
            .where(MonetizationTemplate.is_active == True)
        )
        templates = list(result.scalars().all())
        
        # 3. Score each template
        scored = []
        for template in templates:
            score, reasons = self.score_template(template, profile)
            scored.append((template, score, reasons))
        
        # 4. Sort by score descending
        scored.sort(key=lambda x: x[1], reverse=True)
        
        # 5. Take top N
        top_templates = scored[:limit]
        
        # 6. Generate recommendations with personalization
        recommendations = []
        for template, score, reasons in top_templates:
            # Generate personalized description
            if use_ai_descriptions:
                description = await self.generate_ai_personalized_description(template, profile)
            else:
                description = await self.generate_personalized_description(template, profile, reasons)
            
            # Calculate personalized revenue
            personalized_revenue = self.calculate_personalized_revenue(template, profile)
            
            recommendations.append(Recommendation(
                template=template,
                match_score=score,
                personalized_description=description,
                personalized_revenue=personalized_revenue,
                match_reasons=reasons
            ))
        
        return recommendations
    
    async def get_recommendations_by_category(
        self,
        user_id: UUID,
        category: str,
        limit: int = 5
    ) -> List[Recommendation]:
        """Get recommendations filtered by category."""
        profile = await self.build_creator_profile(user_id)
        
        result = await self.db.execute(
            select(MonetizationTemplate)
            .where(MonetizationTemplate.is_active == True)
            .where(MonetizationTemplate.category == category)
        )
        templates = list(result.scalars().all())
        
        scored = []
        for template in templates:
            score, reasons = self.score_template(template, profile)
            scored.append((template, score, reasons))
        
        scored.sort(key=lambda x: x[1], reverse=True)
        top_templates = scored[:limit]
        
        recommendations = []
        for template, score, reasons in top_templates:
            description = await self.generate_personalized_description(template, profile, reasons)
            personalized_revenue = self.calculate_personalized_revenue(template, profile)
            
            recommendations.append(Recommendation(
                template=template,
                match_score=score,
                personalized_description=description,
                personalized_revenue=personalized_revenue,
                match_reasons=reasons
            ))
        
        return recommendations


def get_recommendation_service(db: AsyncSession) -> MonetizationRecommendationService:
    """Dependency injection helper."""
    return MonetizationRecommendationService(db)
