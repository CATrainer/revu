"""RAG (Retrieval-Augmented Generation) Service - Enhanced AI with vector search"""
from __future__ import annotations

from typing import List, Dict, Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.services.embeddings import (
    find_similar_content,
    find_best_performing_similar,
    find_best_template
)


async def get_rag_context_for_chat(
    user_id: UUID,
    query: str,
    db: AsyncSession,
    max_examples: int = 3
) -> str:
    """
    Get RAG-enhanced context for AI chat using vector search.
    
    This finds semantically relevant content from the user's history
    to provide data-driven, personalized responses.
    
    Args:
        user_id: User ID
        query: User's current message/question
        db: Database session
        max_examples: Maximum number of examples to include
    
    Returns:
        Formatted context string for AI prompt
    """
    try:
        # Find semantically similar high-performing content
        similar_content = await find_similar_content(
            user_id=user_id,
            query=query,
            db=db,
            limit=max_examples,
            min_engagement=2.0  # Include decent performers
        )
        
        if not similar_content:
            return ""
        
        # Format context
        context = "\n\n🎯 Relevant Content from User's History (RAG):\n"
        
        for idx, item in enumerate(similar_content, 1):
            context += f"\n{idx}. \"{item['caption'][:60]}...\"\n"
            context += f"   - Engagement: {item['engagement_rate']:.1f}%\n"
            context += f"   - Views: {item['views']:,}\n"
            context += f"   - Relevance: {item['relevance_score']:.0%}\n"
        
        context += "\nUse these specific examples to provide personalized, data-driven advice."
        
        logger.info(f"Generated RAG context with {len(similar_content)} relevant examples")
        
        return context
        
    except Exception as e:
        logger.error(f"RAG context generation failed: {e}")
        return ""


async def get_content_recommendations(
    user_id: UUID,
    topic: str,
    db: AsyncSession
) -> Dict[str, Any]:
    """
    Get AI-powered content recommendations based on similar successful content.
    
    Args:
        user_id: User ID
        topic: Content topic/idea
        db: Database session
    
    Returns:
        Recommendations with examples
    """
    try:
        # Find similar successful content
        similar = await find_similar_content(
            user_id=user_id,
            query=topic,
            db=db,
            limit=5,
            min_engagement=3.0  # Only strong performers
        )
        
        if not similar:
            return {
                "has_data": False,
                "recommendations": [
                    "Create content consistently to build performance data",
                    "Focus on engaging titles and thumbnails",
                    "Analyze what resonates with your audience"
                ]
            }
        
        # Analyze patterns
        avg_engagement = sum(s['engagement_rate'] for s in similar) / len(similar)
        total_views = sum(s['views'] for s in similar)
        
        recommendations = []
        
        # Top performer insights
        best = similar[0]
        recommendations.append(
            f"Your best similar content '{best['caption'][:50]}...' got {best['engagement_rate']:.1f}% engagement. "
            f"Study what made it successful and replicate those elements."
        )
        
        # Engagement benchmark
        if avg_engagement > 5.0:
            recommendations.append(
                f"Similar content averages {avg_engagement:.1f}% engagement - well above typical benchmarks. "
                f"This topic resonates strongly with your audience."
            )
        elif avg_engagement > 3.0:
            recommendations.append(
                f"Similar content gets {avg_engagement:.1f}% engagement - solid performance. "
                f"Focus on stronger hooks and CTAs to push higher."
            )
        else:
            recommendations.append(
                f"Similar content averages {avg_engagement:.1f}% engagement. "
                f"Try different angles or formats to improve resonance."
            )
        
        # Volume insights
        if total_views > 50000:
            recommendations.append(
                f"This topic has generated {total_views:,} total views across {len(similar)} videos. "
                f"It's proven content - create more!"
            )
        
        return {
            "has_data": True,
            "topic": topic,
            "similar_count": len(similar),
            "avg_engagement": round(avg_engagement, 2),
            "total_views": total_views,
            "recommendations": recommendations,
            "examples": [
                {
                    "title": s['caption'],
                    "engagement": s['engagement_rate'],
                    "views": s['views']
                }
                for s in similar[:3]
            ]
        }
        
    except Exception as e:
        logger.error(f"Content recommendations failed: {e}")
        return {"has_data": False, "error": str(e)}


