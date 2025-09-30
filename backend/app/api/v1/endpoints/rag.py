"""RAG API - Semantic search and retrieval-augmented generation endpoints"""
from __future__ import annotations

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.core.database import get_async_session
from app.core.security import get_current_active_user
from app.models.user import User
from app.services.embeddings import (
    embed_content,
    embed_all_user_content,
    find_similar_content,
    embed_template,
    find_best_template
)
from app.services.rag import (
    get_content_recommendations,
    find_content_patterns,
    suggest_template_for_query
)

router = APIRouter()


class EmbedContentRequest(BaseModel):
    content_id: UUID


class SearchRequest(BaseModel):
    query: str
    limit: int = 5
    min_engagement: float = 2.0


# ==================== EMBEDDING MANAGEMENT ====================

@router.post("/embeddings/content/{content_id}")
async def create_content_embedding(
    *,
    content_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Generate embedding for a specific content item."""
    
    success = await embed_content(content_id, current_user.id, db)
    
    if not success:
        raise HTTPException(status_code=400, detail="Failed to generate embedding")
    
    return {
        "content_id": str(content_id),
        "message": "Embedding generated successfully"
    }


@router.post("/embeddings/sync")
async def sync_all_embeddings(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Generate embeddings for all user's content that doesn't have them yet."""
    
    result = await embed_all_user_content(current_user.id, db)
    
    return {
        "success": result.get("success", 0),
        "failed": result.get("failed", 0),
        "total": result.get("total", 0),
        "message": f"Embedded {result.get('success', 0)} content items"
    }


# ==================== SEMANTIC SEARCH ====================

@router.post("/search/similar")
async def search_similar_content(
    *,
    request: SearchRequest,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """
    Semantic search for similar content using vector embeddings.
    
    Find content semantically similar to the query, even if exact words don't match.
    """
    
    results = await find_similar_content(
        user_id=current_user.id,
        query=request.query,
        db=db,
        limit=request.limit,
        min_engagement=request.min_engagement
    )
    
    return {
        "query": request.query,
        "results": results,
        "count": len(results)
    }


@router.get("/search/patterns/{content_id}")
async def analyze_content_patterns(
    *,
    content_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """
    Analyze patterns in content similar to a reference video.
    
    Find what makes similar content successful.
    """
    
    patterns = await find_content_patterns(
        user_id=current_user.id,
        reference_id=content_id,
        db=db
    )
    
    if not patterns.get("has_patterns"):
        raise HTTPException(
            status_code=404,
            detail=patterns.get("message", "Not enough data for pattern analysis")
        )
    
    return patterns


# ==================== CONTENT RECOMMENDATIONS ====================

@router.post("/recommendations/topic")
async def get_topic_recommendations(
    *,
    topic: str = Body(..., embed=True),
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get AI-powered recommendations for a content topic.
    
    Uses RAG to find similar successful content and provide data-driven advice.
    """
    
    recommendations = await get_content_recommendations(
        user_id=current_user.id,
        topic=topic,
        db=db
    )
    
    return recommendations


# ==================== TEMPLATE MATCHING ====================

@router.post("/templates/suggest")
async def suggest_template(
    *,
    query: str = Body(..., embed=True),
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """
    Suggest best matching template for user's query using semantic search.
    
    Automatically finds the most relevant conversation template.
    """
    
    suggestion = await suggest_template_for_query(query, db)
    
    if not suggestion.get("has_suggestion"):
        return {
            "has_suggestion": False,
            "message": "No highly relevant template found. You can start with a general conversation."
        }
    
    return suggestion


@router.post("/templates/{template_id}/embed")
async def embed_template_endpoint(
    *,
    template_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Generate embedding for a template (admin/system use)."""
    
    success = await embed_template(template_id, db)
    
    if not success:
        raise HTTPException(status_code=400, detail="Failed to embed template")
    
    return {
        "template_id": str(template_id),
        "message": "Template embedded successfully"
    }


@router.post("/templates/sync-all")
async def sync_all_templates(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Embed all templates that don't have embeddings yet."""
    
    from sqlalchemy import text
    
    # Get all templates without embeddings
    result = await db.execute(
        text("""
            SELECT t.id
            FROM content_templates t
            LEFT JOIN template_embeddings e ON t.id = e.template_id
            WHERE e.id IS NULL
            AND t.is_active = true
        """)
    )
    
    template_ids = [r.id for r in result.fetchall()]
    
    success_count = 0
    for template_id in template_ids:
        if await embed_template(template_id, db):
            success_count += 1
    
    return {
        "total": len(template_ids),
        "success": success_count,
        "message": f"Embedded {success_count}/{len(template_ids)} templates"
    }


# ==================== STATS & INFO ====================

@router.get("/stats")
async def get_rag_stats(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Get RAG system statistics for the user."""
    
    from sqlalchemy import text
    
    # Count embeddings
    content_count = await db.execute(
        text("SELECT COUNT(*) FROM content_embeddings WHERE user_id = :uid"),
        {"uid": str(current_user.id)}
    )
    
    # Get total content
    total_content = await db.execute(
        text("SELECT COUNT(*) FROM user_content_performance WHERE user_id = :uid"),
        {"uid": str(current_user.id)}
    )
    
    content_embedded = content_count.scalar_one()
    content_total = total_content.scalar_one()
    
    return {
        "content_embedded": content_embedded,
        "content_total": content_total,
        "embedding_coverage": round(content_embedded / content_total * 100, 1) if content_total > 0 else 0,
        "rag_enabled": content_embedded > 0,
        "recommendation": "Run /rag/embeddings/sync to enable semantic search" if content_embedded == 0 else None
    }
