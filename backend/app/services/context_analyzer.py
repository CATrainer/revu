"""Service to analyze user data and build AI context."""

from datetime import datetime, timedelta
from typing import Dict, List, Optional
from collections import Counter
import statistics

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.youtube import YouTubeConnection, YouTubeVideo
from app.models.ai_context import UserAIContext


class ContextAnalyzer:
    """Analyze user's content and build personalized AI context."""
    
    @staticmethod
    async def analyze_youtube_context(db: AsyncSession, user_id: str) -> Dict:
        """Extract context from YouTube connection and videos."""
        context = {}
        
        # Get YouTube connection
        yt_conn = await db.execute(
            select(YouTubeConnection).where(YouTubeConnection.user_id == user_id)
        )
        connection = yt_conn.scalar_one_or_none()
        
        if not connection:
            return context
        
        context["channel_name"] = connection.channel_name
        context["primary_platform"] = "YouTube"
        # Note: subscriber_count would need to be fetched from YouTube API
        # For now, we'll calculate metrics from videos
        
        # Get recent videos (last 50)
        videos_result = await db.execute(
            select(YouTubeVideo)
            .where(YouTubeVideo.channel_id == connection.id)
            .order_by(YouTubeVideo.published_at.desc())
            .limit(50)
        )
        videos = videos_result.scalars().all()
        
        if not videos:
            return context
        
        # Analyze video lengths
        durations = []
        for video in videos:
            if video.duration:
                # Parse ISO 8601 duration (PT#H#M#S)
                duration_str = video.duration
                try:
                    seconds = ContextAnalyzer._parse_duration(duration_str)
                    if seconds:
                        durations.append(seconds)
                except:
                    pass
        
        if durations:
            avg_duration = int(statistics.mean(durations))
            context["avg_video_length"] = avg_duration
            
            # Determine content type based on average length
            if avg_duration < 60:
                context["content_type"] = "Shorts"
            elif avg_duration < 600:  # Less than 10 min
                context["content_type"] = "Short-form"
            else:
                context["content_type"] = "Long-form"
        
        # Analyze upload frequency
        if len(videos) >= 10:
            # Get dates of last 10 videos
            recent_dates = [v.published_at for v in videos[:10] if v.published_at]
            if len(recent_dates) >= 2:
                recent_dates.sort(reverse=True)
                days_span = (recent_dates[0] - recent_dates[-1]).days
                if days_span > 0:
                    uploads_per_week = len(recent_dates) / (days_span / 7)
                    
                    if uploads_per_week >= 7:
                        context["upload_frequency"] = "Daily (7+/week)"
                    elif uploads_per_week >= 5:
                        context["upload_frequency"] = "5-6x per week"
                    elif uploads_per_week >= 3:
                        context["upload_frequency"] = "3-4x per week"
                    elif uploads_per_week >= 1:
                        context["upload_frequency"] = "1-2x per week"
                    else:
                        context["upload_frequency"] = "Less than weekly"
        
        # Analyze engagement and views
        view_counts = [v.view_count for v in videos if v.view_count]
        if view_counts:
            context["avg_views"] = int(statistics.mean(view_counts))
        
        # Extract niche from titles and descriptions
        all_text = " ".join([v.title or "" for v in videos])
        all_text += " " + " ".join([v.description or "" for v in videos[:10]])  # First 10 descriptions
        
        niche = ContextAnalyzer._detect_niche(all_text)
        if niche:
            context["niche"] = niche
        
        # Extract top topics
        titles = [v.title for v in videos if v.title]
        topics = ContextAnalyzer._extract_topics(titles)
        if topics:
            context["top_performing_topics"] = topics[:5]
        
        return context
    
    @staticmethod
    def _parse_duration(duration_str: str) -> Optional[int]:
        """Parse ISO 8601 duration to seconds."""
        if not duration_str or not duration_str.startswith("PT"):
            return None
        
        duration_str = duration_str[2:]  # Remove 'PT'
        hours = 0
        minutes = 0
        seconds = 0
        
        if 'H' in duration_str:
            hours = int(duration_str.split('H')[0])
            duration_str = duration_str.split('H')[1]
        
        if 'M' in duration_str:
            minutes = int(duration_str.split('M')[0])
            duration_str = duration_str.split('M')[1]
        
        if 'S' in duration_str:
            seconds = int(duration_str.split('S')[0])
        
        return hours * 3600 + minutes * 60 + seconds
    
    @staticmethod
    def _detect_niche(text: str) -> Optional[str]:
        """Detect content niche from text."""
        text_lower = text.lower()
        
        # Define niche keywords
        niches = {
            "Gaming": ["gaming", "gameplay", "game", "lets play", "walkthrough", "speedrun"],
            "Tech/Reviews": ["review", "unboxing", "tech", "gadget", "smartphone", "laptop", "testing"],
            "Education/Tutorial": ["tutorial", "how to", "guide", "learn", "course", "lesson", "education"],
            "Fitness/Health": ["workout", "fitness", "exercise", "gym", "health", "nutrition", "training"],
            "Beauty/Fashion": ["makeup", "beauty", "fashion", "skincare", "haul", "outfit"],
            "Cooking/Food": ["recipe", "cooking", "food", "baking", "meal", "kitchen"],
            "Vlog/Lifestyle": ["vlog", "day in the life", "lifestyle", "daily", "routine"],
            "Comedy/Entertainment": ["funny", "comedy", "prank", "reaction", "entertainment", "challenge"],
            "Business/Finance": ["business", "finance", "investing", "money", "entrepreneurship", "startup"],
            "Travel": ["travel", "vacation", "destination", "trip", "adventure", "explore"],
            "Music": ["music", "cover", "song", "singing", "instrumental", "performance"],
            "Science": ["science", "experiment", "discovery", "research", "physics", "chemistry"],
        }
        
        niche_scores = {}
        for niche, keywords in niches.items():
            score = sum(text_lower.count(keyword) for keyword in keywords)
            if score > 0:
                niche_scores[niche] = score
        
        if niche_scores:
            return max(niche_scores, key=niche_scores.get)
        
        return None
    
    @staticmethod
    def _extract_topics(titles: List[str]) -> List[str]:
        """Extract common topics/themes from titles."""
        # Extract meaningful words (3+ chars, not common words)
        stop_words = {"the", "and", "for", "with", "this", "that", "from", "what", "how", "why", "when", "where"}
        
        words = []
        for title in titles:
            title_words = title.lower().split()
            words.extend([w.strip("!?,.:;") for w in title_words if len(w) > 3 and w not in stop_words])
        
        # Get most common
        word_counts = Counter(words)
        return [word for word, count in word_counts.most_common(10)]
    
    @staticmethod
    async def update_user_context(db: AsyncSession, user_id: str) -> UserAIContext:
        """Build or update user's AI context from all sources."""
        # Check if context exists
        existing = await db.execute(
            select(UserAIContext).where(UserAIContext.user_id == user_id)
        )
        context = existing.scalar_one_or_none()
        
        # Analyze YouTube data
        yt_context = await ContextAnalyzer.analyze_youtube_context(db, user_id)
        
        if context:
            # Update existing
            for key, value in yt_context.items():
                if hasattr(context, key):
                    setattr(context, key, value)
            context.last_auto_update = datetime.utcnow()
            context.data_sources = ["youtube"]
        else:
            # Create new
            context = UserAIContext(
                user_id=user_id,
                last_auto_update=datetime.utcnow(),
                data_sources=["youtube"],
                **yt_context
            )
            db.add(context)
        
        await db.commit()
        await db.refresh(context)
        
        return context
