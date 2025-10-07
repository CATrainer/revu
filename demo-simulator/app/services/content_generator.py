"""AI-powered content generation using Claude."""
import random
import logging
from typing import List, Dict, Optional
from anthropic import Anthropic
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.models.generation_cache import GenerationCache

logger = logging.getLogger(__name__)


class ContentGenerator:
    """Generate realistic content using Claude API with caching."""
    
    # Niche-specific context
    NICHE_CONTEXTS = {
        'tech_reviews': 'technology reviews, gadgets, software, apps, and tech news',
        'gaming': 'video games, gaming hardware, esports, game reviews, and playthroughs',
        'beauty': 'makeup tutorials, skincare routines, product reviews, and beauty tips',
        'fitness': 'workouts, nutrition advice, fitness challenges, and health tips',
        'cooking': 'recipes, cooking techniques, restaurant reviews, and food tutorials',
        'travel': 'travel vlogs, destination guides, travel tips, and adventure content',
        'education': 'educational content, tutorials, how-to guides, and learning resources',
        'comedy': 'comedy sketches, reactions, memes, and entertainment',
        'music': 'music covers, original songs, music production, and instrument tutorials',
        'lifestyle': 'vlogs, daily routines, life advice, and personal development',
    }
    
    def __init__(self):
        self.client = Anthropic(api_key=settings.CLAUDE_API_KEY)
    
    async def generate_video_title(
        self,
        session: AsyncSession,
        niche: str,
        platform: str = 'youtube',
        use_cache: bool = True
    ) -> str:
        """Generate realistic video title."""
        
        cache_key = f"title_{niche}_{platform}_{random.randint(1, 100)}"
        
        if use_cache and settings.USE_GENERATION_CACHE:
            cached = await self._get_cached(session, cache_key, 'video_title')
            if cached:
                return cached['title']
        
        niche_context = self.NICHE_CONTEXTS.get(niche, 'general content')
        
        prompt = f"""Generate a single, realistic {platform} video title for a creator who makes {niche_context}.

Requirements:
- Make it engaging and clickable
- Use natural language, not overly salesy
- Include numbers or specific details when appropriate
- {platform == 'youtube' and 'Can be 60-70 characters' or 'Keep concise'}
- Should feel authentic to the niche

Return ONLY the title, nothing else."""
        
        response = self.client.messages.create(
            model="claude-3-5-sonnet-latest",
            max_tokens=100,
            temperature=0.9,  # High creativity for variety
            messages=[{"role": "user", "content": prompt}]
        )
        
        title = response.content[0].text.strip().strip('"')
        
        if use_cache and settings.USE_GENERATION_CACHE:
            await self._save_to_cache(session, cache_key, 'video_title', {'title': title}, prompt)
        
        return title
    
    async def generate_comments(
        self,
        session: AsyncSession,
        video_title: str,
        niche: str,
        count: int,
        sentiment_distribution: Optional[Dict[str, float]] = None
    ) -> List[Dict]:
        """
        Generate realistic comments for a video.
        
        Args:
            video_title: The video title
            niche: Content niche
            count: Number of comments to generate
            sentiment_distribution: Dict with 'positive', 'negative', 'neutral' ratios
        """
        if sentiment_distribution is None:
            sentiment_distribution = {
                'positive': 0.65,
                'negative': 0.10,
                'neutral': 0.25,
            }
        
        comments = []
        
        # Generate in batches to avoid token limits
        batch_size = 10
        for i in range(0, count, batch_size):
            batch_count = min(batch_size, count - i)
            batch_comments = await self._generate_comment_batch(
                session,
                video_title,
                niche,
                batch_count,
                sentiment_distribution
            )
            comments.extend(batch_comments)
        
        return comments
    
    async def _generate_comment_batch(
        self,
        session: AsyncSession,
        video_title: str,
        niche: str,
        count: int,
        sentiment_distribution: Dict[str, float]
    ) -> List[Dict]:
        """Generate a batch of comments."""
        
        niche_context = self.NICHE_CONTEXTS.get(niche, 'general content')
        
        # Determine sentiments for this batch
        sentiments = []
        for _ in range(count):
            rand = random.random()
            if rand < sentiment_distribution['positive']:
                sentiments.append('positive')
            elif rand < sentiment_distribution['positive'] + sentiment_distribution['negative']:
                sentiments.append('negative')
            else:
                sentiments.append('neutral')
        
        prompt = f"""Generate {count} realistic YouTube comments for this video: "{video_title}"

Context: This is a {niche_context} video.

Generate exactly {count} comments with this sentiment distribution:
- Positive: {sentiments.count('positive')} comments
- Negative: {sentiments.count('negative')} comments
- Neutral: {sentiments.count('neutral')} comments

Make comments feel REAL and VARIED:
- Mix of lengths (short reactions, longer thoughts, questions)
- Different tones (excited, thoughtful, critical, funny)
- Include emojis occasionally (but not every comment)
- Some with timestamps like "2:34 this part was crazy"
- Vary vocabulary and writing styles
- Include typos occasionally for realism
- Some should ask questions, others make statements
- Mix of casual and more formal comments

Return as JSON array with this exact format:
[
  {{"text": "comment text here", "sentiment": "positive"}},
  {{"text": "another comment", "sentiment": "neutral"}}
]

IMPORTANT: Return ONLY the JSON array, no explanation."""
        
        response = self.client.messages.create(
            model="claude-3-5-sonnet-latest",
            max_tokens=2000,
            temperature=1.0,  # Maximum variety
            messages=[{"role": "user", "content": prompt}]
        )
        
        import json
        content_text = response.content[0].text.strip()
        
        # Extract JSON from response (handle potential markdown formatting)
        if '```json' in content_text:
            content_text = content_text.split('```json')[1].split('```')[0].strip()
        elif '```' in content_text:
            content_text = content_text.split('```')[1].split('```')[0].strip()
        
        try:
            comments = json.loads(content_text)
            return comments
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse comments JSON: {e}. Response: {content_text[:200]}")
            # Fallback to simple comments
            return [
                {"text": f"Great video! Really enjoyed this content.", "sentiment": "positive"}
                for _ in range(count)
            ]
    
    async def generate_dm(
        self,
        session: AsyncSession,
        niche: str,
        dm_type: str
    ) -> Dict:
        """
        Generate realistic DM.
        
        Args:
            niche: Content niche
            dm_type: Type of DM (fan_message, question, collaboration, spam, criticism)
        """
        
        cache_key = f"dm_{niche}_{dm_type}_{random.randint(1, 50)}"
        
        if settings.USE_GENERATION_CACHE:
            cached = await self._get_cached(session, cache_key, 'dm')
            if cached:
                return cached
        
        niche_context = self.NICHE_CONTEXTS.get(niche, 'general content')
        
        type_contexts = {
            'fan_message': 'a genuine fan expressing appreciation and support',
            'question': 'someone asking for advice or help related to the content',
            'collaboration': 'a brand or fellow creator proposing a collaboration or sponsorship',
            'spam': 'a promotional or scam message (but realistic)',
            'criticism': 'constructive criticism or a complaint about content',
        }
        
        type_context = type_contexts.get(dm_type, 'a general message')
        
        prompt = f"""Generate a realistic direct message (DM) for a content creator who makes {niche_context}.

Message type: {type_context}

Requirements:
- Make it feel like a real person wrote it
- 2-4 sentences
- Natural conversational tone
- Include realistic details
- {dm_type == 'collaboration' and 'Mention specific collaboration ideas' or ''}
- {dm_type == 'question' and 'Ask a specific, relevant question' or ''}

Return as JSON with this exact format:
{{
  "message": "the dm text here",
  "sender_name": "realistic username"
}}

Return ONLY the JSON, no explanation."""
        
        response = self.client.messages.create(
            model="claude-3-5-sonnet-latest",
            max_tokens=300,
            temperature=0.9,
            messages=[{"role": "user", "content": prompt}]
        )
        
        import json
        content_text = response.content[0].text.strip()
        
        # Extract JSON
        if '```json' in content_text:
            content_text = content_text.split('```json')[1].split('```')[0].strip()
        elif '```' in content_text:
            content_text = content_text.split('```')[1].split('```')[0].strip()
        
        try:
            dm_data = json.loads(content_text)
            if settings.USE_GENERATION_CACHE:
                await self._save_to_cache(session, cache_key, 'dm', dm_data, prompt)
            return dm_data
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse DM JSON: {e}")
            return {
                "message": "Hey! Love your content. Keep up the great work!",
                "sender_name": f"user_{random.randint(1000, 9999)}"
            }
    
    async def _get_cached(
        self,
        session: AsyncSession,
        cache_key: str,
        content_type: str
    ) -> Optional[Dict]:
        """Get cached generated content."""
        stmt = select(GenerationCache).where(GenerationCache.cache_key == cache_key)
        result = await session.execute(stmt)
        cache = result.scalar_one_or_none()
        
        if cache:
            cache.increment_use()
            await session.commit()
            logger.debug(f"Cache hit for {cache_key}")
            return cache.generated_content
        
        return None
    
    async def _save_to_cache(
        self,
        session: AsyncSession,
        cache_key: str,
        content_type: str,
        content: Dict,
        prompt: str
    ):
        """Save generated content to cache."""
        cache = GenerationCache(
            cache_key=cache_key,
            content_type=content_type,
            prompt_hash=GenerationCache.create_prompt_hash(prompt),
            generated_content=content,
            use_count=1,
        )
        session.add(cache)
        await session.commit()
        logger.debug(f"Saved to cache: {cache_key}")
