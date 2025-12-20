"""Response Generator - AI-powered response generation with smart length and context."""
from datetime import datetime
from typing import Optional, Dict, Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.models.interaction import Interaction
from app.models.user import User


class ResponseGenerator:
    """Generates AI responses with proper context and smart length.
    
    Key features:
    1. Rich context (creator profile, post/video info, conversation history)
    2. Smart length - as short as possible, but longer when warranted
    3. Proper regeneration with different output
    4. Platform-appropriate responses
    """
    
    def __init__(self, session: AsyncSession):
        self.session = session
        self._anthropic_client = None
    
    @property
    def anthropic_client(self):
        """Lazy-load Anthropic client."""
        if self._anthropic_client is None:
            from anthropic import AsyncAnthropic
            import os
            self._anthropic_client = AsyncAnthropic(
                api_key=os.getenv("ANTHROPIC_API_KEY")
            )
        return self._anthropic_client
    
    async def generate_response(
        self,
        interaction: Interaction,
        user_id: UUID,
        tone: str = "friendly",
        previous_response: Optional[str] = None,
    ) -> str:
        """Generate a response for an interaction.
        
        Args:
            interaction: The interaction to respond to
            user_id: The creator's user ID
            tone: Desired tone (friendly, professional, casual, warm)
            previous_response: Previous response to avoid (for regeneration)
            
        Returns:
            Generated response text
        """
        # Get creator context
        user = await self.session.get(User, user_id)
        creator_context = await self._build_creator_context(user)
        
        # Build interaction context
        interaction_context = self._build_interaction_context(interaction)
        
        # Determine appropriate length
        length_guidance = self._determine_length(interaction)
        
        # Build the prompt
        system_prompt = self._build_system_prompt(creator_context, tone, length_guidance)
        user_prompt = self._build_user_prompt(interaction, interaction_context, previous_response)
        
        # Adjust temperature for regeneration
        temperature = 0.8 if previous_response else 0.7
        
        try:
            response = await self.anthropic_client.messages.create(
                model="claude-3-5-sonnet-latest",
                max_tokens=200,  # Keep responses short
                temperature=temperature,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}]
            )
            
            generated_text = response.content[0].text.strip()
            
            # Clean up the response
            generated_text = self._clean_response(generated_text)
            
            logger.info(f"Generated response for interaction {interaction.id}: {len(generated_text)} chars")
            return generated_text
            
        except Exception as e:
            logger.error(f"Error generating response: {e}")
            raise
    
    async def _build_creator_context(self, user: Optional[User]) -> Dict[str, Any]:
        """Build context about the creator."""
        if not user:
            return {
                "name": "Creator",
                "niche": "content creation",
                "tone": "friendly and warm",
                "style": "casual but professional",
            }
        
        # Try to get creator profile for more context
        from app.models.monetization import CreatorProfile
        result = await self.session.execute(
            select(CreatorProfile).where(CreatorProfile.user_id == user.id)
        )
        profile = result.scalar_one_or_none()
        
        return {
            "name": user.full_name or user.email.split("@")[0],
            "niche": profile.niche if profile else "content creation",
            "tone": "friendly and warm",
            "style": "casual but professional",
        }
    
    def _build_interaction_context(self, interaction: Interaction) -> Dict[str, Any]:
        """Build context about the interaction."""
        context = {
            "platform": interaction.platform,
            "type": interaction.type,
            "author": {
                "username": interaction.author_username,
                "name": interaction.author_name,
                "follower_count": interaction.author_follower_count,
                "is_verified": interaction.author_is_verified,
            },
        }
        
        # Add post/video context if available
        if interaction.parent_content_title:
            context["content"] = {
                "title": interaction.parent_content_title,
                "url": interaction.parent_content_url,
                "view_count": interaction.parent_content_view_count,
            }
        
        # Add conversation history for DMs
        if interaction.type == "dm" and interaction.conversation_history:
            context["conversation"] = interaction.conversation_history
        
        return context
    
    def _determine_length(self, interaction: Interaction) -> str:
        """Determine appropriate response length based on interaction type and content."""
        content = interaction.content.lower()
        
        # DMs generally warrant longer responses
        if interaction.type == "dm":
            # Check if it's a detailed question or collaboration inquiry
            if any(word in content for word in ["collaborate", "partnership", "business", "opportunity", "proposal"]):
                return "medium"  # 2-3 sentences
            return "short_to_medium"  # 1-2 sentences
        
        # Comments are usually shorter
        if interaction.type == "comment":
            # Questions might need more detail
            if "?" in content or any(word in content for word in ["how", "what", "why", "when", "where", "can you"]):
                return "short_to_medium"  # 1-2 sentences
            
            # Simple appreciation/thanks
            if any(word in content for word in ["love", "amazing", "great", "awesome", "thank"]):
                return "very_short"  # 1 sentence max
            
            return "short"  # 1-2 sentences
        
        # Mentions
        if interaction.type == "mention":
            return "short"
        
        return "short"
    
    def _build_system_prompt(self, creator_context: Dict[str, Any], tone: str, length: str) -> str:
        """Build the system prompt for response generation."""
        length_instructions = {
            "very_short": "Keep your response to ONE short sentence maximum. Be warm but brief.",
            "short": "Keep your response to 1-2 short sentences maximum.",
            "short_to_medium": "Keep your response to 1-2 sentences. Add a bit more detail if the question warrants it.",
            "medium": "Keep your response to 2-3 sentences. Be helpful and thorough but still concise.",
        }
        
        return f"""You are responding on behalf of {creator_context['name']}, a content creator in the {creator_context['niche']} space.

CREATOR STYLE:
- Tone: {creator_context['tone']}
- Style: {creator_context['style']}
- Requested tone for this response: {tone}

STRICT RULES:
1. {length_instructions.get(length, length_instructions['short'])}
2. Sound genuinely human - not corporate or robotic
3. Be warm and appreciative of the person's engagement
4. Never be promotional or salesy
5. No hashtags
6. Maximum 1 emoji (only if it feels natural, not required)
7. Don't start with "Hey!" or "Hi there!" - vary your openings
8. Match the energy of the original message
9. If they asked a question, actually answer it
10. Never say "I appreciate you reaching out" or similar generic phrases"""
    
    def _build_user_prompt(
        self,
        interaction: Interaction,
        context: Dict[str, Any],
        previous_response: Optional[str]
    ) -> str:
        """Build the user prompt for response generation."""
        prompt_parts = [f"Generate a response to this {interaction.type} on {interaction.platform}.\n"]
        
        # Add content context
        if context.get("content"):
            prompt_parts.append(f"POST/VIDEO CONTEXT:")
            prompt_parts.append(f"- Title: {context['content']['title']}")
            if context['content'].get('view_count'):
                prompt_parts.append(f"- Views: {context['content']['view_count']:,}")
            prompt_parts.append("")
        
        # Add conversation history for DMs
        if context.get("conversation"):
            prompt_parts.append("CONVERSATION HISTORY:")
            for msg in context["conversation"][-5:]:  # Last 5 messages
                sender = "You" if msg.get("sender") == "creator" else "Them"
                prompt_parts.append(f"[{sender}]: {msg.get('content', '')}")
            prompt_parts.append("")
        
        # Add author info
        author = context.get("author", {})
        prompt_parts.append("FROM:")
        prompt_parts.append(f"- @{author.get('username', 'unknown')}")
        if author.get("follower_count"):
            prompt_parts.append(f"- Followers: {author['follower_count']:,}")
        if author.get("is_verified"):
            prompt_parts.append("- ✓ Verified account")
        prompt_parts.append("")
        
        # Add the message
        prompt_parts.append("THEIR MESSAGE:")
        prompt_parts.append(f'"{interaction.content}"')
        
        # Add regeneration instruction
        if previous_response:
            prompt_parts.append("")
            prompt_parts.append("IMPORTANT: Generate a DIFFERENT response than this previous one:")
            prompt_parts.append(f'"{previous_response}"')
            prompt_parts.append("Use different wording, structure, and approach.")
        
        return "\n".join(prompt_parts)
    
    def _clean_response(self, text: str) -> str:
        """Clean up the generated response."""
        # Remove quotes if the AI wrapped the response in them
        if text.startswith('"') and text.endswith('"'):
            text = text[1:-1]
        
        # Remove common AI prefixes
        prefixes_to_remove = [
            "Here's a response:",
            "Response:",
            "Here's my response:",
            "Sure!",
            "Of course!",
        ]
        for prefix in prefixes_to_remove:
            if text.lower().startswith(prefix.lower()):
                text = text[len(prefix):].strip()
        
        return text.strip()


def get_response_generator(session: AsyncSession) -> ResponseGenerator:
    """Factory function to get a ResponseGenerator instance."""
    return ResponseGenerator(session)
