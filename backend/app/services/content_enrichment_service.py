"""Content enrichment service for video/post analysis.

Analyzes content to extract:
- Theme/category
- Topics
- Hashtags
- Performance score
- Summary
"""
from __future__ import annotations

import re
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta

from loguru import logger
from anthropic import AsyncAnthropic

from app.core.config import settings


class ContentEnrichmentService:
    """AI-powered content analysis and enrichment."""
    
    # Common themes
    THEMES = {
        'tutorial': ['how to', 'tutorial', 'guide', 'learn', 'teach', 'step by step'],
        'review': ['review', 'unboxing', 'first impressions', 'vs', 'comparison'],
        'vlog': ['vlog', 'day in', 'my life', 'daily', 'routine'],
        'storytime': ['story time', 'storytime', 'story', 'happened', 'experience'],
        'tips': ['tips', 'tricks', 'hacks', 'advice', 'secrets'],
        'challenge': ['challenge', 'try', 'attempt', 'test'],
        'reaction': ['reaction', 'reacting', 'responds', 'response'],
        'behind_scenes': ['behind the scenes', 'bts', 'making of', 'process'],
        'q&a': ['q&a', 'q and a', 'ask me', 'questions', 'answers'],
        'announcement': ['announcement', 'news', 'update', 'reveal'],
    }
    
    def __init__(self):
        """Initialize with Claude client for advanced analysis."""
        api_key = getattr(settings, "CLAUDE_API_KEY", None)
        self.claude_client = AsyncAnthropic(api_key=api_key) if api_key else None
        self.use_ai = api_key is not None
    
    async def enrich_content(
        self,
        title: str,
        description: Optional[str] = None,
        tags: Optional[List[str]] = None,
        view_count: int = 0,
        like_count: int = 0,
        comment_count: int = 0,
        published_at: Optional[datetime] = None,
        channel_avg_views: Optional[int] = None
    ) -> Dict:
        """
        Enrich content with AI analysis.
        
        Args:
            title: Content title
            description: Content description
            tags: Existing tags/hashtags
            view_count: Number of views
            like_count: Number of likes
            comment_count: Number of comments
            published_at: Publication date
            channel_avg_views: Channel's average views per video
            
        Returns:
            Dict with: theme, topics, hashtags, performance_score, summary
        """
        if not title or not title.strip():
            return self._empty_enrichment()
        
        # Basic analysis
        theme = self._detect_theme(title, description)
        topics = self._extract_topics(title, description, tags)
        hashtags = self._extract_hashtags(description or '')
        
        # Performance scoring
        performance_score = self._calculate_performance_score(
            view_count=view_count,
            like_count=like_count,
            comment_count=comment_count,
            published_at=published_at,
            channel_avg_views=channel_avg_views
        )
        
        # Generate summary (AI if available)
        summary = await self._generate_summary(title, description)
        
        return {
            'theme': theme,
            'detected_topics': topics[:10],  # Limit to top 10
            'hashtags': hashtags[:20],  # Limit to top 20
            'performance_score': performance_score,
            'summary': summary
        }
    
    def _detect_theme(self, title: str, description: Optional[str] = None) -> str:
        """Detect content theme from title and description."""
        text = f"{title} {description or ''}".lower()
        
        # Check each theme's keywords
        theme_scores = {}
        for theme, keywords in self.THEMES.items():
            score = sum(1 for keyword in keywords if keyword in text)
            if score > 0:
                theme_scores[theme] = score
        
        # Return theme with highest score
        if theme_scores:
            return max(theme_scores.items(), key=lambda x: x[1])[0]
        
        # Default theme
        return 'general'
    
    def _extract_topics(
        self,
        title: str,
        description: Optional[str] = None,
        tags: Optional[List[str]] = None
    ) -> List[str]:
        """Extract topics from content."""
        topics = []
        
        # Extract from tags first
        if tags:
            topics.extend([tag.lower() for tag in tags if len(tag) > 2])
        
        # Extract from title and description
        text = f"{title} {description or ''}"
        
        # Remove URLs and special characters
        text = re.sub(r'http\S+|www\.\S+', '', text)
        text = re.sub(r'[^\w\s#]', ' ', text)
        
        # Extract hashtags as topics
        hashtags = re.findall(r'#(\w+)', text)
        topics.extend([h.lower() for h in hashtags])
        
        # Extract capitalized words (likely important terms)
        words = text.split()
        capitalized = [w.lower() for w in words if w and w[0].isupper() and len(w) > 3]
        topics.extend(capitalized)
        
        # Remove duplicates and return
        return list(dict.fromkeys(topics))  # Preserves order
    
    def _extract_hashtags(self, text: str) -> List[str]:
        """Extract hashtags from text."""
        if not text:
            return []
        
        # Find all hashtags
        hashtags = re.findall(r'#(\w+)', text)
        
        # Clean and deduplicate
        hashtags = [h.lower() for h in hashtags if len(h) > 1]
        return list(dict.fromkeys(hashtags))
    
    def _calculate_performance_score(
        self,
        view_count: int,
        like_count: int,
        comment_count: int,
        published_at: Optional[datetime],
        channel_avg_views: Optional[int]
    ) -> float:
        """
        Calculate performance score (0-100).
        
        Compares video performance to channel average and considers:
        - View count relative to average
        - Engagement rate (likes + comments / views)
        - Velocity (views per day since publish)
        """
        if view_count == 0:
            return 50.0  # Neutral score for new content
        
        score = 50.0  # Base score
        
        # 1. Compare to channel average (40 points)
        if channel_avg_views and channel_avg_views > 0:
            ratio = view_count / channel_avg_views
            if ratio >= 2.0:
                score += 40  # 2x better than average
            elif ratio >= 1.5:
                score += 30  # 1.5x better
            elif ratio >= 1.2:
                score += 20  # 1.2x better
            elif ratio >= 1.0:
                score += 10  # At average
            elif ratio >= 0.8:
                score += 0   # Slightly below
            elif ratio >= 0.5:
                score -= 10  # Below average
            else:
                score -= 20  # Well below average
        
        # 2. Engagement rate (30 points)
        engagement_count = like_count + comment_count
        engagement_rate = (engagement_count / view_count) * 100
        
        if engagement_rate >= 10:
            score += 30  # Excellent engagement
        elif engagement_rate >= 5:
            score += 20  # Great engagement
        elif engagement_rate >= 3:
            score += 10  # Good engagement
        elif engagement_rate >= 1:
            score += 5   # Average engagement
        # Below 1% = no bonus
        
        # 3. Velocity (30 points) - views per day
        if published_at:
            days_since_publish = max(1, (datetime.utcnow() - published_at).days)
            views_per_day = view_count / days_since_publish
            
            if channel_avg_views:
                expected_daily = channel_avg_views / 30  # Assume 30-day average
                velocity_ratio = views_per_day / max(1, expected_daily)
                
                if velocity_ratio >= 2.0:
                    score += 30  # Viral velocity
                elif velocity_ratio >= 1.5:
                    score += 20  # High velocity
                elif velocity_ratio >= 1.0:
                    score += 10  # Normal velocity
                # Below 1.0 = no bonus
        
        # Cap at 0-100
        return max(0.0, min(100.0, score))
    
    async def _generate_summary(
        self,
        title: str,
        description: Optional[str] = None
    ) -> str:
        """Generate AI summary of content."""
        # If no AI or no description, use title
        if not self.use_ai or not description or len(description) < 50:
            return title[:200]
        
        try:
            prompt = f"""Summarize this content in 1-2 sentences (max 200 characters):

Title: {title}
Description: {description[:500]}

Summary:"""
            
            response = await self.claude_client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=100,
                messages=[{"role": "user", "content": prompt}]
            )
            
            summary = response.content[0].text.strip()
            return summary[:200]
        except Exception as e:
            logger.error(f"Summary generation error: {e}")
            return title[:200]
    
    def calculate_percentile_rank(
        self,
        performance_score: float,
        all_scores: List[float]
    ) -> int:
        """
        Calculate percentile rank (0-100) compared to other content.
        
        Args:
            performance_score: This content's score
            all_scores: List of all scores to compare against
            
        Returns:
            Percentile rank (0-100)
        """
        if not all_scores:
            return 50
        
        # Count how many scores are below this one
        below_count = sum(1 for score in all_scores if score < performance_score)
        percentile = (below_count / len(all_scores)) * 100
        
        return int(percentile)
    
    def determine_performance_category(self, percentile_rank: int) -> str:
        """
        Determine performance category from percentile.
        
        Returns: 'overperforming', 'normal', or 'underperforming'
        """
        if percentile_rank >= 75:
            return 'overperforming'
        elif percentile_rank >= 25:
            return 'normal'
        else:
            return 'underperforming'
    
    def extract_posting_time_data(self, published_at: datetime) -> Dict:
        """
        Extract posting time metadata.
        
        Returns:
            Dict with: day_of_week, hour_of_day, timezone
        """
        return {
            'day_of_week': published_at.weekday(),  # 0=Monday, 6=Sunday
            'hour_of_day': published_at.hour,
            'timezone': 'UTC'  # Assuming UTC, adjust if needed
        }
    
    def _empty_enrichment(self) -> Dict:
        """Return empty enrichment for invalid input."""
        return {
            'theme': 'general',
            'detected_topics': [],
            'hashtags': [],
            'performance_score': 50.0,
            'summary': ''
        }
    
    async def enrich_batch(self, content_items: List[Dict]) -> List[Dict]:
        """
        Enrich multiple content items in batch.
        
        Args:
            content_items: List of dicts with title, description, stats, etc.
            
        Returns:
            List of enrichment results
        """
        results = []
        for item in content_items:
            enrichment = await self.enrich_content(
                title=item.get('title', ''),
                description=item.get('description'),
                tags=item.get('tags'),
                view_count=item.get('view_count', 0),
                like_count=item.get('like_count', 0),
                comment_count=item.get('comment_count', 0),
                published_at=item.get('published_at'),
                channel_avg_views=item.get('channel_avg_views')
            )
            results.append(enrichment)
        return results


# Singleton instance
_content_enrichment_service: Optional[ContentEnrichmentService] = None


def get_content_enrichment_service() -> ContentEnrichmentService:
    """Get or create the content enrichment service singleton."""
    global _content_enrichment_service
    if _content_enrichment_service is None:
        _content_enrichment_service = ContentEnrichmentService()
    return _content_enrichment_service
