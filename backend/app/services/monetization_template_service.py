"""Service for managing monetization templates."""

from typing import List, Optional, Dict, Any
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.models.monetization_v2 import MonetizationTemplate


class MonetizationTemplateService:
    """Service for querying and managing monetization templates."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_all_templates(
        self,
        category: Optional[str] = None,
        subcategory: Optional[str] = None,
        active_only: bool = True
    ) -> List[MonetizationTemplate]:
        """Get all templates, optionally filtered by category."""
        query = select(MonetizationTemplate)
        
        if active_only:
            query = query.where(MonetizationTemplate.is_active == True)
        
        if category:
            query = query.where(MonetizationTemplate.category == category)
        
        if subcategory:
            query = query.where(MonetizationTemplate.subcategory == subcategory)
        
        query = query.order_by(
            MonetizationTemplate.category,
            MonetizationTemplate.display_order,
            MonetizationTemplate.title
        )
        
        result = await self.db.execute(query)
        return list(result.scalars().all())
    
    async def get_template_by_id(self, template_id: str) -> Optional[MonetizationTemplate]:
        """Get a single template by ID."""
        result = await self.db.execute(
            select(MonetizationTemplate).where(MonetizationTemplate.id == template_id)
        )
        return result.scalar_one_or_none()
    
    async def get_category_counts(self, active_only: bool = True) -> Dict[str, int]:
        """Get count of templates per category."""
        query = select(
            MonetizationTemplate.category,
            func.count(MonetizationTemplate.id).label("count")
        )
        
        if active_only:
            query = query.where(MonetizationTemplate.is_active == True)
        
        query = query.group_by(MonetizationTemplate.category)
        
        result = await self.db.execute(query)
        return {row.category: row.count for row in result}
    
    async def search_templates(
        self,
        min_followers: Optional[int] = None,
        niche: Optional[str] = None,
        platform: Optional[str] = None,
        revenue_model: Optional[str] = None,
        limit: int = 20
    ) -> List[MonetizationTemplate]:
        """Search templates based on creator profile criteria."""
        query = select(MonetizationTemplate).where(MonetizationTemplate.is_active == True)
        
        # Note: JSONB filtering in SQLAlchemy requires specific syntax
        # For now, we'll filter in Python after fetching
        # In production, you'd want to use proper JSONB operators
        
        if revenue_model:
            query = query.where(MonetizationTemplate.revenue_model == revenue_model)
        
        query = query.order_by(MonetizationTemplate.display_order).limit(limit * 2)  # Fetch extra for filtering
        
        result = await self.db.execute(query)
        templates = list(result.scalars().all())
        
        # Filter by JSONB fields in Python
        filtered = []
        for template in templates:
            suitable_for = template.suitable_for or {}
            
            # Check min_followers
            if min_followers is not None:
                template_min = suitable_for.get("min_followers", 0)
                if min_followers < template_min:
                    continue
            
            # Check niche
            if niche:
                template_niches = suitable_for.get("niches", [])
                if template_niches and niche.lower() not in [n.lower() for n in template_niches]:
                    continue
            
            # Check platform
            if platform:
                template_platforms = suitable_for.get("platforms", [])
                if template_platforms and platform.lower() not in [p.lower() for p in template_platforms]:
                    continue
            
            filtered.append(template)
            
            if len(filtered) >= limit:
                break
        
        return filtered
    
    async def get_templates_for_creator(
        self,
        follower_count: int,
        niche: str,
        platform: str,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Get templates suitable for a specific creator profile with fit scores."""
        all_templates = await self.get_all_templates(active_only=True)
        
        scored_templates = []
        for template in all_templates:
            score = self._calculate_fit_score(template, follower_count, niche, platform)
            if score > 0:
                scored_templates.append({
                    "template": template,
                    "fit_score": score
                })
        
        # Sort by fit score descending
        scored_templates.sort(key=lambda x: x["fit_score"], reverse=True)
        
        return scored_templates[:limit]
    
    def _calculate_fit_score(
        self,
        template: MonetizationTemplate,
        follower_count: int,
        niche: str,
        platform: str
    ) -> float:
        """Calculate how well a template fits a creator's profile (0-100)."""
        score = 50.0  # Base score
        suitable_for = template.suitable_for or {}
        
        # Follower count check (up to +30 points)
        min_followers = suitable_for.get("min_followers", 0)
        if follower_count >= min_followers:
            # More followers = higher score, but diminishing returns
            ratio = min(follower_count / max(min_followers, 1000), 10)
            score += min(30, ratio * 3)
        else:
            # Below minimum, significant penalty
            ratio = follower_count / max(min_followers, 1)
            score -= (1 - ratio) * 40
        
        # Niche match (up to +15 points)
        template_niches = [n.lower() for n in suitable_for.get("niches", [])]
        if not template_niches or niche.lower() in template_niches:
            score += 15
        elif any(niche.lower() in n or n in niche.lower() for n in template_niches):
            score += 8  # Partial match
        
        # Platform match (up to +15 points)
        template_platforms = [p.lower() for p in suitable_for.get("platforms", [])]
        if not template_platforms or platform.lower() in template_platforms:
            score += 15
        
        return max(0, min(100, score))


def get_template_service(db: AsyncSession) -> MonetizationTemplateService:
    """Dependency injection helper."""
    return MonetizationTemplateService(db)
