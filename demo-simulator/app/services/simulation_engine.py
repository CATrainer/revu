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
        platform: str
    ) -> DemoContent:
        """Create and publish new demo content."""
        
        # Generate title
        title = await self.content_gen.generate_video_title(
            session,
            profile.niche,
            platform
        )
        
        # Calculate targets
        target_views = profile.calculate_expected_views(platform)
        target_comments = profile.get_comment_target()
        
        # Create content
        content = DemoContent(
            profile_id=profile.id,
            platform=platform,
            content_type='video' if platform != 'instagram' else 'post',
            title=title,
            external_id=f"demo_{platform}_{uuid.uuid4().hex[:12]}",
            target_views=target_views,
            target_comments=target_comments,
            views=int(target_views * 0.1),  # Start with 10% views
            published_at=datetime.utcnow(),
        )
        
        session.add(content)
        await session.commit()
        await session.refresh(content)
        
        logger.info(f"Created {platform} content: {title[:50]}...")
        
        # Send webhook to main app
        await self.webhook.send_content_published({
            'id': content.external_id,
            'platform': platform,
            'type': content.content_type,
            'title': title,
            'published_at': content.published_at.isoformat(),
        })
        
        return content
    
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
