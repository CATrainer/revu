"""Content analysis service for AI-powered monetization discovery."""

import os
from typing import Dict, List, Optional
from datetime import datetime, timedelta
import asyncio
from collections import Counter, defaultdict
import re

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from loguru import logger

from app.models.youtube_models import YouTubeVideo, YouTubeComment
from app.models.instagram_models import InstagramPost, InstagramComment
from app.models.monetization import ContentAnalysis, CreatorProfile


class ContentAnalyzer:
    """Analyzes creator's content and audience to inform opportunity generation."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def analyze_creator(self, user_id: str) -> Dict:
        """
        Main analysis function - pulls all data and generates insights.

        Returns ContentAnalysis that can be cached.
        """

        # Check for cached analysis (valid for 7 days)
        cached = await self._get_cached_analysis(user_id)
        if cached and cached.expires_at > datetime.utcnow():
            logger.info(f"Using cached analysis for user {user_id}")
            return {
                "top_topics": cached.top_topics,
                "content_type_performance": cached.content_type_performance,
                "audience_questions": cached.audience_questions,
                "question_volume_per_week": cached.question_volume_per_week,
                "repeat_engagers_count": cached.repeat_engagers_count,
                "dm_volume_estimate": cached.dm_volume_estimate,
                "growth_trajectory": cached.growth_trajectory,
                "key_strengths": cached.key_strengths,
                "analyzed_at": cached.analyzed_at,
                "expires_at": cached.expires_at
            }

        logger.info(f"Running fresh analysis for user {user_id}")

        # Get fresh data
        profile = await self._get_creator_profile(user_id)
        if not profile:
            raise ValueError("Creator profile not found")

        posts = await self._get_user_posts(user_id)
        comments = await self._get_user_comments(user_id)

        # Parallel analysis
        analysis_tasks = [
            self._analyze_topics(posts),
            self._analyze_content_performance(posts),
            self._analyze_audience_questions(comments),
            self._analyze_growth(posts, profile),
            self._identify_strengths(profile, posts, comments)
        ]

        results = await asyncio.gather(*analysis_tasks)

        analysis = {
            "top_topics": results[0],
            "content_type_performance": results[1],
            "audience_questions": results[2],
            "question_volume_per_week": self._count_questions(comments),
            "repeat_engagers_count": self._count_repeat_engagers(comments),
            "dm_volume_estimate": self._estimate_dm_volume(profile, comments),
            "growth_trajectory": results[3],
            "key_strengths": results[4],
            "analyzed_at": datetime.utcnow(),
            "expires_at": datetime.utcnow() + timedelta(days=7)
        }

        # Cache it
        await self._cache_analysis(user_id, analysis)

        return analysis

    async def _analyze_topics(self, posts: List[Dict]) -> List[Dict]:
        """
        Extract topics from posts and rank by engagement.

        Returns: [
            {topic: "web development", engagement_score: 8.5, post_count: 23, avg_views: 15000},
            ...
        ]
        """

        if not posts:
            return []

        # Extract keywords from titles/descriptions
        topic_data = defaultdict(lambda: {"posts": [], "views": [], "engagement": []})

        for post in posts:
            # Extract keywords from title/description
            text = f"{post.get('title', '')} {post.get('description', '')}".lower()
            keywords = self._extract_keywords(text)

            for keyword in keywords:
                topic_data[keyword]["posts"].append(post.get('id'))
                topic_data[keyword]["views"].append(post.get('view_count', 0))
                topic_data[keyword]["engagement"].append(
                    post.get('like_count', 0) + post.get('comment_count', 0)
                )

        # Calculate scores
        topics = []
        for topic, data in topic_data.items():
            if len(data["posts"]) < 3:  # Require at least 3 posts
                continue

            avg_views = sum(data["views"]) / len(data["views"]) if data["views"] else 0
            avg_engagement = sum(data["engagement"]) / len(data["engagement"]) if data["engagement"] else 0

            # Calculate engagement score (0-10 scale)
            # Higher engagement relative to views = higher score
            engagement_rate = (avg_engagement / avg_views * 100) if avg_views > 0 else 0
            engagement_score = min(10, engagement_rate)

            topics.append({
                "topic": topic,
                "engagement_score": round(engagement_score, 1),
                "post_count": len(data["posts"]),
                "avg_views": int(avg_views)
            })

        # Sort by engagement score
        topics.sort(key=lambda x: x["engagement_score"], reverse=True)

        return topics[:10]  # Top 10 topics

    async def _analyze_content_performance(self, posts: List[Dict]) -> Dict:
        """
        Analyze which content types perform best.

        Returns: {
            "video": 8.5,
            "carousel": 6.2,
            "single_image": 5.1,
            "text": 4.3
        }
        """

        if not posts:
            return {}

        # Group by content type
        type_performance = defaultdict(lambda: {"engagement": [], "views": []})

        for post in posts:
            content_type = post.get('content_type', 'unknown')
            views = post.get('view_count', 0)
            engagement = post.get('like_count', 0) + post.get('comment_count', 0)

            if views > 0:
                type_performance[content_type]["views"].append(views)
                type_performance[content_type]["engagement"].append(engagement)

        # Calculate normalized scores
        performance = {}
        max_score = 0

        for content_type, data in type_performance.items():
            if not data["views"]:
                continue

            avg_views = sum(data["views"]) / len(data["views"])
            avg_engagement = sum(data["engagement"]) / len(data["engagement"])

            # Score based on engagement rate
            engagement_rate = (avg_engagement / avg_views * 100) if avg_views > 0 else 0
            score = min(10, engagement_rate)

            performance[content_type] = round(score, 1)
            max_score = max(max_score, score)

        # Normalize to 0-10 scale if needed
        if max_score > 10:
            for content_type in performance:
                performance[content_type] = round(performance[content_type] / max_score * 10, 1)

        return performance

    async def _analyze_audience_questions(self, comments: List[Dict]) -> List[Dict]:
        """
        Categorize questions from comments.

        Returns: [
            {
                "type": "how_to",
                "frequency": 45,
                "examples": ["how do I build...", "what's the best way to..."]
            },
            ...
        ]
        """

        if not comments:
            return []

        # Extract questions
        questions = []
        for comment in comments:
            text = comment.get('text', '')
            if '?' in text:
                questions.append(text)

        # Categorize questions
        categories = {
            "how_to": {
                "patterns": [r'\bhow (do|can|to)\b', r'\bwhat.*way to\b', r'\bhow to\b'],
                "examples": []
            },
            "product_recommendation": {
                "patterns": [r'\bwhat (tool|product|software|app)\b', r'\bwhich.*use\b', r'\brecommend\b'],
                "examples": []
            },
            "tutorial_request": {
                "patterns": [r'\bcan you (show|make|do).*tutorial\b', r'\bplease.*video on\b'],
                "examples": []
            },
            "access_request": {
                "patterns": [r'\bhow.*join\b', r'\bwhere.*sign up\b', r'\blink.*course\b'],
                "examples": []
            },
            "advice_seeking": {
                "patterns": [r'\bshould i\b', r'\bwhat do you think\b', r'\byour opinion\b'],
                "examples": []
            }
        }

        for question in questions:
            question_lower = question.lower()
            for category, data in categories.items():
                if any(re.search(pattern, question_lower) for pattern in data["patterns"]):
                    if len(data["examples"]) < 3:
                        # Truncate long questions
                        example = question[:100] + "..." if len(question) > 100 else question
                        data["examples"].append(example)
                    break

        # Format results
        results = []
        for category, data in categories.items():
            if data["examples"]:
                results.append({
                    "type": category,
                    "frequency": len([q for q in questions if any(
                        re.search(p, q.lower()) for p in data["patterns"]
                    )]),
                    "examples": data["examples"]
                })

        results.sort(key=lambda x: x["frequency"], reverse=True)

        return results

    async def _analyze_growth(self, posts: List[Dict], profile: Dict) -> Dict:
        """
        Analyze follower growth trajectory.

        Returns: {
            "trend": "growing" | "stable" | "declining",
            "monthly_rate": 5.2,  # percentage
            "projection_3_months": 95000
        }
        """

        if not posts or len(posts) < 10:
            return {
                "trend": "unknown",
                "monthly_rate": 0.0,
                "projection_3_months": profile.get('follower_count', 0)
            }

        # Sort posts by date
        sorted_posts = sorted(posts, key=lambda x: x.get('published_at', datetime.min))

        # Calculate growth from post views over time
        # Approximate growth by comparing recent vs older post performance
        recent_posts = sorted_posts[-10:]
        older_posts = sorted_posts[:10]

        recent_avg_views = sum(p.get('view_count', 0) for p in recent_posts) / len(recent_posts)
        older_avg_views = sum(p.get('view_count', 0) for p in older_posts) / len(older_posts)

        if older_avg_views > 0:
            growth_rate = ((recent_avg_views - older_avg_views) / older_avg_views) * 100
        else:
            growth_rate = 0.0

        # Determine trend
        if growth_rate > 5:
            trend = "growing"
        elif growth_rate < -5:
            trend = "declining"
        else:
            trend = "stable"

        # Project forward (simplified)
        current_followers = profile.get('follower_count', 0)
        monthly_rate = growth_rate / 3  # Assuming posts span ~3 months
        projection_3_months = int(current_followers * (1 + monthly_rate / 100) ** 3)

        return {
            "trend": trend,
            "monthly_rate": round(monthly_rate, 1),
            "projection_3_months": projection_3_months
        }

    async def _identify_strengths(
        self,
        profile: Dict,
        posts: List[Dict],
        comments: List[Dict]
    ) -> List[str]:
        """
        Identify creator's key strengths.

        Returns: ["high_engagement", "tutorial_expertise", "consistent_posting", ...]
        """

        strengths = []

        # Check engagement rate
        engagement_rate = profile.get('engagement_rate', 0)
        if engagement_rate > 6.0:
            strengths.append("exceptional_engagement")
        elif engagement_rate > 4.0:
            strengths.append("high_engagement")

        # Check posting consistency
        if posts and len(posts) >= 20:
            dates = [p.get('published_at') for p in posts if p.get('published_at')]
            if dates and len(dates) >= 20:
                date_diffs = [(dates[i] - dates[i-1]).days for i in range(1, len(dates))]
                avg_gap = sum(date_diffs) / len(date_diffs) if date_diffs else 999

                if avg_gap <= 7:
                    strengths.append("consistent_weekly_posting")
                elif avg_gap <= 4:
                    strengths.append("frequent_posting")

        # Check tutorial/educational content
        tutorial_keywords = ['tutorial', 'how to', 'guide', 'learn', 'teach']
        tutorial_count = sum(
            1 for p in posts
            if any(kw in f"{p.get('title', '')} {p.get('description', '')}".lower()
                   for kw in tutorial_keywords)
        )
        if tutorial_count > len(posts) * 0.3:
            strengths.append("tutorial_expertise")

        # Check audience loyalty (repeat commenters)
        repeat_count = self._count_repeat_engagers(comments)
        if repeat_count > len(comments) * 0.2:
            strengths.append("loyal_audience")

        # Check content quality (views to followers ratio)
        if posts and profile.get('follower_count'):
            avg_views = sum(p.get('view_count', 0) for p in posts) / len(posts)
            view_ratio = avg_views / profile['follower_count']

            if view_ratio > 0.5:
                strengths.append("viral_reach")
            elif view_ratio > 0.2:
                strengths.append("strong_reach")

        return strengths

    def _count_questions(self, comments: List[Dict]) -> int:
        """Count questions per week."""
        if not comments:
            return 0

        questions = sum(1 for c in comments if '?' in c.get('text', ''))

        # Estimate weekly volume (assuming comments span recent period)
        # Simplified: divide by number of weeks in dataset
        if comments:
            dates = [c.get('created_at') for c in comments if c.get('created_at')]
            if dates and len(dates) > 1:
                time_span = (max(dates) - min(dates)).days / 7
                return int(questions / max(time_span, 1))

        return questions

    def _count_repeat_engagers(self, comments: List[Dict]) -> int:
        """Count users who comment multiple times."""
        if not comments:
            return 0

        commenter_counts = Counter(c.get('author_id') or c.get('author_name') for c in comments)
        repeat_engagers = sum(1 for count in commenter_counts.values() if count >= 3)

        return repeat_engagers

    def _estimate_dm_volume(self, profile: Dict, comments: List[Dict]) -> str:
        """Estimate DM volume: low, medium, high."""

        # Heuristic based on engagement and comment volume
        engagement_rate = profile.get('engagement_rate', 0)
        comment_count = len(comments)
        follower_count = profile.get('follower_count', 0)

        # Calculate score
        score = 0
        if engagement_rate > 5:
            score += 2
        elif engagement_rate > 3:
            score += 1

        if comment_count > 500:
            score += 2
        elif comment_count > 200:
            score += 1

        if follower_count > 50000:
            score += 1

        if score >= 4:
            return "high"
        elif score >= 2:
            return "medium"
        else:
            return "low"

    def _extract_keywords(self, text: str) -> List[str]:
        """Extract meaningful keywords from text."""

        # Remove URLs, mentions, hashtags
        text = re.sub(r'http\S+|@\w+|#\w+', '', text)

        # Common words to exclude
        stop_words = {
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'been', 'be',
            'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
            'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these',
            'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your',
            'his', 'her', 'its', 'our', 'their', 'me', 'him', 'them', 'us'
        }

        # Extract words
        words = re.findall(r'\b\w+\b', text.lower())

        # Filter and return
        keywords = [w for w in words if len(w) > 3 and w not in stop_words]

        # Return most common
        return [word for word, count in Counter(keywords).most_common(20)]

    # Database helper methods

    async def _get_creator_profile(self, user_id: str) -> Optional[Dict]:
        """Pull creator profile from DB."""
        from app.models.monetization import CreatorProfile

        result = await self.db.execute(
            select(CreatorProfile).where(CreatorProfile.user_id == user_id)
        )
        profile = result.scalar_one_or_none()

        if not profile:
            return None

        return {
            "primary_platform": profile.primary_platform,
            "follower_count": profile.follower_count,
            "engagement_rate": float(profile.engagement_rate),
            "niche": profile.niche,
            "avg_content_views": profile.avg_content_views,
            "content_frequency": profile.content_frequency
        }

    async def _get_user_posts(self, user_id: str, limit: int = 100) -> List[Dict]:
        """Pull recent posts from DB."""
        posts = []

        # Try YouTube first
        result = await self.db.execute(
            select(YouTubeVideo)
            .where(YouTubeVideo.user_id == user_id)
            .order_by(desc(YouTubeVideo.published_at))
            .limit(limit)
        )
        youtube_videos = result.scalars().all()

        for video in youtube_videos:
            posts.append({
                "id": str(video.id),
                "title": video.title,
                "description": video.description,
                "view_count": video.view_count or 0,
                "like_count": video.like_count or 0,
                "comment_count": video.comment_count or 0,
                "published_at": video.published_at,
                "content_type": "video"
            })

        # Try Instagram if no YouTube
        if not posts:
            result = await self.db.execute(
                select(InstagramPost)
                .where(InstagramPost.user_id == user_id)
                .order_by(desc(InstagramPost.created_at))
                .limit(limit)
            )
            instagram_posts = result.scalars().all()

            for post in instagram_posts:
                posts.append({
                    "id": str(post.id),
                    "title": post.caption[:100] if post.caption else "",
                    "description": post.caption or "",
                    "view_count": post.view_count or post.play_count or 0,
                    "like_count": post.like_count or 0,
                    "comment_count": post.comment_count or 0,
                    "published_at": post.created_at,
                    "content_type": post.media_type or "unknown"
                })

        return posts

    async def _get_user_comments(self, user_id: str, limit: int = 500) -> List[Dict]:
        """Pull recent comments from DB."""
        comments = []

        # Try YouTube
        result = await self.db.execute(
            select(YouTubeComment)
            .where(YouTubeComment.user_id == user_id)
            .order_by(desc(YouTubeComment.created_at))
            .limit(limit)
        )
        youtube_comments = result.scalars().all()

        for comment in youtube_comments:
            comments.append({
                "id": str(comment.id),
                "text": comment.text,
                "author_id": comment.author_channel_id,
                "author_name": comment.author_display_name,
                "created_at": comment.created_at
            })

        # Try Instagram
        if not comments:
            result = await self.db.execute(
                select(InstagramComment)
                .where(InstagramComment.user_id == user_id)
                .order_by(desc(InstagramComment.created_at))
                .limit(limit)
            )
            instagram_comments = result.scalars().all()

            for comment in instagram_comments:
                comments.append({
                    "id": str(comment.id),
                    "text": comment.text,
                    "author_id": comment.from_user_id,
                    "author_name": comment.from_username,
                    "created_at": comment.created_at
                })

        return comments

    async def _get_cached_analysis(self, user_id: str) -> Optional[ContentAnalysis]:
        """Check for cached analysis."""
        result = await self.db.execute(
            select(ContentAnalysis).where(ContentAnalysis.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def _cache_analysis(self, user_id: str, analysis: Dict):
        """Store analysis in content_analysis table."""
        from app.models.monetization import ContentAnalysis

        # Check if exists
        existing = await self._get_cached_analysis(user_id)

        if existing:
            # Update existing
            existing.top_topics = analysis["top_topics"]
            existing.content_type_performance = analysis["content_type_performance"]
            existing.audience_questions = analysis["audience_questions"]
            existing.question_volume_per_week = analysis["question_volume_per_week"]
            existing.repeat_engagers_count = analysis["repeat_engagers_count"]
            existing.dm_volume_estimate = analysis["dm_volume_estimate"]
            existing.growth_trajectory = analysis["growth_trajectory"]
            existing.key_strengths = analysis["key_strengths"]
            existing.analyzed_at = analysis["analyzed_at"]
            existing.expires_at = analysis["expires_at"]
            existing.updated_at = datetime.utcnow()
        else:
            # Create new
            new_analysis = ContentAnalysis(
                user_id=user_id,
                **analysis
            )
            self.db.add(new_analysis)

        await self.db.commit()

        logger.info(f"Cached analysis for user {user_id}")
