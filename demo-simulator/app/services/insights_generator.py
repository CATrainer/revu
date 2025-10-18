"""Generate realistic content pieces with performance metrics for insights feature."""
import random
import logging
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from anthropic import Anthropic
import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class InsightsContentGenerator:
    """Generate realistic content pieces with performance data and AI insights."""
    
    CONTENT_THEMES = [
        'Tutorial', 'Behind the Scenes', 'Storytime', 'Tips & Tricks',
        'Product Review', 'Q&A', 'Vlog', 'Challenge', 'Reaction',
        'How-To Guide', 'Industry News', 'Personal Update', 'Collaboration',
        'Unboxing', 'Comparison', 'Beginner Guide', 'Advanced Techniques'
    ]
    
    CONTENT_TYPES_BY_PLATFORM = {
        'youtube': ['video', 'short'],
        'instagram': ['reel', 'post', 'carousel'],
        'tiktok': ['video'],
    }
    
    # Typical posting times that perform well
    OPTIMAL_TIMES = [
        (1, 14),  # Monday 2pm
        (1, 19),  # Monday 7pm
        (3, 14),  # Wednesday 2pm
        (3, 19),  # Wednesday 7pm
        (4, 14),  # Thursday 2pm (best day)
        (4, 19),  # Thursday 7pm
        (6, 10),  # Saturday 10am
        (6, 15),  # Saturday 3pm
    ]
    
    POOR_TIMES = [
        (0, 3),   # Monday 3am
        (1, 4),   # Tuesday 4am
        (2, 2),   # Wednesday 2am
        (4, 23),  # Friday 11pm
        (6, 22),  # Sunday 10pm
    ]
    
    def __init__(self):
        self.client = Anthropic(api_key=settings.CLAUDE_API_KEY)
    
    async def generate_content_titles(self, niche: str, count: int) -> List[str]:
        """Generate realistic content titles using AI."""
        niche_contexts = {
            'tech_reviews': 'technology reviews, gadgets, software, apps',
            'gaming': 'video games, gaming hardware, esports, game reviews',
            'beauty': 'makeup tutorials, skincare routines, product reviews',
            'fitness': 'workouts, nutrition advice, fitness challenges',
            'cooking': 'recipes, cooking techniques, restaurant reviews',
            'travel': 'travel vlogs, destination guides, travel tips',
            'education': 'educational content, tutorials, how-to guides',
            'comedy': 'comedy sketches, reactions, memes',
            'music': 'music covers, original songs, music production',
            'lifestyle': 'vlogs, daily routines, life advice',
        }
        
        context = niche_contexts.get(niche, 'general content')
        
        prompt = f"""Generate {count} realistic video/post titles for a content creator who makes {context}.

Requirements:
- Mix of different content types (tutorials, tips, reviews, vlogs, etc.)
- Engaging and clickable
- Natural language, authentic to the niche
- Vary the styles and lengths
- Include numbers or specific details where appropriate

Return as JSON array:
["Title 1", "Title 2", ...]

Return ONLY the JSON array."""

        response = self.client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=1500,
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
            return json.loads(content_text)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse titles: {e}")
            return [f"Content Piece {i+1}" for i in range(count)]
    
    def generate_content_piece(
        self,
        title: str,
        platform: str,
        niche: str,
        theme: str,
        published_at: datetime,
        follower_count: int,
        is_top_performer: bool = False,
        is_underperformer: bool = False,
    ) -> Dict:
        """Generate a single content piece with realistic metrics."""
        
        content_type = random.choice(self.CONTENT_TYPES_BY_PLATFORM[platform])
        
        # Base metrics based on follower count and platform
        base_views = follower_count * random.uniform(0.3, 0.8)
        base_engagement_rate = random.uniform(2.5, 6.0)
        
        # Adjust based on performance category
        if is_top_performer:
            views_multiplier = random.uniform(2.0, 4.0)
            engagement_multiplier = random.uniform(1.5, 2.5)
            category = 'overperforming'
            performance_score = random.uniform(80, 98)
            percentile = random.randint(90, 99)
        elif is_underperformer:
            views_multiplier = random.uniform(0.2, 0.5)
            engagement_multiplier = random.uniform(0.4, 0.7)
            category = 'underperforming'
            performance_score = random.uniform(15, 40)
            percentile = random.randint(5, 25)
        else:
            views_multiplier = random.uniform(0.8, 1.3)
            engagement_multiplier = random.uniform(0.9, 1.1)
            category = 'normal'
            performance_score = random.uniform(45, 75)
            percentile = random.randint(30, 70)
        
        views = int(base_views * views_multiplier)
        engagement_rate = base_engagement_rate * engagement_multiplier
        
        # Calculate other metrics
        likes = int(views * (engagement_rate / 100) * random.uniform(0.6, 0.8))
        comments_count = int(views * (engagement_rate / 100) * random.uniform(0.15, 0.25))
        shares = int(views * (engagement_rate / 100) * random.uniform(0.05, 0.15))
        saves = int(views * (engagement_rate / 100) * random.uniform(0.1, 0.2))
        
        # Video-specific metrics
        if content_type in ['video', 'short', 'reel']:
            duration_seconds = random.randint(30, 900) if content_type == 'video' else random.randint(15, 60)
            avg_view_duration = int(duration_seconds * random.uniform(0.3, 0.7))
            retention_rate = (avg_view_duration / duration_seconds) * 100
        else:
            duration_seconds = None
            avg_view_duration = None
            retention_rate = None
        
        # Followers gained
        followers_gained = int(views * random.uniform(0.001, 0.005))
        
        # Generate realistic insights
        insights = self._generate_insights(
            title=title,
            theme=theme,
            platform=platform,
            published_at=published_at,
            performance_category=category,
            views=views,
            engagement_rate=engagement_rate,
            retention_rate=retention_rate,
        )
        
        return {
            'platform': platform,
            'platform_id': f"{platform}_{random.randint(100000, 999999)}",
            'content_type': content_type,
            'title': title,
            'url': f"https://{platform}.com/watch?v={''.join(random.choices('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', k=11))}",
            'thumbnail_url': f"https://i.ytimg.com/vi/{''.join(random.choices('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', k=11))}/maxresdefault.jpg",
            'description': f"In this {content_type}, I share {theme.lower()} content about {title.lower()}.",
            'published_at': published_at.isoformat(),
            'timezone': 'America/New_York',
            'day_of_week': published_at.weekday(),
            'hour_of_day': published_at.hour,
            'follower_count_at_post': follower_count,
            'theme': theme,
            'duration_seconds': duration_seconds,
            'hashtags': self._generate_hashtags(niche, theme),
            'performance': {
                'views': views,
                'impressions': int(views * random.uniform(1.2, 1.8)),
                'likes': likes,
                'comments_count': comments_count,
                'shares': shares,
                'saves': saves,
                'watch_time_minutes': int(avg_view_duration / 60 * views) if avg_view_duration else None,
                'average_view_duration_seconds': avg_view_duration,
                'retention_rate': round(retention_rate, 2) if retention_rate else None,
                'engagement_rate': round(engagement_rate, 2),
                'click_through_rate': round(random.uniform(3, 8), 2),
                'followers_gained': followers_gained,
                'profile_visits': int(views * random.uniform(0.02, 0.05)),
                'performance_score': round(performance_score, 2),
                'percentile_rank': percentile,
                'performance_category': category,
                'views_last_24h': int(views * random.uniform(0.05, 0.15)),
                'engagement_last_24h': int((likes + comments_count + shares) * random.uniform(0.05, 0.15)),
            },
            'insights': insights,
        }
    
    def _generate_hashtags(self, niche: str, theme: str) -> List[str]:
        """Generate relevant hashtags."""
        base_tags = {
            'tech_reviews': ['tech', 'technology', 'gadgets', 'review', 'unboxing'],
            'gaming': ['gaming', 'gamer', 'gameplay', 'videogames', 'esports'],
            'beauty': ['beauty', 'makeup', 'skincare', 'beautytips', 'makeupartist'],
            'fitness': ['fitness', 'workout', 'gym', 'fitfam', 'healthylifestyle'],
            'cooking': ['cooking', 'recipe', 'food', 'foodie', 'chef'],
        }
        
        tags = base_tags.get(niche, ['content', 'creator', 'video'])
        return random.sample(tags, min(3, len(tags)))
    
    def _generate_insights(
        self,
        title: str,
        theme: str,
        platform: str,
        published_at: datetime,
        performance_category: str,
        views: int,
        engagement_rate: float,
        retention_rate: Optional[float],
    ) -> List[Dict]:
        """Generate AI insights about why content performed well or poorly."""
        insights = []
        
        day_of_week = published_at.weekday()
        hour = published_at.hour
        
        # Timing insight
        is_optimal_time = (day_of_week, hour) in self.OPTIMAL_TIMES or day_of_week == 4  # Thursday is best
        is_poor_time = (day_of_week, hour) in self.POOR_TIMES or hour < 6 or hour > 22
        
        if is_optimal_time and performance_category == 'overperforming':
            insights.append({
                'insight_type': 'success_factor',
                'category': 'timing',
                'title': 'Perfect Timing',
                'description': f'Posted on {"Thursday" if day_of_week == 4 else "a high-engagement day"} at {hour}:00 - your optimal time slot where content gets 2-3x more views on average.',
                'impact_level': 'high',
                'is_positive': True,
                'supporting_data': {'day': day_of_week, 'hour': hour, 'views': views},
                'confidence_score': 0.92,
            })
        elif is_poor_time and performance_category == 'underperforming':
            insights.append({
                'insight_type': 'failure_factor',
                'category': 'timing',
                'title': 'Suboptimal Posting Time',
                'description': f'Posted at {hour}:00 when your audience is less active. Try posting between 2-7pm on weekdays for better reach.',
                'impact_level': 'high',
                'is_positive': False,
                'supporting_data': {'hour': hour, 'recommended_hours': [14, 15, 16, 17, 18, 19]},
                'confidence_score': 0.88,
            })
        
        # Theme performance insight
        if theme in ['Tutorial', 'How-To Guide', 'Tips & Tricks'] and performance_category == 'overperforming':
            insights.append({
                'insight_type': 'success_factor',
                'category': 'content_type',
                'title': 'Educational Content Resonance',
                'description': f'{theme} content consistently outperforms your other content types. Your audience values practical, actionable information.',
                'impact_level': 'high',
                'is_positive': True,
                'supporting_data': {'theme': theme, 'avg_engagement_boost': '+45%'},
                'confidence_score': 0.90,
            })
        
        # Engagement quality insight
        if engagement_rate > 5.0:
            insights.append({
                'insight_type': 'success_factor',
                'category': 'engagement',
                'title': 'High Engagement Rate',
                'description': f'{engagement_rate:.1f}% engagement rate is significantly above platform average (2-3%). Content sparked genuine interest and conversation.',
                'impact_level': 'high',
                'is_positive': True,
                'supporting_data': {'engagement_rate': engagement_rate, 'platform_avg': 2.8},
                'confidence_score': 0.95,
            })
        elif engagement_rate < 2.0 and performance_category == 'underperforming':
            insights.append({
                'insight_type': 'failure_factor',
                'category': 'engagement',
                'title': 'Low Engagement',
                'description': f'{engagement_rate:.1f}% engagement is below average. Content may need stronger hooks, clearer value proposition, or more calls-to-action.',
                'impact_level': 'medium',
                'is_positive': False,
                'supporting_data': {'engagement_rate': engagement_rate, 'expected': 3.5},
                'confidence_score': 0.82,
            })
        
        # Retention insight for videos
        if retention_rate and retention_rate > 50:
            insights.append({
                'insight_type': 'success_factor',
                'category': 'retention',
                'title': 'Strong Viewer Retention',
                'description': f'{retention_rate:.0f}% retention rate indicates compelling content that kept viewers watching. Hook and pacing were effective.',
                'impact_level': 'high',
                'is_positive': True,
                'supporting_data': {'retention_rate': retention_rate},
                'confidence_score': 0.91,
            })
        elif retention_rate and retention_rate < 30 and performance_category == 'underperforming':
            insights.append({
                'insight_type': 'failure_factor',
                'category': 'retention',
                'title': 'Low Retention Rate',
                'description': f'Only {retention_rate:.0f}% retention suggests viewers lost interest quickly. Consider stronger opening hooks and faster pacing in first 30 seconds.',
                'impact_level': 'high',
                'is_positive': False,
                'supporting_data': {'retention_rate': retention_rate, 'recommended': 45},
                'confidence_score': 0.87,
            })
        
        return insights
    
    async def generate_content_batch(
        self,
        user_id: str,
        niche: str,
        total_count: int = 30,
        backend_url: str = None,
        session = None,  # Database session to save content locally
    ) -> Dict:
        """Generate a batch of content pieces and send to backend."""
        
        if not backend_url:
            logger.warning("No backend URL provided, skipping content creation")
            return {'status': 'skipped', 'reason': 'no_backend_url'}
        
        # Determine follower counts (they grow over time)
        base_followers = {
            'youtube': 100000,
            'instagram': 50000,
            'tiktok': 200000,
        }
        
        # Generate titles
        titles = await self.generate_content_titles(niche, total_count)
        
        # Determine performance distribution
        # 20% overperforming, 60% normal, 20% underperforming
        overperforming_count = int(total_count * 0.2)
        underperforming_count = int(total_count * 0.2)
        normal_count = total_count - overperforming_count - underperforming_count
        
        performance_categories = (
            ['overperforming'] * overperforming_count +
            ['normal'] * normal_count +
            ['underperforming'] * underperforming_count
        )
        random.shuffle(performance_categories)
        
        # Generate content pieces over the last 90 days
        now = datetime.utcnow()
        content_pieces = []
        
        for i in range(total_count):
            # Spread content over 90 days, more recent = more content
            days_ago = random.randint(0, 90)
            # Bias toward optimal times for some content
            if random.random() < 0.4:  # 40% posted at optimal times
                day_of_week, hour = random.choice(self.OPTIMAL_TIMES)
                published_at = now - timedelta(days=days_ago)
                published_at = published_at.replace(hour=hour, minute=random.randint(0, 59))
                # Adjust to correct day of week
                days_diff = (published_at.weekday() - day_of_week) % 7
                published_at -= timedelta(days=days_diff)
            else:
                published_at = now - timedelta(
                    days=days_ago,
                    hours=random.randint(0, 23),
                    minutes=random.randint(0, 59)
                )
            
            platform = random.choice(['youtube', 'instagram', 'tiktok'])
            theme = random.choice(self.CONTENT_THEMES)
            
            # Follower count grows over time
            follower_growth_factor = 1.0 - (days_ago / 180)  # Grows over 6 months
            followers = int(base_followers[platform] * follower_growth_factor)
            
            content = self.generate_content_piece(
                title=titles[i] if i < len(titles) else f"Content {i+1}",
                platform=platform,
                niche=niche,
                theme=theme,
                published_at=published_at,
                follower_count=followers,
                is_top_performer=(performance_categories[i] == 'overperforming'),
                is_underperformer=(performance_categories[i] == 'underperforming'),
            )
            
            content_pieces.append(content)
        
        # Save content to demo service database if session provided
        # This is CRITICAL - interaction tasks need content in DemoContent table
        if session:
            from app.models.demo_content import DemoContent
            from app.models.demo_profile import DemoProfile
            import uuid
            from sqlalchemy import select
            
            # Get profile
            stmt = select(DemoProfile).where(DemoProfile.user_id == uuid.UUID(user_id))
            result = await session.execute(stmt)
            profile = result.scalar_one_or_none()
            
            if profile:
                logger.info(f"Saving {len(content_pieces)} content pieces to demo service database")
                for content_data in content_pieces:
                    # Parse published_at if it's a string
                    published_at = content_data['published_at']
                    if isinstance(published_at, str):
                        published_at = datetime.fromisoformat(published_at.replace('Z', '+00:00'))
                    
                    demo_content = DemoContent(
                        profile_id=profile.id,
                        platform=content_data['platform'],
                        external_id=content_data['platform_id'],  # Use external_id, not platform_id
                        content_type=content_data['content_type'],
                        title=content_data['title'],
                        description=content_data.get('description', ''),
                        published_at=published_at,
                        views=content_data['performance']['views'],
                        likes=content_data['performance']['likes'],
                        comments_count=0,  # Start at 0, will be incremented by interaction generation
                        shares=content_data['performance'].get('shares', 0),
                        # Set targets - worker will generate interactions up to these numbers
                        target_views=content_data['performance']['views'],
                        target_comments=content_data['performance']['comments_count'],
                        engagement_complete=False,  # Allow interaction generation
                    )
                    session.add(demo_content)
                
                await session.commit()
                logger.info(f"✅ Saved {len(content_pieces)} content pieces to demo service database")
            else:
                logger.warning(f"Profile not found for user {user_id}, skipping local save")
        
        # Send to backend
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(
                    f"{backend_url}/demo/content/bulk-create",
                    json={
                        'user_id': user_id,
                        'content_pieces': content_pieces,
                    },
                )
                
                if response.status_code == 200:
                    logger.info(f"Created {total_count} content pieces for user {user_id}")
                    return {'status': 'success', 'count': total_count}
                else:
                    logger.error(f"Failed to create content: {response.status_code} - {response.text}")
                    return {'status': 'error', 'message': response.text}
                    
            except Exception as e:
                logger.error(f"Error sending content to backend: {e}")
                return {'status': 'error', 'message': str(e)}
