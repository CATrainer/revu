"""Comment enrichment service for AI-powered analysis.

Analyzes comments to extract:
- Sentiment (positive, negative, neutral)
- Priority score (1-100)
- Categories (question, collab, spam, etc.)
- Keywords
- Language
"""
from __future__ import annotations

import re
from typing import Dict, List, Optional
from datetime import datetime

from loguru import logger
from anthropic import AsyncAnthropic

from app.core.config import settings


class CommentEnrichmentService:
    """AI-powered comment analysis and enrichment."""
    
    # Spam patterns
    SPAM_PATTERNS = [
        r'check out my (channel|profile|page)',
        r'subscribe to (me|my channel)',
        r'follow me on',
        r'click (here|link)',
        r'(buy|shop) now',
        r'limited time offer',
        r'make money (fast|online)',
        r'work from home',
        r'\b(viagra|cialis|pharmacy)\b',
    ]
    
    # Question indicators
    QUESTION_INDICATORS = [
        r'\?$',
        r'^(what|when|where|why|how|who|which|can|could|would|should|do|does|is|are)',
        r'(help|advice|recommend|suggest)',
    ]
    
    # Collaboration indicators
    COLLAB_INDICATORS = [
        r'\b(collab|collaboration|partner|work together)\b',
        r'\b(sponsor|sponsorship|brand deal)\b',
        r'\b(reach out|contact|email)\b',
    ]
    
    # Positive sentiment words
    POSITIVE_WORDS = [
        'love', 'amazing', 'awesome', 'great', 'excellent', 'fantastic',
        'wonderful', 'perfect', 'best', 'beautiful', 'incredible', 'brilliant',
        'thank', 'thanks', 'appreciate', 'helpful', 'inspiring', 'motivating'
    ]
    
    # Negative sentiment words
    NEGATIVE_WORDS = [
        'hate', 'terrible', 'awful', 'worst', 'bad', 'horrible', 'disappointing',
        'disappointed', 'boring', 'waste', 'stupid', 'dumb', 'useless', 'trash'
    ]
    
    def __init__(self):
        """Initialize with Claude client for advanced analysis."""
        api_key = getattr(settings, "CLAUDE_API_KEY", None)
        self.claude_client = AsyncAnthropic(api_key=api_key) if api_key else None
        self.use_ai = api_key is not None
    
    async def enrich_comment(
        self,
        text: str,
        author_name: Optional[str] = None,
        like_count: int = 0,
        reply_count: int = 0,
        author_history: Optional[Dict] = None
    ) -> Dict:
        """
        Enrich a comment with AI analysis.
        
        Args:
            text: Comment text
            author_name: Comment author
            like_count: Number of likes
            reply_count: Number of replies
            author_history: Previous interactions from this author
            
        Returns:
            Dict with: sentiment, priority_score, categories, keywords, language
        """
        if not text or not text.strip():
            return self._empty_enrichment()
        
        # Basic analysis (always runs)
        sentiment = self._analyze_sentiment_basic(text)
        categories = self._detect_categories_basic(text)
        keywords = self._extract_keywords(text)
        language = self._detect_language(text)
        
        # Priority scoring
        priority_score = self._calculate_priority(
            text=text,
            sentiment=sentiment,
            categories=categories,
            like_count=like_count,
            reply_count=reply_count,
            author_history=author_history
        )
        
        # AI enhancement (if available and needed)
        if self.use_ai and self._needs_ai_analysis(text, categories):
            try:
                ai_result = await self._analyze_with_ai(text)
                # Merge AI results with basic analysis
                sentiment = ai_result.get('sentiment', sentiment)
                categories = list(set(categories + ai_result.get('categories', [])))
                keywords = list(set(keywords + ai_result.get('keywords', [])))
            except Exception as e:
                logger.warning(f"AI analysis failed, using basic: {e}")
        
        return {
            'sentiment': sentiment,
            'priority_score': priority_score,
            'categories': categories[:5],  # Limit to top 5
            'detected_keywords': keywords[:10],  # Limit to top 10
            'language': language
        }
    
    def _analyze_sentiment_basic(self, text: str) -> str:
        """Basic rule-based sentiment analysis."""
        text_lower = text.lower()
        
        positive_count = sum(1 for word in self.POSITIVE_WORDS if word in text_lower)
        negative_count = sum(1 for word in self.NEGATIVE_WORDS if word in text_lower)
        
        # Check for strong indicators
        if '!' in text and positive_count > 0:
            positive_count += 1
        if any(emoji in text for emoji in ['❤️', '😍', '🔥', '👍', '🙌', '💯']):
            positive_count += 2
        if any(emoji in text for emoji in ['😡', '👎', '💔', '😢', '😠']):
            negative_count += 2
        
        if positive_count > negative_count:
            return 'positive'
        elif negative_count > positive_count:
            return 'negative'
        else:
            return 'neutral'
    
    def _detect_categories_basic(self, text: str) -> List[str]:
        """Detect comment categories using patterns."""
        categories = []
        text_lower = text.lower()
        
        # Spam detection
        if any(re.search(pattern, text_lower, re.IGNORECASE) for pattern in self.SPAM_PATTERNS):
            categories.append('spam')
            return categories  # If spam, don't check other categories
        
        # Question detection
        if any(re.search(pattern, text_lower, re.IGNORECASE) for pattern in self.QUESTION_INDICATORS):
            categories.append('question')
        
        # Collaboration detection
        if any(re.search(pattern, text_lower, re.IGNORECASE) for pattern in self.COLLAB_INDICATORS):
            categories.append('collab')
        
        # Feedback detection
        if any(word in text_lower for word in ['feedback', 'suggestion', 'improve', 'better']):
            categories.append('feedback')
        
        # Support request
        if any(word in text_lower for word in ['help', 'issue', 'problem', 'error', 'bug']):
            categories.append('support')
        
        # Praise
        if len([w for w in self.POSITIVE_WORDS if w in text_lower]) >= 2:
            categories.append('praise')
        
        # Criticism
        if len([w for w in self.NEGATIVE_WORDS if w in text_lower]) >= 2:
            categories.append('criticism')
        
        # General engagement if no specific category
        if not categories:
            categories.append('engagement')
        
        return categories
    
    def _extract_keywords(self, text: str) -> List[str]:
        """Extract important keywords from text."""
        # Remove URLs, mentions, hashtags
        text = re.sub(r'http\S+|www\.\S+', '', text)
        text = re.sub(r'@\w+', '', text)
        text = re.sub(r'#\w+', '', text)
        
        # Split into words
        words = re.findall(r'\b\w{4,}\b', text.lower())
        
        # Remove common stop words
        stop_words = {
            'this', 'that', 'with', 'from', 'have', 'been', 'were', 'will',
            'would', 'could', 'should', 'about', 'their', 'there', 'where',
            'what', 'when', 'which', 'your', 'really', 'very', 'just', 'like'
        }
        keywords = [w for w in words if w not in stop_words]
        
        # Count frequency
        word_freq = {}
        for word in keywords:
            word_freq[word] = word_freq.get(word, 0) + 1
        
        # Return top keywords
        sorted_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
        return [word for word, _ in sorted_words[:10]]
    
    def _detect_language(self, text: str) -> str:
        """Basic language detection."""
        # Simple heuristic - check for common words
        text_lower = text.lower()
        
        # English indicators
        english_words = ['the', 'and', 'you', 'this', 'that', 'with', 'for']
        if sum(1 for word in english_words if f' {word} ' in f' {text_lower} ') >= 2:
            return 'en'
        
        # Spanish indicators
        spanish_words = ['el', 'la', 'los', 'las', 'que', 'con', 'por']
        if sum(1 for word in spanish_words if f' {word} ' in f' {text_lower} ') >= 2:
            return 'es'
        
        # Default to English
        return 'en'
    
    def _calculate_priority(
        self,
        text: str,
        sentiment: str,
        categories: List[str],
        like_count: int,
        reply_count: int,
        author_history: Optional[Dict] = None
    ) -> int:
        """
        Calculate priority score (1-100).
        
        Higher priority for:
        - Questions
        - Collaboration requests
        - Negative sentiment (needs attention)
        - High engagement (likes/replies)
        - Repeat commenters
        """
        score = 50  # Base score
        
        # Category bonuses
        if 'question' in categories:
            score += 15
        if 'collab' in categories:
            score += 20
        if 'support' in categories:
            score += 15
        if 'spam' in categories:
            score = 10  # Low priority for spam
            return score
        
        # Sentiment adjustments
        if sentiment == 'negative':
            score += 10  # Negative needs attention
        elif sentiment == 'positive':
            score += 5
        
        # Engagement bonuses
        if like_count > 10:
            score += 10
        elif like_count > 5:
            score += 5
        
        if reply_count > 5:
            score += 10
        elif reply_count > 2:
            score += 5
        
        # Author history bonus
        if author_history:
            comment_count = author_history.get('total_comments', 0)
            if comment_count > 10:
                score += 10  # Repeat commenter
            elif comment_count > 5:
                score += 5
        
        # Text length consideration
        if len(text) > 200:
            score += 5  # Detailed comment
        
        # Cap at 100
        return min(100, max(1, score))
    
    def _needs_ai_analysis(self, text: str, categories: List[str]) -> bool:
        """Determine if comment needs AI analysis."""
        # Use AI for complex cases
        if 'spam' in categories:
            return False  # Don't waste AI on spam
        if len(text) > 100:
            return True  # Long comments benefit from AI
        if any(cat in categories for cat in ['question', 'collab', 'support']):
            return True  # Important categories
        return False
    
    async def _analyze_with_ai(self, text: str) -> Dict:
        """Use Claude for advanced analysis."""
        if not self.claude_client:
            return {}
        
        prompt = f"""Analyze this social media comment and provide:
1. Sentiment: positive, negative, or neutral
2. Categories: Choose up to 3 from: question, collab, spam, feedback, support, praise, criticism, engagement
3. Keywords: Extract 3-5 important keywords

Comment: "{text}"

Respond in JSON format:
{{
  "sentiment": "positive|negative|neutral",
  "categories": ["category1", "category2"],
  "keywords": ["keyword1", "keyword2", "keyword3"]
}}"""
        
        try:
            response = await self.claude_client.messages.create(
                model="claude-3-haiku-20240307",  # Fast, cheap model for this task
                max_tokens=200,
                messages=[{"role": "user", "content": prompt}]
            )
            
            # Parse JSON response
            import json
            result_text = response.content[0].text
            # Extract JSON from response (might have markdown formatting)
            json_match = re.search(r'\{.*\}', result_text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            return {}
        except Exception as e:
            logger.error(f"AI analysis error: {e}")
            return {}
    
    def _empty_enrichment(self) -> Dict:
        """Return empty enrichment for invalid input."""
        return {
            'sentiment': 'neutral',
            'priority_score': 50,
            'categories': ['engagement'],
            'detected_keywords': [],
            'language': 'en'
        }
    
    async def enrich_batch(self, comments: List[Dict]) -> List[Dict]:
        """
        Enrich multiple comments in batch.
        
        Args:
            comments: List of dicts with 'text', 'author_name', 'like_count', etc.
            
        Returns:
            List of enrichment results
        """
        results = []
        for comment in comments:
            enrichment = await self.enrich_comment(
                text=comment.get('text', ''),
                author_name=comment.get('author_name'),
                like_count=comment.get('like_count', 0),
                reply_count=comment.get('reply_count', 0),
                author_history=comment.get('author_history')
            )
            results.append(enrichment)
        return results


# Singleton instance
_enrichment_service: Optional[CommentEnrichmentService] = None


def get_comment_enrichment_service() -> CommentEnrichmentService:
    """Get or create the comment enrichment service singleton."""
    global _enrichment_service
    if _enrichment_service is None:
        _enrichment_service = CommentEnrichmentService()
    return _enrichment_service
