"""View classification service for tagging interactions.

This service evaluates interactions against view criteria:
- AI views: Uses LLM to evaluate natural language criteria
- Manual views: Uses keyword/filter matching locally (no LLM needed)
"""
import hashlib
import json
import logging
import re
from datetime import datetime
from typing import List, Optional, Dict, Any, Tuple
from uuid import UUID

from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from anthropic import AsyncAnthropic

from app.models.interaction import Interaction
from app.models.view import InteractionView
from app.models.view_tag import InteractionViewTag
from app.core.config import settings

logger = logging.getLogger(__name__)


class ViewClassifierService:
    """Service for classifying interactions against view criteria.
    
    Handles both AI views (using LLM) and manual views (using keyword matching).
    """
    
    def __init__(self, session: AsyncSession):
        self.session = session
        self.client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.model = "claude-3-haiku-20240307"  # Fast and cheap for classification
    
    @staticmethod
    def compute_filter_hash(filters: dict) -> str:
        """Compute a hash of the filters for change detection."""
        return hashlib.sha256(json.dumps(filters, sort_keys=True).encode()).hexdigest()[:64]
    
    @staticmethod
    def compute_prompt_hash(prompt: str) -> str:
        """Compute a hash of the prompt for change detection."""
        return hashlib.sha256(prompt.encode()).hexdigest()[:64]
    
    def classify_interaction_manual(
        self,
        interaction: Interaction,
        view: InteractionView
    ) -> Tuple[bool, float]:
        """Classify an interaction against a manual view's filters (no LLM).
        
        Args:
            interaction: The interaction to classify
            view: The view with manual filters
            
        Returns:
            Tuple of (matches: bool, confidence: float)
        """
        filters = view.filters or {}
        
        # If no filters defined, it matches everything
        if not filters:
            return True, 1.0
        
        content_lower = (interaction.content or '').lower()
        
        # Check platform filter
        if 'platforms' in filters and filters['platforms']:
            if interaction.platform not in filters['platforms']:
                return False, 1.0
        
        # Check interaction type filter
        if 'types' in filters and filters['types']:
            if interaction.type not in filters['types']:
                return False, 1.0
        
        # Check keyword filter (any keyword matches)
        if 'keywords' in filters and filters['keywords']:
            keywords = [k.lower() for k in filters['keywords']]
            keyword_match = any(kw in content_lower for kw in keywords)
            if not keyword_match:
                return False, 1.0
        
        # Check sentiment filter
        if 'sentiment' in filters and filters['sentiment']:
            if interaction.sentiment != filters['sentiment']:
                return False, 1.0
        
        # Check status filter
        if 'status' in filters and filters['status']:
            if interaction.status not in filters['status']:
                return False, 1.0
        
        # Check categories filter
        if 'categories' in filters and filters['categories']:
            interaction_categories = interaction.categories or []
            category_match = any(cat in interaction_categories for cat in filters['categories'])
            if not category_match:
                return False, 1.0
        
        # Check priority filter
        if 'priority_min' in filters and filters['priority_min']:
            if (interaction.priority_score or 0) < filters['priority_min']:
                return False, 1.0
        
        if 'priority_max' in filters and filters['priority_max']:
            if (interaction.priority_score or 100) > filters['priority_max']:
                return False, 1.0
        
        # Check tags filter
        if 'tags' in filters and filters['tags']:
            interaction_tags = interaction.tags or []
            tag_match = any(tag in interaction_tags for tag in filters['tags'])
            if not tag_match:
                return False, 1.0
        
        # Check author username filter
        if 'author_username' in filters and filters['author_username']:
            if interaction.author_username != filters['author_username']:
                return False, 1.0
        
        # Check has_replies filter
        if 'has_replies' in filters and filters['has_replies'] is not None:
            has_replies = (interaction.reply_count or 0) > 0
            if has_replies != filters['has_replies']:
                return False, 1.0
        
        # Check is_unread filter
        if 'is_unread' in filters and filters['is_unread'] is not None:
            is_unread = interaction.status == 'unread'
            if is_unread != filters['is_unread']:
                return False, 1.0
        
        # All filters passed
        return True, 1.0
    
    async def classify_interaction_ai(
        self,
        interaction: Interaction,
        view: InteractionView
    ) -> Tuple[bool, float]:
        """Classify a single interaction against a view's AI criteria using LLM.
        
        Args:
            interaction: The interaction to classify
            view: The view with AI criteria
            
        Returns:
            Tuple of (matches: bool, confidence: float)
        """
        if not view.ai_prompt:
            return False, 0.0
        
        # Build context about the interaction
        interaction_context = self._build_interaction_context(interaction)
        
        # Build the classification prompt
        prompt = f"""You are a classification assistant. Your task is to determine if a social media interaction matches specific criteria.

CRITERIA TO MATCH:
{view.ai_prompt}

INTERACTION TO EVALUATE:
{interaction_context}

INSTRUCTIONS:
1. Carefully read the criteria and the interaction
2. Determine if this interaction matches the criteria
3. Respond with ONLY a JSON object in this exact format:
{{"matches": true/false, "confidence": 0.0-1.0, "reason": "brief explanation"}}

Be strict but fair. If the interaction clearly relates to the criteria, it matches.
If it's ambiguous or unrelated, it doesn't match.

Response:"""

        try:
            response = await self.client.messages.create(
                model=self.model,
                max_tokens=150,
                messages=[{"role": "user", "content": prompt}]
            )
            
            # Parse the response
            result_text = response.content[0].text.strip()
            
            # Extract JSON from response
            import json
            try:
                # Try to parse as JSON directly
                result = json.loads(result_text)
                matches = result.get("matches", False)
                confidence = float(result.get("confidence", 0.5))
                return matches, confidence
            except json.JSONDecodeError:
                # Fallback: look for true/false in response
                lower_text = result_text.lower()
                if '"matches": true' in lower_text or '"matches":true' in lower_text:
                    return True, 0.7
                elif '"matches": false' in lower_text or '"matches":false' in lower_text:
                    return False, 0.7
                else:
                    logger.warning(f"Could not parse classification response: {result_text}")
                    return False, 0.0
                    
        except Exception as e:
            logger.error(f"Classification failed: {e}")
            return False, 0.0
    
    def _build_interaction_context(self, interaction: Interaction) -> str:
        """Build a text description of the interaction for the LLM."""
        parts = []
        
        parts.append(f"Platform: {interaction.platform}")
        parts.append(f"Type: {interaction.type}")
        parts.append(f"Content: {interaction.content}")
        
        if interaction.author_username:
            parts.append(f"Author: @{interaction.author_username}")
        if interaction.author_follower_count:
            parts.append(f"Author followers: {interaction.author_follower_count:,}")
        if interaction.author_is_verified:
            parts.append("Author is verified")
            
        if interaction.parent_content_title:
            parts.append(f"Replying to: {interaction.parent_content_title}")
            
        if interaction.sentiment:
            parts.append(f"Sentiment: {interaction.sentiment}")
        if interaction.categories:
            parts.append(f"Categories: {', '.join(interaction.categories)}")
            
        return "\n".join(parts)
    
    async def classify_interaction_for_all_views(
        self,
        interaction: Interaction,
        user_id: UUID
    ) -> List[InteractionViewTag]:
        """Classify an interaction against ALL custom views for a user.
        
        - AI views: Uses LLM classification
        - Manual views: Uses keyword/filter matching (no LLM)
        
        Args:
            interaction: The interaction to classify
            user_id: The user whose views to check
            
        Returns:
            List of created/updated view tags
        """
        # Get all custom views for this user (both AI and manual)
        result = await self.session.execute(
            select(InteractionView).where(
                and_(
                    InteractionView.user_id == user_id,
                    InteractionView.is_system == False
                )
            )
        )
        views = list(result.scalars().all())
        
        if not views:
            return []
        
        tags = []
        for view in views:
            # Determine filter mode and classify accordingly
            filter_mode = view.filter_mode or 'manual'
            
            if filter_mode == 'ai' and view.ai_prompt:
                # AI view - use LLM
                matches, confidence = await self.classify_interaction_ai(interaction, view)
                prompt_hash = self.compute_prompt_hash(view.ai_prompt)
            else:
                # Manual view - use keyword matching
                matches, confidence = self.classify_interaction_manual(interaction, view)
                prompt_hash = self.compute_filter_hash(view.filters or {})
            
            # Create or update the tag
            tag = await self._upsert_view_tag(
                interaction_id=interaction.id,
                view_id=view.id,
                matches=matches,
                confidence=confidence,
                prompt_hash=prompt_hash
            )
            tags.append(tag)
        
        await self.session.flush()
        return tags
    
    async def _upsert_view_tag(
        self,
        interaction_id: UUID,
        view_id: UUID,
        matches: bool,
        confidence: float,
        prompt_hash: str
    ) -> InteractionViewTag:
        """Create or update a view tag."""
        # Check if tag exists
        result = await self.session.execute(
            select(InteractionViewTag).where(
                and_(
                    InteractionViewTag.interaction_id == interaction_id,
                    InteractionViewTag.view_id == view_id
                )
            )
        )
        existing = result.scalar_one_or_none()
        
        if existing:
            existing.matches = matches
            existing.confidence = confidence
            existing.evaluated_at = datetime.utcnow()
            existing.prompt_hash = prompt_hash
            return existing
        else:
            tag = InteractionViewTag(
                interaction_id=interaction_id,
                view_id=view_id,
                matches=matches,
                confidence=confidence,
                evaluated_at=datetime.utcnow(),
                prompt_hash=prompt_hash
            )
            self.session.add(tag)
            return tag
    
    async def tag_all_interactions_for_view(
        self,
        view: InteractionView,
        batch_size: int = 50
    ) -> int:
        """Tag all interactions for a newly created or updated view.
        
        Works for both AI and manual views.
        
        Args:
            view: The view to tag interactions for
            batch_size: Number of interactions to process at once
            
        Returns:
            Number of interactions tagged
        """
        filter_mode = view.filter_mode or 'manual'
        
        # Compute the hash for change detection
        if filter_mode == 'ai' and view.ai_prompt:
            current_hash = self.compute_prompt_hash(view.ai_prompt)
            view.ai_prompt_hash = current_hash
        else:
            current_hash = self.compute_filter_hash(view.filters or {})
        
        # Get all interactions for this user
        offset = 0
        total_tagged = 0
        
        while True:
            result = await self.session.execute(
                select(Interaction).where(
                    and_(
                        Interaction.user_id == view.user_id,
                        Interaction.is_demo == False  # Only real interactions
                    )
                ).offset(offset).limit(batch_size)
            )
            interactions = list(result.scalars().all())
            
            if not interactions:
                break
            
            for interaction in interactions:
                # Check if we need to re-evaluate
                existing_tag = await self.session.execute(
                    select(InteractionViewTag).where(
                        and_(
                            InteractionViewTag.interaction_id == interaction.id,
                            InteractionViewTag.view_id == view.id
                        )
                    )
                )
                existing = existing_tag.scalar_one_or_none()
                
                # Skip if already tagged with same hash
                if existing and existing.prompt_hash == current_hash:
                    continue
                
                # Classify based on view type
                if filter_mode == 'ai' and view.ai_prompt:
                    matches, confidence = await self.classify_interaction_ai(interaction, view)
                else:
                    matches, confidence = self.classify_interaction_manual(interaction, view)
                
                await self._upsert_view_tag(
                    interaction_id=interaction.id,
                    view_id=view.id,
                    matches=matches,
                    confidence=confidence,
                    prompt_hash=current_hash
                )
                total_tagged += 1
            
            offset += batch_size
            await self.session.flush()
            
            logger.info(f"Tagged {total_tagged} interactions for view {view.id}")
        
        await self.session.commit()
        return total_tagged
    
    async def get_matching_interaction_ids(
        self,
        view_id: UUID
    ) -> List[UUID]:
        """Get all interaction IDs that match an AI view.
        
        Args:
            view_id: The view to get matches for
            
        Returns:
            List of interaction IDs that match
        """
        result = await self.session.execute(
            select(InteractionViewTag.interaction_id).where(
                and_(
                    InteractionViewTag.view_id == view_id,
                    InteractionViewTag.matches == True
                )
            )
        )
        return [row[0] for row in result.fetchall()]
