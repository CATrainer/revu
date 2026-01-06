"""Content Analysis Service - AI-powered deep analysis of content performance.

This service provides sophisticated analysis of why content succeeds or fails,
identifying patterns, generating actionable insights, and creating trend summaries.
"""
import json
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Tuple
from uuid import UUID
from decimal import Decimal

from sqlalchemy import select, func, and_, desc, asc
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.models.content import ContentPiece, ContentPerformance, ContentInsight, ContentTheme
from app.models.user import User
from app.core.config import settings


class ContentAnalysisService:
    """Service for AI-powered content performance analysis.
    
    Key capabilities:
    - Classify content as top performer, average, or underperformer
    - Generate deep AI analysis explaining WHY content performed as it did
    - Identify patterns across successful/unsuccessful content
    - Create actionable recommendations
    """
    
    # Performance thresholds (relative to user's average)
    TOP_PERFORMER_THRESHOLD = 1.5  # 1.5x average = top performer
    UNDERPERFORMER_THRESHOLD = 0.5  # 0.5x average = underperformer
    
    def __init__(self, session: AsyncSession):
        self.session = session
        self._anthropic_client = None
    
    @property
    def anthropic_client(self):
        """Lazy-load Anthropic client."""
        if self._anthropic_client is None:
            from anthropic import AsyncAnthropic
            self._anthropic_client = AsyncAnthropic(
                api_key=settings.EFFECTIVE_ANTHROPIC_KEY
            )
        return self._anthropic_client
    
    async def calculate_user_baseline(
        self,
        user_id: UUID,
        days: int = 90,
        is_demo: bool = False
    ) -> Dict[str, float]:
        """Calculate user's baseline performance metrics.
        
        Returns average engagement rate, views, etc. for comparison.
        """
        date_from = datetime.utcnow() - timedelta(days=days)
        
        result = await self.session.execute(
            select(
                func.avg(ContentPerformance.engagement_rate).label('avg_engagement'),
                func.avg(ContentPerformance.views).label('avg_views'),
                func.avg(ContentPerformance.likes).label('avg_likes'),
                func.avg(ContentPerformance.comments_count).label('avg_comments'),
                func.stddev(ContentPerformance.engagement_rate).label('stddev_engagement'),
                func.count(ContentPiece.id).label('total_content'),
            )
            .select_from(ContentPiece)
            .join(ContentPerformance, ContentPiece.id == ContentPerformance.content_id)
            .where(
                and_(
                    ContentPiece.user_id == user_id,
                    ContentPiece.is_demo == is_demo,
                    ContentPiece.is_deleted == False,
                    ContentPiece.published_at >= date_from,
                )
            )
        )
        row = result.first()
        
        return {
            'avg_engagement': float(row.avg_engagement or 0),
            'avg_views': float(row.avg_views or 0),
            'avg_likes': float(row.avg_likes or 0),
            'avg_comments': float(row.avg_comments or 0),
            'stddev_engagement': float(row.stddev_engagement or 0),
            'total_content': row.total_content or 0,
        }
    
    async def classify_content(
        self,
        user_id: UUID,
        is_demo: bool = False,
        force_reclassify: bool = False
    ) -> Dict[str, int]:
        """Classify all user content into performance categories.
        
        Categories:
        - top_performer: engagement >= 1.5x user average
        - average: between 0.5x and 1.5x
        - underperformer: engagement < 0.5x user average
        
        Returns count of each category.
        """
        baseline = await self.calculate_user_baseline(user_id, is_demo=is_demo)
        
        if baseline['total_content'] == 0:
            return {'top_performer': 0, 'average': 0, 'underperformer': 0}
        
        avg_engagement = baseline['avg_engagement']
        top_threshold = avg_engagement * self.TOP_PERFORMER_THRESHOLD
        under_threshold = avg_engagement * self.UNDERPERFORMER_THRESHOLD
        
        # Get all content with performance
        result = await self.session.execute(
            select(ContentPiece, ContentPerformance)
            .join(ContentPerformance, ContentPiece.id == ContentPerformance.content_id)
            .where(
                and_(
                    ContentPiece.user_id == user_id,
                    ContentPiece.is_demo == is_demo,
                    ContentPiece.is_deleted == False,
                )
            )
        )
        
        counts = {'top_performer': 0, 'average': 0, 'underperformer': 0}
        
        for content, performance in result.fetchall():
            engagement = float(performance.engagement_rate or 0)
            
            if engagement >= top_threshold:
                category = 'overperforming'
                counts['top_performer'] += 1
            elif engagement <= under_threshold:
                category = 'underperforming'
                counts['underperformer'] += 1
            else:
                category = 'normal'
                counts['average'] += 1
            
            # Update if changed or force reclassify
            if force_reclassify or performance.performance_category != category:
                performance.performance_category = category
                
                # Calculate performance score (0-100)
                if avg_engagement > 0:
                    score = min(100, (engagement / avg_engagement) * 50)
                else:
                    score = 50
                performance.performance_score = Decimal(str(round(score, 2)))
        
        await self.session.commit()
        return counts
    
    async def get_top_performers(
        self,
        user_id: UUID,
        is_demo: bool = False,
        limit: int = 10,
        days: int = 90
    ) -> List[Dict[str, Any]]:
        """Get top performing content with full details."""
        date_from = datetime.utcnow() - timedelta(days=days)
        
        result = await self.session.execute(
            select(ContentPiece, ContentPerformance)
            .join(ContentPerformance, ContentPiece.id == ContentPerformance.content_id)
            .where(
                and_(
                    ContentPiece.user_id == user_id,
                    ContentPiece.is_demo == is_demo,
                    ContentPiece.is_deleted == False,
                    ContentPiece.published_at >= date_from,
                    ContentPerformance.performance_category == 'overperforming',
                )
            )
            .order_by(desc(ContentPerformance.performance_score))
            .limit(limit)
        )
        
        performers = []
        for content, performance in result.fetchall():
            # Get existing insights
            insights_result = await self.session.execute(
                select(ContentInsight)
                .where(ContentInsight.content_id == content.id)
                .order_by(desc(ContentInsight.impact_level))
            )
            insights = insights_result.scalars().all()
            
            performers.append({
                'content': content,
                'performance': performance,
                'insights': insights,
            })
        
        return performers
    
    async def get_underperformers(
        self,
        user_id: UUID,
        is_demo: bool = False,
        limit: int = 10,
        days: int = 90
    ) -> List[Dict[str, Any]]:
        """Get underperforming content with full details."""
        date_from = datetime.utcnow() - timedelta(days=days)
        
        result = await self.session.execute(
            select(ContentPiece, ContentPerformance)
            .join(ContentPerformance, ContentPiece.id == ContentPerformance.content_id)
            .where(
                and_(
                    ContentPiece.user_id == user_id,
                    ContentPiece.is_demo == is_demo,
                    ContentPiece.is_deleted == False,
                    ContentPiece.published_at >= date_from,
                    ContentPerformance.performance_category == 'underperforming',
                )
            )
            .order_by(asc(ContentPerformance.performance_score))
            .limit(limit)
        )
        
        performers = []
        for content, performance in result.fetchall():
            insights_result = await self.session.execute(
                select(ContentInsight)
                .where(ContentInsight.content_id == content.id)
                .order_by(desc(ContentInsight.impact_level))
            )
            insights = insights_result.scalars().all()
            
            performers.append({
                'content': content,
                'performance': performance,
                'insights': insights,
            })
        
        return performers
    
    async def generate_content_analysis(
        self,
        content: ContentPiece,
        performance: ContentPerformance,
        baseline: Dict[str, float],
        is_top_performer: bool
    ) -> Dict[str, Any]:
        """Generate deep AI analysis for a single piece of content.
        
        Returns structured analysis with:
        - why_summary: 1-2 sentence explanation
        - key_factors: List of 2-4 identified reasons
        - recommendations: Actionable next steps
        """
        engagement_ratio = float(performance.engagement_rate or 0) / max(baseline['avg_engagement'], 0.01)
        views_ratio = float(performance.views or 0) / max(baseline['avg_views'], 1)
        
        if is_top_performer:
            prompt = self._build_success_analysis_prompt(
                content, performance, baseline, engagement_ratio, views_ratio
            )
        else:
            prompt = self._build_failure_analysis_prompt(
                content, performance, baseline, engagement_ratio, views_ratio
            )
        
        try:
            response = await self.anthropic_client.messages.create(
                model=settings.CLAUDE_MODEL or "claude-3-5-sonnet-latest",
                max_tokens=800,
                temperature=0.3,
                messages=[{"role": "user", "content": prompt}]
            )
            
            result_text = response.content[0].text.strip()
            
            # Parse JSON response
            if "```json" in result_text:
                result_text = result_text.split("```json")[1].split("```")[0]
            elif "```" in result_text:
                result_text = result_text.split("```")[1].split("```")[0]
            
            analysis = json.loads(result_text)
            return analysis
            
        except Exception as e:
            logger.error(f"Error generating content analysis: {e}")
            # Return fallback analysis
            if is_top_performer:
                return {
                    "why_summary": "This content performed above your average, showing strong audience resonance.",
                    "key_factors": ["Higher than average engagement", "Good audience response"],
                    "recommendations": ["Create more content in this style", "Analyze what made this resonate"]
                }
            else:
                return {
                    "why_summary": "This content performed below your average, suggesting room for improvement.",
                    "key_factors": ["Lower than average engagement", "May not have reached target audience"],
                    "recommendations": ["Review timing and format", "Consider different approach to this topic"]
                }
    
    def _build_success_analysis_prompt(
        self,
        content: ContentPiece,
        performance: ContentPerformance,
        baseline: Dict[str, float],
        engagement_ratio: float,
        views_ratio: float
    ) -> str:
        """Build prompt for analyzing successful content."""
        return f"""You are an expert social media content strategist analyzing why a piece of content significantly outperformed.

CONTENT DETAILS:
- Platform: {content.platform}
- Type: {content.content_type}
- Title: "{content.title}"
- Description: "{(content.description or '')[:500]}"
- Theme/Topic: {content.theme or 'Not categorized'}
- Published: {content.published_at.strftime('%A, %B %d at %I:%M %p')}
- Hashtags: {', '.join(content.hashtags or []) or 'None'}

PERFORMANCE METRICS:
- Views: {performance.views:,} ({views_ratio:.1f}x creator's average)
- Engagement Rate: {float(performance.engagement_rate or 0):.2f}% ({engagement_ratio:.1f}x creator's average)
- Likes: {performance.likes:,}
- Comments: {performance.comments_count:,}
- Shares: {performance.shares:,}

CREATOR'S BASELINE (for comparison):
- Average Engagement: {baseline['avg_engagement']:.2f}%
- Average Views: {baseline['avg_views']:,.0f}
- Total Content Analyzed: {baseline['total_content']} pieces

Analyze WHY this content significantly outperformed. Consider:
1. Title/hook effectiveness - did it grab attention?
2. Topic relevance - is this a trending or evergreen topic?
3. Timing - was it posted at an optimal time?
4. Format - did the content type suit the message?
5. Emotional triggers - what emotions did it evoke?
6. Call-to-action - did it encourage engagement?
7. Visual appeal - thumbnail/first impression
8. Authenticity - did it feel genuine?

Respond with JSON only:
{{
    "why_summary": "1-2 sentence explanation of the primary success factor",
    "key_factors": ["Factor 1 with specific detail", "Factor 2 with specific detail", "Factor 3 with specific detail"],
    "recommendations": ["Specific action to replicate success", "Another specific action"],
    "content_type_insight": "Brief insight about why this format worked",
    "timing_insight": "Brief insight about posting time if relevant"
}}"""

    def _build_failure_analysis_prompt(
        self,
        content: ContentPiece,
        performance: ContentPerformance,
        baseline: Dict[str, float],
        engagement_ratio: float,
        views_ratio: float
    ) -> str:
        """Build prompt for analyzing underperforming content."""
        return f"""You are an expert social media content strategist providing constructive analysis of underperforming content.

CONTENT DETAILS:
- Platform: {content.platform}
- Type: {content.content_type}
- Title: "{content.title}"
- Description: "{(content.description or '')[:500]}"
- Theme/Topic: {content.theme or 'Not categorized'}
- Published: {content.published_at.strftime('%A, %B %d at %I:%M %p')}
- Hashtags: {', '.join(content.hashtags or []) or 'None'}

PERFORMANCE METRICS:
- Views: {performance.views:,} ({views_ratio:.1f}x creator's average)
- Engagement Rate: {float(performance.engagement_rate or 0):.2f}% ({engagement_ratio:.1f}x creator's average)
- Likes: {performance.likes:,}
- Comments: {performance.comments_count:,}
- Shares: {performance.shares:,}

CREATOR'S BASELINE (for comparison):
- Average Engagement: {baseline['avg_engagement']:.2f}%
- Average Views: {baseline['avg_views']:,.0f}
- Total Content Analyzed: {baseline['total_content']} pieces

Analyze WHY this content underperformed. Be constructive and specific. Consider:
1. Title/hook - was it compelling enough?
2. Topic saturation - is this topic overdone?
3. Timing - was it posted at a suboptimal time?
4. Format mismatch - did the format suit the content?
5. Audience alignment - did it match audience interests?
6. Technical issues - quality, length, pacing?
7. Competition - was there competing content?
8. Missing elements - what was lacking?

Be encouraging and focus on actionable improvements. Avoid harsh criticism.

Respond with JSON only:
{{
    "why_summary": "1-2 sentence constructive explanation of the main issue",
    "key_factors": ["Contributing factor 1 with constructive framing", "Contributing factor 2", "Contributing factor 3"],
    "recommendations": ["Specific improvement suggestion", "Another actionable suggestion", "Third suggestion"],
    "salvage_potential": "Brief note on whether this content could be repurposed or improved",
    "learning_opportunity": "What can be learned from this for future content"
}}"""

    async def generate_trends_summary(
        self,
        user_id: UUID,
        is_demo: bool = False,
        is_positive: bool = True,
        days: int = 90
    ) -> Dict[str, Any]:
        """Generate AI summary of patterns across top/underperforming content.
        
        Args:
            is_positive: True for success patterns, False for failure patterns
        """
        if is_positive:
            performers = await self.get_top_performers(user_id, is_demo, limit=10, days=days)
            category = "top performing"
        else:
            performers = await self.get_underperformers(user_id, is_demo, limit=10, days=days)
            category = "underperforming"
        
        if not performers:
            return {
                "summary": f"Not enough {category} content to identify patterns yet.",
                "patterns": [],
                "recommendations": []
            }
        
        # Build content summary for analysis
        content_summaries = []
        for p in performers[:10]:
            content = p['content']
            perf = p['performance']
            content_summaries.append(
                f"- '{content.title}' ({content.platform}, {content.content_type}): "
                f"{perf.views:,} views, {float(perf.engagement_rate or 0):.1f}% engagement, "
                f"theme: {content.theme or 'unknown'}, "
                f"posted: {content.published_at.strftime('%A %I:%M %p')}"
            )
        
        prompt = f"""You are an expert social media strategist identifying patterns across a creator's {'best' if is_positive else 'underperforming'} content.

CONTENT TO ANALYZE ({len(performers)} pieces):
{chr(10).join(content_summaries)}

{'Identify what these successful pieces have in common.' if is_positive else 'Identify common issues across these underperforming pieces.'}

Look for patterns in:
1. Content themes/topics
2. Posting times and days
3. Content formats
4. Title styles
5. Engagement triggers

Respond with JSON only:
{{
    "summary": "2-3 sentence overview of the main {'success' if is_positive else 'improvement'} patterns",
    "patterns": [
        {{"pattern": "Pattern description", "frequency": "How often this appears", "impact": "high/medium/low"}},
        {{"pattern": "Another pattern", "frequency": "...", "impact": "..."}}
    ],
    "top_recommendation": "The single most important {'thing to do more of' if is_positive else 'thing to improve'}",
    "quick_wins": ["Quick actionable tip 1", "Quick actionable tip 2"]
}}"""

        try:
            response = await self.anthropic_client.messages.create(
                model=settings.CLAUDE_MODEL or "claude-3-5-sonnet-latest",
                max_tokens=600,
                temperature=0.3,
                messages=[{"role": "user", "content": prompt}]
            )
            
            result_text = response.content[0].text.strip()
            
            if "```json" in result_text:
                result_text = result_text.split("```json")[1].split("```")[0]
            elif "```" in result_text:
                result_text = result_text.split("```")[1].split("```")[0]
            
            return json.loads(result_text)
            
        except Exception as e:
            logger.error(f"Error generating trends summary: {e}")
            return {
                "summary": f"Analysis of {category} content patterns.",
                "patterns": [],
                "top_recommendation": "Continue creating content and check back for pattern analysis.",
                "quick_wins": []
            }
    
    async def identify_top_themes(
        self,
        user_id: UUID,
        is_demo: bool = False,
        days: int = 90
    ) -> List[Dict[str, Any]]:
        """Identify and rank themes by performance."""
        date_from = datetime.utcnow() - timedelta(days=days)
        
        result = await self.session.execute(
            select(
                ContentPiece.theme,
                func.count(ContentPiece.id).label('count'),
                func.avg(ContentPerformance.engagement_rate).label('avg_engagement'),
                func.avg(ContentPerformance.views).label('avg_views'),
                func.sum(ContentPerformance.views).label('total_views'),
            )
            .join(ContentPerformance, ContentPiece.id == ContentPerformance.content_id)
            .where(
                and_(
                    ContentPiece.user_id == user_id,
                    ContentPiece.is_demo == is_demo,
                    ContentPiece.is_deleted == False,
                    ContentPiece.published_at >= date_from,
                    ContentPiece.theme.isnot(None),
                )
            )
            .group_by(ContentPiece.theme)
            .having(func.count(ContentPiece.id) >= 2)  # At least 2 pieces
            .order_by(desc(func.avg(ContentPerformance.engagement_rate)))
            .limit(10)
        )
        
        themes = []
        for row in result.fetchall():
            themes.append({
                'theme': row.theme,
                'content_count': row.count,
                'avg_engagement': float(row.avg_engagement or 0),
                'avg_views': float(row.avg_views or 0),
                'total_views': int(row.total_views or 0),
            })
        
        return themes


def get_content_analysis_service(session: AsyncSession) -> ContentAnalysisService:
    """Factory function."""
    return ContentAnalysisService(session)
