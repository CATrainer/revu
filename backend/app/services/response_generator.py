"""Response Generator - AI-powered response generation optimized for authenticity.

Philosophy: Responses should be indistinguishable from what a busy, genuine creator 
would actually type. Short, natural, no fluff, no AI tells.
"""
from datetime import datetime
from typing import Optional, Dict, Any, Tuple
from uuid import UUID
import re

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.models.interaction import Interaction
from app.models.user import User


class ResponseGenerator:
    """Generates authentic, human-like responses.
    
    Core principles:
    1. Mirror the incoming message's length and energy
    2. No emojis unless they used them first
    3. Never use names - too formal
    4. Short sentences, no compound structures
    5. Aggressive post-processing to catch AI-isms
    """
    
    # Phrases that scream "AI wrote this" - will be caught and rejected
    AI_TELLS = [
        # Gratitude patterns
        r"(?i)^thanks?\s+(?:so\s+much\s+)?for\s+(?:sharing|reaching|your|the)",
        r"(?i)i\s+(?:really\s+)?appreciate\s+(?:you|your|this|that)",
        r"(?i)that\s+(?:really\s+)?means\s+(?:so\s+much|a\s+lot)",
        r"(?i)i'?m\s+(?:so\s+)?glad\s+(?:you|to|that)",
        r"(?i)thank\s+you\s+for\s+(?:taking\s+the\s+time|your\s+kind)",
        
        # Overly enthusiastic openers
        r"(?i)^(?:absolutely|definitely|certainly|of\s+course)!",
        r"(?i)^(?:hey\s+there|hi\s+there|hello\s+there)!?",
        r"(?i)^what\s+a\s+(?:great|wonderful|lovely|amazing)",
        
        # Corporate/formal patterns
        r"(?i)i'?m\s+(?:happy|thrilled|excited|delighted)\s+to",
        r"(?i)please\s+(?:don't\s+hesitate|feel\s+free)\s+to",
        r"(?i)if\s+you\s+have\s+any\s+(?:questions|concerns)",
        r"(?i)i\s+hope\s+(?:this\s+helps|that\s+helps|you)",
        r"(?i)let\s+me\s+know\s+if\s+(?:you\s+need|there's)",
        
        # Filler phrases
        r"(?i)i\s+completely\s+understand",
        r"(?i)that's\s+(?:a\s+)?(?:great|excellent|wonderful)\s+(?:question|point)",
        r"(?i)i\s+(?:totally\s+)?get\s+(?:where\s+you're|what\s+you)",
        
        # Name usage (we'll also check dynamically)
        r"(?i)^(?:hey|hi|hello)\s+[A-Z][a-z]+[,!]",
    ]
    
    # Max tokens by length category - strict limits
    MAX_TOKENS = {
        "micro": 25,      # 3-5 words
        "very_short": 40, # One short sentence
        "short": 60,      # 1-2 short sentences  
        "medium": 100,    # 2-3 sentences for complex questions
    }
    
    def __init__(self, session: AsyncSession):
        self.session = session
        self._anthropic_client = None
    
    @property
    def anthropic_client(self):
        """Lazy-load Anthropic client."""
        if self._anthropic_client is None:
            from anthropic import AsyncAnthropic
            from app.core.config import settings
            
            api_key = settings.EFFECTIVE_ANTHROPIC_KEY
            if not api_key:
                raise ValueError(
                    "Anthropic API key not configured. "
                    "Set ANTHROPIC_API_KEY or CLAUDE_API_KEY environment variable."
                )
            
            self._anthropic_client = AsyncAnthropic(api_key=api_key)
        return self._anthropic_client
    
    async def generate_response(
        self,
        interaction: Interaction,
        user_id: UUID,
        tone: str = "friendly",
        previous_response: Optional[str] = None,
    ) -> str:
        """Generate an authentic response for an interaction."""
        # Get creator context
        user = await self.session.get(User, user_id)
        creator_context = await self._build_creator_context(user)
        
        # Analyze incoming message
        message_analysis = self._analyze_incoming_message(interaction)
        
        # Determine length based on their message
        length_category, max_tokens = self._determine_length(interaction, message_analysis)
        
        # Build prompts
        system_prompt = self._build_system_prompt(
            creator_context, tone, length_category, message_analysis
        )
        user_prompt = self._build_user_prompt(
            interaction, message_analysis, previous_response
        )
        
        # Temperature: slightly higher for regeneration
        temperature = 0.85 if previous_response else 0.75
        
        try:
            from app.core.config import settings
            model = settings.CLAUDE_MODEL or "claude-sonnet-4-20250514"
            
            response = await self.anthropic_client.messages.create(
                model=model,
                max_tokens=max_tokens,
                temperature=temperature,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}]
            )
            
            generated_text = response.content[0].text.strip()
            
            # Aggressive post-processing
            generated_text = self._clean_response(generated_text, interaction)
            
            # Validate - if it has AI tells, log warning
            if self._has_ai_tells(generated_text, interaction):
                logger.warning(f"Response may have AI tells: {generated_text[:100]}...")
            
            logger.info(
                f"Generated response for {interaction.id}: "
                f"{len(generated_text)} chars, {len(generated_text.split())} words"
            )
            return generated_text
            
        except Exception as e:
            logger.error(f"Error generating response: {e}")
            raise
    
    def _analyze_incoming_message(self, interaction: Interaction) -> Dict[str, Any]:
        """Analyze the incoming message to inform response style."""
        content = interaction.content
        
        # Count words
        word_count = len(content.split())
        
        # Check for emojis
        emoji_pattern = re.compile(
            "["
            "\U0001F600-\U0001F64F"  # emoticons
            "\U0001F300-\U0001F5FF"  # symbols & pictographs
            "\U0001F680-\U0001F6FF"  # transport & map
            "\U0001F1E0-\U0001F1FF"  # flags
            "\U00002702-\U000027B0"
            "\U000024C2-\U0001F251"
            "]+", 
            flags=re.UNICODE
        )
        has_emojis = bool(emoji_pattern.search(content))
        
        # Check for question
        is_question = "?" in content or any(
            content.lower().startswith(w) 
            for w in ["how", "what", "why", "when", "where", "who", "can", "could", "would", "do", "does", "is", "are"]
        )
        
        # Check for simple appreciation (short positive message)
        appreciation_words = ["love", "amazing", "great", "awesome", "fire", "goat", "best", "incredible", "perfect", "beautiful"]
        is_simple_appreciation = (
            word_count <= 8 and 
            any(word in content.lower() for word in appreciation_words) and
            not is_question
        )
        
        # Check exclamation energy
        exclamation_count = content.count("!")
        high_energy = exclamation_count >= 2 or content.isupper()
        
        # Check if it's a collaboration/business inquiry
        business_words = ["collab", "collaborate", "partnership", "sponsor", "business", "brand", "deal", "opportunity", "work together", "reach out"]
        is_business = any(word in content.lower() for word in business_words)
        
        return {
            "word_count": word_count,
            "has_emojis": has_emojis,
            "is_question": is_question,
            "is_simple_appreciation": is_simple_appreciation,
            "high_energy": high_energy,
            "is_business": is_business,
            "author_name": interaction.author_name,
            "author_username": interaction.author_username,
        }
    
    def _determine_length(
        self, interaction: Interaction, analysis: Dict[str, Any]
    ) -> Tuple[str, int]:
        """Determine response length - mirror their energy and length."""
        word_count = analysis["word_count"]
        
        # Simple appreciation = micro response
        if analysis["is_simple_appreciation"]:
            return "micro", self.MAX_TOKENS["micro"]
        
        # Very short messages get very short responses
        if word_count <= 5:
            return "very_short", self.MAX_TOKENS["very_short"]
        
        # Short messages
        if word_count <= 15:
            # Questions might need slightly more
            if analysis["is_question"]:
                return "short", self.MAX_TOKENS["short"]
            return "very_short", self.MAX_TOKENS["very_short"]
        
        # Medium messages
        if word_count <= 40:
            if analysis["is_business"] or analysis["is_question"]:
                return "medium", self.MAX_TOKENS["medium"]
            return "short", self.MAX_TOKENS["short"]
        
        # Long messages (business inquiries, detailed questions)
        if analysis["is_business"]:
            return "medium", self.MAX_TOKENS["medium"]
        
        return "short", self.MAX_TOKENS["short"]
    
    async def _build_creator_context(self, user: Optional[User]) -> Dict[str, Any]:
        """Build context about the creator."""
        if not user:
            return {"name": "Creator", "niche": "content creation"}
        
        from app.models.monetization import CreatorProfile
        result = await self.session.execute(
            select(CreatorProfile).where(CreatorProfile.user_id == user.id)
        )
        profile = result.scalar_one_or_none()
        
        return {
            "name": user.full_name or user.email.split("@")[0],
            "niche": profile.niche if profile else "content creation",
        }
    
    def _build_system_prompt(
        self, 
        creator_context: Dict[str, Any], 
        tone: str, 
        length: str,
        analysis: Dict[str, Any]
    ) -> str:
        """Build system prompt optimized for authentic responses."""
        
        # Length instructions - very specific
        length_instructions = {
            "micro": "Respond in 3-6 words MAXIMUM. Like 'glad you liked it' or 'means a lot'. No full sentences needed.",
            "very_short": "ONE short sentence only. Under 10 words ideally. Get to the point immediately.",
            "short": "1-2 short sentences MAX. No fluff. Direct and warm.",
            "medium": "2-3 sentences. Only this long because the question/topic requires it. Still be concise.",
        }
        
        # Emoji rule
        emoji_rule = "Use 1 emoji if it feels natural." if analysis["has_emojis"] else "NO emojis."
        
        return f"""You're {creator_context['name']}, a {creator_context['niche']} creator. Write a reply.

LENGTH: {length_instructions[length]}

CRITICAL RULES:
- {emoji_rule}
- NEVER use their name. Not "Hey Sarah" or "Thanks John". Just respond naturally.
- No hashtags ever.
- Short sentences. No compound sentences with "and" joining two thoughts.
- Don't start with "Hey!" or "Hi!" - just respond.
- Match their energy level. If they're chill, be chill. If excited, be excited.
- Sound like a real person texting, not a brand account.

BANNED PHRASES (never use these):
- "I appreciate you..."
- "Thanks for sharing..."
- "That means so much..."
- "I'm so glad..."
- "Absolutely!" or "Definitely!" as openers
- "Feel free to..." or "Don't hesitate to..."
- "I hope this helps"
- "Let me know if..."
- Any greeting with their name

GOOD EXAMPLES:
- "glad you liked it"
- "haha yeah that part was fun to make"
- "working on more like this"
- "appreciate that"
- "yeah for sure, should be dropping next week"

BAD EXAMPLES (too AI):
- "Thank you so much for your kind words! I really appreciate you taking the time to comment."
- "Hey Sarah! That means so much to me. I'm so glad you enjoyed the video!"
- "Absolutely! I'd love to collaborate. Feel free to reach out anytime."

Tone: {tone}. But always sound human first."""
    
    def _build_user_prompt(
        self,
        interaction: Interaction,
        analysis: Dict[str, Any],
        previous_response: Optional[str]
    ) -> str:
        """Build the user prompt."""
        parts = []
        
        # Context about the content they're commenting on
        if interaction.parent_content_title:
            parts.append(f"They're commenting on your video: \"{interaction.parent_content_title}\"")
            parts.append("")
        
        # The message
        parts.append(f"Their message: \"{interaction.content}\"")
        
        # Quick context
        context_notes = []
        if analysis["is_simple_appreciation"]:
            context_notes.append("This is simple appreciation - keep response very brief")
        if analysis["is_question"]:
            context_notes.append("They asked a question - answer it directly")
        if analysis["is_business"]:
            context_notes.append("Business inquiry - be professional but still casual")
        if analysis["high_energy"]:
            context_notes.append("They're excited - match their energy")
            
        if context_notes:
            parts.append("")
            parts.append("Notes: " + ". ".join(context_notes))
        
        # Regeneration
        if previous_response:
            parts.append("")
            parts.append(f"DON'T say this (already tried): \"{previous_response}\"")
            parts.append("Write something completely different.")
        
        return "\n".join(parts)
    
    def _has_ai_tells(self, text: str, interaction: Interaction) -> bool:
        """Check if response has obvious AI patterns."""
        # Check regex patterns
        for pattern in self.AI_TELLS:
            if re.search(pattern, text):
                return True
        
        # Check if they used the person's name
        author_name = interaction.author_name
        if author_name:
            first_name = author_name.split()[0] if author_name else ""
            if first_name and len(first_name) > 2:
                if re.search(rf"(?i)\b{re.escape(first_name)}\b", text):
                    return True
        
        # Check exclamation overuse
        if text.count("!") > 2:
            return True
        
        # Check for overly long response (more than ~50 words for non-business)
        if len(text.split()) > 50:
            return True
            
        return False
    
    def _clean_response(self, text: str, interaction: Interaction) -> str:
        """Aggressively clean the response."""
        # Remove quotes if wrapped
        if text.startswith('"') and text.endswith('"'):
            text = text[1:-1]
        if text.startswith("'") and text.endswith("'"):
            text = text[1:-1]
        
        # Remove common AI prefixes
        prefixes = [
            "Here's a response:",
            "Response:",
            "Here's my response:",
            "Sure!",
            "Of course!",
            "Absolutely!",
            "Definitely!",
        ]
        for prefix in prefixes:
            if text.lower().startswith(prefix.lower()):
                text = text[len(prefix):].strip()
        
        # Remove name if it snuck in at the start
        author_name = interaction.author_name
        if author_name:
            first_name = author_name.split()[0] if author_name else ""
            if first_name and len(first_name) > 2:
                # Remove "Hey [Name]," or "Hi [Name]!" patterns
                text = re.sub(
                    rf"(?i)^(?:hey|hi|hello)\s+{re.escape(first_name)}[,!]?\s*",
                    "",
                    text
                )
                # Remove "[Name]," at start
                text = re.sub(
                    rf"(?i)^{re.escape(first_name)}[,!]?\s*",
                    "",
                    text
                )
        
        # Reduce excessive exclamation marks
        while "!!" in text:
            text = text.replace("!!", "!")
        
        # If response starts with lowercase after cleaning, that's fine (casual)
        # But capitalize if it's a proper sentence start
        text = text.strip()
        if text and text[0].islower() and len(text) > 20:
            text = text[0].upper() + text[1:]
        
        return text.strip()


def get_response_generator(session: AsyncSession) -> ResponseGenerator:
    """Factory function to get a ResponseGenerator instance."""
    return ResponseGenerator(session)
