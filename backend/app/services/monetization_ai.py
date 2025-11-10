"""AI service for monetization engine using Claude with streaming support."""

import os
import json
import asyncio
from typing import AsyncGenerator, Dict, Any, List, Optional
from datetime import datetime

from anthropic import AsyncAnthropic
from loguru import logger

from app.core.config import settings


class MonetizationAIService:
    """Claude-powered AI service for monetization guidance with streaming."""
    
    def __init__(self):
        api_key = os.getenv("CLAUDE_API_KEY", getattr(settings, "CLAUDE_API_KEY", None))
        if not api_key:
            raise ValueError("CLAUDE_API_KEY not configured")
        
        self.client = AsyncAnthropic(api_key=api_key)
        self.model = "claude-sonnet-4-20250514"
        self.max_tokens = 4096
        self.temperature = 0.7
    
    def _build_system_prompt(self, creator_profile: Optional[Dict] = None) -> str:
        """Build system prompt with creator context."""
        
        base_prompt = """You are a monetization execution partner for content creators. Your role is to help them launch a Premium Community (Discord/Circle membership) in 30 minutes of focused work.

**Your Personality:**
- Straight-shooting and data-backed
- Action-oriented, not theoretical
- Encouraging but realistic
- You push for decisions and progress

**Your Approach:**
1. Ask ONE focused question at a time
2. Give specific, actionable advice based on their data
3. Help them make the 5 key decisions: platform, pricing, structure, timeline, content
4. Track their progress through 22 implementation tasks
5. Celebrate wins and keep momentum

**Key Decisions to Guide:**
1. **Platform**: Discord (free, gaming-friendly) vs Circle ($89/mo, premium UX)
2. **Pricing**: $27-47/month single tier to start (with founding member discount)
3. **Structure**: Single tier initially, can add more later
4. **Timeline**: Target launch date (realistic based on their availability)
5. **Content**: Specific value proposition (not vague "exclusive content")

**Communication Style:**
- Be concise (2-3 sentences max per response unless explaining a concept)
- Use data from their profile to back recommendations
- Ask clarifying questions when needed
- Use bullet points for clarity
- Avoid jargon unless they use it first

**Progress Tracking:**
- Acknowledge when they make a decision
- Suggest next logical step
- Reference their customized plan phases
- Keep them moving forward

Remember: You're a partner, not a consultant. Your goal is tangible progress, not perfect plans."""

        if creator_profile:
            context = f"""

**Creator Context:**
- Platform: {creator_profile.get('primary_platform', 'Unknown')}
- Followers: {creator_profile.get('follower_count', 0):,}
- Engagement Rate: {creator_profile.get('engagement_rate', 0)}%
- Niche: {creator_profile.get('niche', 'Unknown')}
- Time Available: {creator_profile.get('time_available_hours_per_week', 'Unknown')} hours/week

Use this data to personalize your recommendations."""
            base_prompt += context
        
        return base_prompt
    
    async def stream_chat_response(
        self,
        messages: List[Dict[str, str]],
        creator_profile: Optional[Dict] = None,
        project_context: Optional[Dict] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Stream chat response with action detection.
        
        Yields:
            - {"type": "content", "delta": str} - content chunks
            - {"type": "usage", "input_tokens": int, "output_tokens": int} - token usage
            - {"type": "done"} - completion signal
        """
        
        system_prompt = self._build_system_prompt(creator_profile)
        
        # Add project context to system if available
        if project_context:
            decisions = project_context.get('decisions', [])
            completed_tasks = project_context.get('completed_tasks', [])
            
            if decisions or completed_tasks:
                context_addition = "\n\n**Current Progress:**"
                
                if decisions:
                    context_addition += "\nDecisions Made:"
                    for d in decisions:
                        context_addition += f"\n- {d['category']}: {d['value']}"
                
                if completed_tasks:
                    context_addition += f"\nTasks Completed: {len(completed_tasks)}/22"
                
                system_prompt += context_addition
        
        try:
            # Stream from Claude
            async with self.client.messages.stream(
                model=self.model,
                max_tokens=self.max_tokens,
                temperature=self.temperature,
                system=system_prompt,
                messages=messages
            ) as stream:
                async for event in stream:
                    if event.type == "content_block_delta":
                        if hasattr(event.delta, "text"):
                            yield {
                                "type": "content",
                                "delta": event.delta.text
                            }
                    elif event.type == "message_stop":
                        # Get final message for usage stats
                        final_message = await stream.get_final_message()
                        yield {
                            "type": "usage",
                            "input_tokens": final_message.usage.input_tokens,
                            "output_tokens": final_message.usage.output_tokens
                        }
                
                yield {"type": "done"}
        
        except Exception as e:
            logger.error(f"Error streaming from Claude: {e}")
            yield {
                "type": "error",
                "message": str(e)
            }
    
    async def generate_welcome_message(
        self,
        creator_profile: Dict,
        opportunity_data: Dict
    ) -> Dict[str, Any]:
        """Generate personalized welcome message for new project.
        
        Returns:
            {
                "content": str,
                "input_tokens": int,
                "output_tokens": int
            }
        """
        
        system_prompt = """You are welcoming a creator to their Premium Community launch project. 
        
Your message should:
1. Acknowledge their specific metrics (followers, engagement)
2. Explain why this opportunity fits them (2-3 data-backed reasons)
3. Set expectations for the session (30 min, 5 decisions, tangible progress)
4. Ask the first question to get started

Keep it under 150 words. Be energetic but professional."""
        
        # Extract values with defaults to handle None
        platform = creator_profile.get('primary_platform') or 'your platform'
        follower_count = creator_profile.get('follower_count') or 0
        engagement_rate = creator_profile.get('engagement_rate') or 0
        niche = creator_profile.get('niche') or 'your niche'

        title = opportunity_data.get('title') or 'this opportunity'
        revenue_min = opportunity_data.get('revenue_min') or 0
        revenue_max = opportunity_data.get('revenue_max') or 0
        timeline = opportunity_data.get('timeline') or 'TBD'

        user_prompt = f"""Creator Profile:
- Platform: {platform}
- Followers: {follower_count:,}
- Engagement: {engagement_rate}%
- Niche: {niche}

Opportunity: {title}
Revenue Range: ${revenue_min:,} - ${revenue_max:,}/month
Timeline: {timeline}

Write the welcome message and first question."""
        
        try:
            response = await self.client.messages.create(
                model=self.model,
                max_tokens=500,
                temperature=0.7,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}]
            )
            
            content = response.content[0].text if response.content else ""
            
            return {
                "content": content,
                "input_tokens": response.usage.input_tokens,
                "output_tokens": response.usage.output_tokens
            }
        
        except Exception as e:
            logger.error(f"Error generating welcome message: {e}")
            # Fallback message using already extracted values
            return {
                "content": f"Welcome! Let's launch your Premium Community. With {follower_count:,} followers and {engagement_rate}% engagement, you're in a great position. First question: Have you thought about which platform you'd prefer - Discord (free, gaming-friendly) or Circle ($89/mo, premium UX)?",
                "input_tokens": 0,
                "output_tokens": 0
            }


# Singleton instance
_ai_service: Optional[MonetizationAIService] = None

def get_ai_service() -> MonetizationAIService:
    """Get or create AI service singleton."""
    global _ai_service
    if _ai_service is None:
        _ai_service = MonetizationAIService()
    return _ai_service
