"""Core simulation orchestration engine."""
import logging
import random
import uuid
from datetime import datetime, timedelta
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models import DemoProfile, DemoContent, DemoInteraction
from app.services.content_generator import ContentGenerator
from app.services.persona_generator import PersonaGenerator
from app.services.webhook_sender import WebhookSender

logger = logging.getLogger(__name__)


class SimulationEngine:
    """Orchestrate demo content and interaction simulation."""
    
    def __init__(self):
        self.content_gen = ContentGenerator()
        self.persona_gen = PersonaGenerator()
        self.webhook = WebhookSender()
    
    async def create_content(
        self,
        session: AsyncSession,
        profile: DemoProfile,
        platform: str,
        published_at: datetime = None
    ) -> DemoContent:
        """Create and publish new demo content with rich metadata."""
        
        # Generate title and description
        title = await self.content_gen.generate_video_title(
            session,
            profile.niche,
            platform
        )
        
        # Generate description
        description = await self.content_gen.generate_video_description(
            session,
            title,
            profile.niche,
            platform
        )
        
        # Calculate targets
        target_views = profile.calculate_expected_views(platform)
        target_comments = profile.get_comment_target()
        
        # Generate realistic metadata
        content_type = self._get_content_type(platform)
        duration_seconds = self._generate_duration(platform, content_type)
        hashtags = self._generate_hashtags(profile.niche, platform)
        theme = self._get_content_theme(profile.niche)
        thumbnail_url = self._generate_thumbnail_url(platform, profile.niche)
        
        # Use provided published_at or default to now
        publish_time = published_at or datetime.utcnow()
        
        # Generate external ID
        external_id = f"demo_{platform}_{uuid.uuid4().hex[:12]}"
        
        # Generate platform URL
        url = self._generate_content_url(platform, external_id)
        
        # Calculate initial metrics based on time since publish
        hours_since_publish = (datetime.utcnow() - publish_time).total_seconds() / 3600
        initial_views = self._calculate_initial_views(target_views, hours_since_publish)
        initial_likes = int(initial_views * random.uniform(0.02, 0.08))
        
        # Create content
        content = DemoContent(
            profile_id=profile.id,
            platform=platform,
            content_type=content_type,
            title=title,
            description=description,
            thumbnail_url=thumbnail_url,
            url=url,
            duration_seconds=duration_seconds,
            hashtags=','.join(hashtags),  # Store as comma-separated
            theme=theme,
            external_id=external_id,
            target_views=target_views,
            target_comments=target_comments,
            views=initial_views,
            likes=initial_likes,
            published_at=publish_time,
            # Video-specific metrics
            watch_time_minutes=int(initial_views * (duration_seconds / 60) * 0.4) if duration_seconds else 0,
            avg_view_duration_seconds=int(duration_seconds * 0.45) if duration_seconds else None,
            retention_rate=random.randint(35, 65),
        )
        
        session.add(content)
        await session.commit()
        await session.refresh(content)
        
        logger.info(f"Created {platform} content: {title[:50]}...")
        
        # Send webhook to main app with full metadata
        await self.webhook.send_content_published({
            'user_id': str(profile.user_id),
            'id': content.external_id,
            'platform': platform,
            'type': content.content_type,
            'title': title,
            'description': description,
            'thumbnail_url': thumbnail_url,
            'url': url,
            'duration_seconds': duration_seconds,
            'hashtags': hashtags,
            'theme': theme,
            'published_at': content.published_at.isoformat(),
            'metrics': {
                'views': content.views,
                'likes': content.likes,
                'comments_count': 0,
                'shares': 0,
                'saves': 0,
                'watch_time_minutes': content.watch_time_minutes,
                'avg_view_duration_seconds': content.avg_view_duration_seconds,
                'retention_rate': content.retention_rate,
            }
        })
        
        return content
    
    def _get_content_type(self, platform: str) -> str:
        """Get appropriate content type for platform."""
        if platform == 'youtube':
            return random.choice(['video', 'short']) if random.random() > 0.7 else 'video'
        elif platform == 'instagram':
            return random.choice(['post', 'reel']) if random.random() > 0.5 else 'post'
        elif platform == 'tiktok':
            return 'video'
        return 'video'
    
    def _generate_duration(self, platform: str, content_type: str) -> int:
        """Generate realistic video duration in seconds."""
        if platform == 'youtube':
            if content_type == 'short':
                return random.randint(15, 60)
            return random.randint(300, 1200)  # 5-20 minutes
        elif platform == 'instagram':
            if content_type == 'reel':
                return random.randint(15, 90)
            return None  # Posts don't have duration
        elif platform == 'tiktok':
            return random.randint(15, 180)  # 15s to 3min
        return random.randint(60, 600)
    
    def _generate_hashtags(self, niche: str, platform: str) -> List[str]:
        """Generate relevant hashtags for content."""
        niche_hashtags = {
            'tech_reviews': ['#tech', '#review', '#gadgets', '#technology', '#unboxing'],
            'gaming': ['#gaming', '#gamer', '#gameplay', '#videogames', '#twitch'],
            'beauty': ['#beauty', '#makeup', '#skincare', '#beautytips', '#tutorial'],
            'fitness': ['#fitness', '#workout', '#gym', '#health', '#fitfam'],
            'cooking': ['#cooking', '#recipe', '#food', '#foodie', '#homemade'],
            'travel': ['#travel', '#wanderlust', '#adventure', '#explore', '#vacation'],
            'education': ['#education', '#learning', '#tutorial', '#howto', '#tips'],
            'comedy': ['#comedy', '#funny', '#humor', '#lol', '#entertainment'],
            'music': ['#music', '#musician', '#cover', '#song', '#singer'],
            'lifestyle': ['#lifestyle', '#vlog', '#life', '#daily', '#motivation'],
        }
        base_tags = niche_hashtags.get(niche, ['#content', '#creator'])
        return random.sample(base_tags, min(3, len(base_tags))) + [f'#{niche.replace("_", "")}']
    
    def _get_content_theme(self, niche: str) -> str:
        """Get a content theme/category."""
        themes = {
            'tech_reviews': ['Review', 'Unboxing', 'Comparison', 'Tutorial', 'First Look'],
            'gaming': ['Gameplay', 'Review', 'Tips & Tricks', 'Walkthrough', 'Highlights'],
            'beauty': ['Tutorial', 'Review', 'Get Ready With Me', 'Haul', 'Routine'],
            'fitness': ['Workout', 'Tips', 'Challenge', 'Routine', 'Transformation'],
            'cooking': ['Recipe', 'Tutorial', 'Review', 'Challenge', 'Meal Prep'],
            'travel': ['Vlog', 'Guide', 'Tips', 'Adventure', 'Review'],
            'education': ['Tutorial', 'Explainer', 'Tips', 'How-To', 'Deep Dive'],
            'comedy': ['Sketch', 'Reaction', 'Parody', 'Story Time', 'Challenge'],
            'music': ['Cover', 'Original', 'Tutorial', 'Behind the Scenes', 'Performance'],
            'lifestyle': ['Vlog', 'Routine', 'Tips', 'Story Time', 'Q&A'],
        }
        niche_themes = themes.get(niche, ['Content', 'Video'])
        return random.choice(niche_themes)
    
    def _generate_thumbnail_url(self, platform: str, niche: str) -> str:
        """Generate a placeholder thumbnail URL."""
        # Using placeholder service for demo thumbnails
        colors = ['7c3aed', 'ec4899', '06b6d4', '10b981', 'f59e0b']
        color = random.choice(colors)
        return f"https://placehold.co/1280x720/{color}/white?text={niche.replace('_', '+')}"
    
    def _generate_content_url(self, platform: str, external_id: str) -> str:
        """Generate platform-specific content URL."""
        if platform == 'youtube':
            return f"https://youtube.com/watch?v={external_id}"
        elif platform == 'instagram':
            return f"https://instagram.com/p/{external_id}"
        elif platform == 'tiktok':
            return f"https://tiktok.com/@demo/video/{external_id}"
        return f"https://example.com/content/{external_id}"
    
    def _calculate_initial_views(self, target_views: int, hours_since_publish: float) -> int:
        """Calculate views based on time since publish."""
        if hours_since_publish < 1:
            return int(target_views * 0.1)
        elif hours_since_publish < 6:
            return int(target_views * 0.3)
        elif hours_since_publish < 24:
            return int(target_views * 0.5)
        elif hours_since_publish < 48:
            return int(target_views * 0.7)
        elif hours_since_publish < 168:  # 1 week
            return int(target_views * 0.85)
        else:
            return int(target_views * random.uniform(0.9, 1.1))
    
    async def generate_comments_for_content(
        self,
        session: AsyncSession,
        content: DemoContent,
        count: int
    ) -> List[DemoInteraction]:
        """Generate comments for a piece of content."""
        
        profile = content.profile
        
        # Generate varied comments using AI
        comments_data = await self.content_gen.generate_comments(
            session,
            content.title,
            profile.niche,
            count
        )
        
        interactions = []
        now = datetime.utcnow()
        
        # Calculate engagement wave multiplier
        hours_since_publish = (now - content.published_at).total_seconds() / 3600
        wave_multiplier = content.calculate_engagement_wave(int(hours_since_publish))
        
        for comment_data in comments_data:
            # Generate persona
            persona = self.persona_gen.generate_persona(profile.niche)
            
            # Random likes for comment (some get more engagement)
            likes = int(random.triangular(0, 50, 5) * wave_multiplier)
            
            # Schedule with realistic delays
            delay_seconds = random.randint(10, 300)  # 10s to 5min
            scheduled_for = now + timedelta(seconds=delay_seconds)
            
            interaction = DemoInteraction(
                profile_id=profile.id,
                content_id=content.id,
                platform=content.platform,
                interaction_type='comment',
                author_username=persona['username'],
                author_display_name=persona['display_name'],
                author_avatar_url=persona['avatar_url'],
                author_verified=persona['verified'],
                author_subscriber_count=persona['subscriber_count'],
                content_text=comment_data['text'],
                sentiment=comment_data['sentiment'],
                likes=likes,
                external_id=f"demo_cmt_{uuid.uuid4().hex[:12]}",
                scheduled_for=scheduled_for,
                status='pending',
            )
            
            session.add(interaction)
            interactions.append(interaction)
        
        # Update content engagement count
        content.increment_engagement(comments=count)
        
        await session.commit()
        
        logger.info(f"Generated {count} comments for {content.title[:30]}...")
        
        return interactions
    
    async def generate_comments_batch_optimized(
        self,
        session: AsyncSession,
        batch_requests: List[dict]
    ) -> List[DemoInteraction]:
        """
        Generate comments for MULTIPLE videos in ONE API call.
        
        This is 10x cheaper than calling the API for each video separately.
        
        Args:
            batch_requests: List of dicts with 'content', 'count', 'title' keys
        
        Returns:
            List of all generated interactions
        """
        if not batch_requests:
            return []
        
        profile = batch_requests[0]['content'].profile
        
        # Build a single batched prompt for all videos
        total_comments = sum(r['count'] for r in batch_requests)
        
        # Generate ALL comments in one API call
        all_comments = await self.content_gen.generate_comments_batched(
            session,
            batch_requests,
            profile.niche,
            total_comments
        )
        
        # Distribute comments back to their respective videos
        all_interactions = []
        comment_idx = 0
        
        for request in batch_requests:
            content = request['content']
            count = request['count']
            
            # Take the next N comments for this video
            comments_for_video = all_comments[comment_idx:comment_idx + count]
            comment_idx += count
            
            now = datetime.utcnow()
            hours_since_publish = (now - content.published_at).total_seconds() / 3600
            wave_multiplier = content.calculate_engagement_wave(int(hours_since_publish))
            
            for comment_data in comments_for_video:
                # Generate persona
                persona = self.persona_gen.generate_persona(profile.niche)
                
                # Random likes
                likes = int(random.triangular(0, 50, 5) * wave_multiplier)
                
                # Schedule with delay
                delay_seconds = random.randint(10, 300)
                scheduled_for = now + timedelta(seconds=delay_seconds)
                
                interaction = DemoInteraction(
                    profile_id=profile.id,
                    content_id=content.id,
                    platform=content.platform,
                    interaction_type='comment',
                    author_username=persona['username'],
                    author_display_name=persona['display_name'],
                    author_avatar_url=persona['avatar_url'],
                    author_verified=persona['verified'],
                    author_subscriber_count=persona['subscriber_count'],
                    content_text=comment_data['text'],
                    sentiment=comment_data['sentiment'],
                    likes=likes,
                    external_id=f"demo_cmt_{uuid.uuid4().hex[:12]}",
                    scheduled_for=scheduled_for,
                    status='pending',
                )
                
                session.add(interaction)
                all_interactions.append(interaction)
            
            # Update content engagement count
            content.increment_engagement(comments=count)
        
        await session.commit()
        
        logger.info(f"✅ Batched generation: {len(batch_requests)} videos, {total_comments} comments in 1 API call")
        
        return all_interactions
    
    async def generate_dm(
        self,
        session: AsyncSession,
        profile: DemoProfile,
        dm_type: str = None
    ) -> DemoInteraction:
        """Generate a direct message."""
        
        if dm_type is None:
            # Random DM type based on distribution
            rand = random.random()
            if rand < 0.40:
                dm_type = 'fan_message'
            elif rand < 0.70:
                dm_type = 'question'
            elif rand < 0.85:
                dm_type = 'collaboration'
            elif rand < 0.95:
                dm_type = 'spam'
            else:
                dm_type = 'criticism'
        
        # Generate DM content
        dm_data = await self.content_gen.generate_dm(
            session,
            profile.niche,
            dm_type
        )
        
        # Generate persona
        persona = self.persona_gen.generate_persona(profile.niche)
        
        # Determine sentiment from type
        sentiment_map = {
            'fan_message': 'positive',
            'question': 'neutral',
            'collaboration': 'positive',
            'spam': 'neutral',
            'criticism': 'negative',
        }
        sentiment = sentiment_map.get(dm_type, 'neutral')
        
        # Random platform
        platform = random.choice(['youtube', 'instagram', 'tiktok'])
        
        # Schedule within next hour
        delay_minutes = random.randint(5, 60)
        scheduled_for = datetime.utcnow() + timedelta(minutes=delay_minutes)
        
        interaction = DemoInteraction(
            profile_id=profile.id,
            content_id=None,  # DMs not tied to specific content
            platform=platform,
            interaction_type='dm',
            author_username=dm_data.get('sender_name', persona['username']),
            author_display_name=persona['display_name'],
            author_avatar_url=persona['avatar_url'],
            author_verified=persona['verified'],
            author_subscriber_count=persona['subscriber_count'],
            content_text=dm_data['message'],
            sentiment=sentiment,
            external_id=f"demo_dm_{uuid.uuid4().hex[:12]}",
            scheduled_for=scheduled_for,
            status='pending',
        )
        
        session.add(interaction)
        await session.commit()
        
        logger.info(f"Generated {dm_type} DM for {profile.niche} profile")
        
        return interaction
