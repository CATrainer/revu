"""AI-powered view classification service.

This service evaluates interactions against AI view criteria using LLM.
"""
import hashlib
import logging
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
    """Service for classifying interactions against AI view criteria.
    
    Uses LLM to evaluate whether an interaction matches a view's
    natural language criteria.
    """
    
    def __init__(self, session: AsyncSession):
        self.session = session
        self.client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.model = "claude-3-haiku-20240307"  # Fast and cheap for classification
    
    @staticmethod
    def compute_prompt_hash(prompt: str) -> str:
        """Compute a hash of the prompt for change detection."""
        return hashlib.sha256(prompt.encode()).hexdigest()[:64]
    
    async def classify_interaction(
        self,
        interaction: Interaction,
        view: InteractionView
    ) -> Tuple[bool, float]:
        """Classify a single interaction against a view's AI criteria.
        
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
        """Classify an interaction against all AI views for a user.
        
        Args:
            interaction: The interaction to classify
            user_id: The user whose views to check
            
        Returns:
            List of created/updated view tags
        """
        # Get all AI-filtered custom views for this user
        result = await self.session.execute(
            select(InteractionView).where(
                and_(
                    InteractionView.user_id == user_id,
                    InteractionView.filter_mode == 'ai',
                    InteractionView.is_system == False,
                    InteractionView.ai_prompt.isnot(None)
                )
            )
        )
        views = list(result.scalars().all())
        
        if not views:
            return []
        
        tags = []
        for view in views:
            matches, confidence = await self.classify_interaction(interaction, view)
            
            # Create or update the tag
            tag = await self._upsert_view_tag(
                interaction_id=interaction.id,
                view_id=view.id,
                matches=matches,
                confidence=confidence,
                prompt_hash=self.compute_prompt_hash(view.ai_prompt)
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
        """Tag all interactions for a newly created or updated AI view.
        
        This is called when a new AI view is created or when the prompt changes.
        
        Args:
            view: The AI view to tag interactions for
            batch_size: Number of interactions to process at once
            
        Returns:
            Number of interactions tagged
        """
        if view.filter_mode != 'ai' or not view.ai_prompt:
            return 0
        
        prompt_hash = self.compute_prompt_hash(view.ai_prompt)
        
        # Update the view's prompt hash
        view.ai_prompt_hash = prompt_hash
        
        # Get all interactions for this user that haven't been tagged for this view
        # or were tagged with a different prompt hash
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
                
                # Skip if already tagged with same prompt
                if existing and existing.prompt_hash == prompt_hash:
                    continue
                
                # Classify and tag
                matches, confidence = await self.classify_interaction(interaction, view)
                await self._upsert_view_tag(
                    interaction_id=interaction.id,
                    view_id=view.id,
                    matches=matches,
                    confidence=confidence,
                    prompt_hash=prompt_hash
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