async def find_content_patterns(
    user_id: UUID,
    reference_id: UUID,
    db: AsyncSession
) -> Dict[str, Any]:
    """
    Analyze patterns in content similar to a reference video.
    
    Args:
        user_id: User ID
        reference_id: Reference content ID
        db: Database session
    
    Returns:
        Pattern analysis
    """
    try:
        # Find similar content
        similar = await find_best_performing_similar(
            user_id=user_id,
            reference_content_id=reference_id,
            db=db,
            limit=10
        )
        
        if len(similar) < 3:
            return {
                "has_patterns": False,
                "message": "Not enough similar content to identify patterns"
            }
        
        # Calculate statistics
        engagement_rates = [s['engagement_rate'] for s in similar]
        avg_engagement = sum(engagement_rates) / len(engagement_rates)
        max_engagement = max(engagement_rates)
        
        # Get reference stats
        from sqlalchemy import text
        ref_result = await db.execute(
            text("""
                SELECT caption, engagement_rate, views
                FROM user_content_performance
                WHERE id = :cid
            """),
            {"cid": str(reference_id)}
        )
        ref = ref_result.first()
        
        patterns = {
            "has_patterns": True,
            "reference": {
                "title": ref.caption,
                "engagement": float(ref.engagement_rate),
                "views": ref.views
            },
            "similar_count": len(similar),
            "avg_similar_engagement": round(avg_engagement, 2),
            "best_similar_engagement": round(max_engagement, 2),
            "insights": []
        }
        
        # Generate insights
        if ref.engagement_rate > avg_engagement:
            patterns["insights"].append(
                f"This video outperforms similar content by {((ref.engagement_rate / avg_engagement) - 1) * 100:.0f}%"
            )
        
        if max_engagement > ref.engagement_rate:
            best = max(similar, key=lambda x: x['engagement_rate'])
            patterns["insights"].append(
                f"Similar video '{best['caption'][:40]}...' achieved {best['engagement_rate']:.1f}% engagement"
            )
        
        patterns["similar_videos"] = similar[:5]
        
        return patterns
        
    except Exception as e:
        logger.error(f"Pattern analysis failed: {e}")
        return {"has_patterns": False, "error": str(e)}


async def suggest_template_for_query(
    query: str,
    db: AsyncSession
) -> Dict[str, Any]:
    """
    Suggest best template based on user's query using semantic matching.
    
    Args:
        query: User's question or goal
        db: Database session
    
    Returns:
        Template suggestion with relevance
    """
    try:
        templates = await find_best_template(query, db, limit=3)
        
        if not templates:
            return {"has_suggestion": False}
        
        best = templates[0]
        
        # Only suggest if relevance is high enough
        if best['relevance'] < 0.7:
            return {"has_suggestion": False}
        
        return {
            "has_suggestion": True,
            "template_id": best['id'],
            "template_title": best['title'],
            "template_description": best['description'],
            "relevance": best['relevance'],
            "message": f"I found a template that might help: '{best['title']}' (relevance: {best['relevance']:.0%})"
        }
        
    except Exception as e:
        logger.error(f"Template suggestion failed: {e}")
        return {"has_suggestion": False}


async def get_cross_user_insights(
    user_id: UUID,
    niche: str,
    db: AsyncSession,
    min_subscribers: int = 1000
) -> Dict[str, Any]:
    """
    Find insights from other successful creators in the same niche.
    
    NOTE: This requires user consent and privacy controls.
    Future feature - placeholder for now.
    
    Args:
        user_id: User ID
        niche: Content niche/category
        db: Database session
        min_subscribers: Minimum subscriber count
    
    Returns:
        Cross-user insights (privacy-respecting)
    """
    # TODO: Implement with proper privacy controls
    # For now, return empty to avoid privacy issues
    return {
        "available": False,
        "message": "Cross-user insights coming soon (requires privacy controls)"
    }
