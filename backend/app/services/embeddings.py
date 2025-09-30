"""Embeddings Service - Generate and manage vector embeddings for RAG"""
from __future__ import annotations

import json
from typing import List, Dict, Any, Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from loguru import logger

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

import os
from app.core.config import settings


def get_openai_client():
    """Get OpenAI client for embeddings."""
    api_key = os.getenv("OPENAI_API_KEY", getattr(settings, "OPENAI_API_KEY", None))
    if not OpenAI or not api_key:
        return None
    return OpenAI(api_key=api_key)


async def generate_embedding(text: str) -> Optional[List[float]]:
    """
    Generate embedding vector for text using OpenAI.
    
    Args:
        text: Text to embed (max 8191 tokens)
    
    Returns:
        1536-dimensional embedding vector or None if failed
    """
    try:
        client = get_openai_client()
        if not client:
            logger.warning("OpenAI client not available for embeddings")
            return None
        
        # Truncate text if too long (rough estimate: 1 token ~= 4 chars)
        max_chars = 8191 * 4
        if len(text) > max_chars:
            text = text[:max_chars]
        
        response = client.embeddings.create(
            model="text-embedding-3-small",  # Fast & cheap: $0.02/1M tokens
            input=text
        )
        
        embedding = response.data[0].embedding
        logger.info(f"Generated embedding with {len(embedding)} dimensions")
        
        return embedding
        
    except Exception as e:
        logger.error(f"Failed to generate embedding: {e}")
        return None


# ==================== CONTENT EMBEDDINGS ====================

async def embed_content(
    content_id: UUID,
    user_id: UUID,
    db: AsyncSession
) -> bool:
    """
    Generate and store embedding for content.
    
    Args:
        content_id: ID from user_content_performance table
        user_id: Owner user ID
        db: Database session
    
    Returns:
        True if successful
    """
    try:
        # Get content
        result = await db.execute(
            text("""
                SELECT caption, metrics, post_type
                FROM user_content_performance
                WHERE id = :cid AND user_id = :uid
            """),
            {"cid": str(content_id), "uid": str(user_id)}
        )
        
        content = result.first()
        if not content:
            logger.warning(f"Content {content_id} not found")
            return False
        
        # Build text for embedding
        text_parts = [content.caption or ""]
        
        # Add description from metadata if available
        if content.metrics:
            desc = content.metrics.get("description_preview", "")
            if desc:
                text_parts.append(desc)
            
            # Add tags for better semantic matching
            tags = content.metrics.get("tags", [])
            if tags:
                text_parts.append(" ".join(tags))
        
        content_text = " ".join(text_parts).strip()
        
        if not content_text:
            logger.warning(f"No text to embed for content {content_id}")
            return False
        
        # Generate embedding
        embedding = await generate_embedding(content_text)
        if not embedding:
            return False
        
        # Store embedding
        await db.execute(
            text("""
                INSERT INTO content_embeddings 
                (user_id, content_id, embedding, content_type, content_text)
                VALUES (:uid, :cid, :emb, :type, :text)
                ON CONFLICT (content_id) 
                DO UPDATE SET
                    embedding = EXCLUDED.embedding,
                    content_text = EXCLUDED.content_text
            """),
            {
                "uid": str(user_id),
                "cid": str(content_id),
                "emb": embedding,
                "type": content.post_type or "video",
                "text": content_text
            }
        )
        
        await db.commit()
        logger.info(f"Embedded content {content_id}")
        
        return True
        
    except Exception as e:
        logger.error(f"Failed to embed content {content_id}: {e}")
        await db.rollback()
        return False


async def embed_all_user_content(user_id: UUID, db: AsyncSession) -> Dict[str, int]:
    """
    Generate embeddings for all user's content.
    
    Args:
        user_id: User ID
        db: Database session
    
    Returns:
        Statistics dictionary
    """
    try:
        # Get all content without embeddings
        result = await db.execute(
            text("""
                SELECT c.id
                FROM user_content_performance c
                LEFT JOIN content_embeddings e ON c.id = e.content_id
                WHERE c.user_id = :uid
                AND e.id IS NULL
                ORDER BY c.posted_at DESC
            """),
            {"uid": str(user_id)}
        )
        
        content_ids = [r.id for r in result.fetchall()]
        
        if not content_ids:
            return {"success": 0, "failed": 0, "skipped": 0}
        
        success = 0
        failed = 0
        
        for content_id in content_ids:
            if await embed_content(content_id, user_id, db):
                success += 1
            else:
                failed += 1
        
        logger.info(f"Embedded {success}/{len(content_ids)} content items for user {user_id}")
        
        return {
            "success": success,
            "failed": failed,
            "total": len(content_ids)
        }
        
    except Exception as e:
        logger.error(f"Failed to embed user content: {e}")
        return {"success": 0, "failed": 0, "error": str(e)}


# ==================== SEMANTIC SEARCH ====================

async def find_similar_content(
    user_id: UUID,
    query: str,
    db: AsyncSession,
    limit: int = 5,
    min_engagement: float = 3.0
) -> List[Dict[str, Any]]:
    """
    Find semantically similar high-performing content using vector search.
    
    Args:
        user_id: User ID
        query: Search query or description
        db: Database session
        limit: Max results
        min_engagement: Minimum engagement rate to consider
    
    Returns:
        List of similar content items with metadata
    """
    try:
        # Generate query embedding
        query_embedding = await generate_embedding(query)
        if not query_embedding:
            logger.warning("Could not generate query embedding")
            return []
        
        # Vector similarity search with pgvector
        # Using <=> operator for cosine distance (lower = more similar)
        result = await db.execute(
            text("""
                SELECT 
                    c.id,
                    c.caption,
                    c.engagement_rate,
                    c.views,
                    c.likes,
                    c.comments,
                    c.post_type,
                    c.posted_at,
                    e.content_text,
                    (e.embedding <=> CAST(:query_vec AS vector)) as similarity
                FROM content_embeddings e
                JOIN user_content_performance c ON e.content_id = c.id
                WHERE e.user_id = :uid
                AND c.engagement_rate >= :min_engagement
                ORDER BY e.embedding <=> CAST(:query_vec AS vector)
                LIMIT :limit
            """),
            {
                "uid": str(user_id),
                "query_vec": str(query_embedding),  # pgvector accepts string rep
                "min_engagement": min_engagement,
                "limit": limit
            }
        )
        
        results = []
        for row in result.fetchall():
            results.append({
                "id": str(row.id),
                "caption": row.caption,
                "engagement_rate": float(row.engagement_rate),
                "views": row.views,
                "likes": row.likes,
                "comments": row.comments,
                "post_type": row.post_type,
                "posted_at": row.posted_at.isoformat() if row.posted_at else None,
                "similarity": float(row.similarity),
                "relevance_score": 1.0 - float(row.similarity)  # Convert distance to similarity
            })
        
        logger.info(f"Found {len(results)} similar content items for query: {query[:50]}")
        
        return results
        
    except Exception as e:
        logger.error(f"Semantic search failed: {e}")
        return []


async def find_best_performing_similar(
    user_id: UUID,
    reference_content_id: UUID,
    db: AsyncSession,
    limit: int = 5
) -> List[Dict[str, Any]]:
    """
    Find other high-performing content similar to a reference video.
    
    Args:
        user_id: User ID
        reference_content_id: ID of reference content
        db: Database session
        limit: Max results
    
    Returns:
        Similar high-performing content
    """
    try:
        # Get reference embedding
        ref_result = await db.execute(
            text("""
                SELECT embedding, content_text
                FROM content_embeddings
                WHERE content_id = :cid AND user_id = :uid
            """),
            {"cid": str(reference_content_id), "uid": str(user_id)}
        )
        
        ref = ref_result.first()
        if not ref:
            logger.warning(f"No embedding found for content {reference_content_id}")
            return []
        
        # Find similar content (excluding the reference itself)
        result = await db.execute(
            text("""
                SELECT 
                    c.id,
                    c.caption,
                    c.engagement_rate,
                    c.views,
                    (e.embedding <=> CAST(:ref_vec AS vector)) as similarity
                FROM content_embeddings e
                JOIN user_content_performance c ON e.content_id = c.id
                WHERE e.user_id = :uid
                AND e.content_id != :cid
                AND c.engagement_rate > 0
                ORDER BY e.embedding <=> CAST(:ref_vec AS vector)
                LIMIT :limit
            """),
            {
                "uid": str(user_id),
                "cid": str(reference_content_id),
                "ref_vec": str(ref.embedding),
                "limit": limit
            }
        )
        
        results = []
        for row in result.fetchall():
            results.append({
                "id": str(row.id),
                "caption": row.caption,
                "engagement_rate": float(row.engagement_rate),
                "views": row.views,
                "similarity": float(row.similarity)
            })
        
        return results
        
    except Exception as e:
        logger.error(f"Failed to find similar content: {e}")
        return []


# ==================== TEMPLATE EMBEDDINGS ====================

async def embed_template(template_id: UUID, db: AsyncSession) -> bool:
    """Generate and store embedding for a template."""
    try:
        # Get template
        result = await db.execute(
            text("""
                SELECT title, description, initial_prompt, category
                FROM content_templates
                WHERE id = :tid
            """),
            {"tid": str(template_id)}
        )
        
        template = result.first()
        if not template:
            return False
        
        # Combine text
        template_text = f"{template.title} {template.description} {template.category} {template.initial_prompt}"
        
        # Generate embedding
        embedding = await generate_embedding(template_text)
        if not embedding:
            return False
        
        # Store
        await db.execute(
            text("""
                INSERT INTO template_embeddings (template_id, embedding, template_text)
                VALUES (:tid, :emb, :text)
                ON CONFLICT (template_id)
                DO UPDATE SET embedding = EXCLUDED.embedding
            """),
            {
                "tid": str(template_id),
                "emb": embedding,
                "text": template_text
            }
        )
        
        await db.commit()
        return True
        
    except Exception as e:
        logger.error(f"Failed to embed template {template_id}: {e}")
        return False


async def find_best_template(query: str, db: AsyncSession, limit: int = 3) -> List[Dict[str, Any]]:
    """Find best matching templates for user's query."""
    try:
        query_embedding = await generate_embedding(query)
        if not query_embedding:
            return []
        
        result = await db.execute(
            text("""
                SELECT 
                    t.id,
                    t.title,
                    t.description,
                    t.category,
                    (e.embedding <=> CAST(:query_vec AS vector)) as similarity
                FROM template_embeddings e
                JOIN content_templates t ON e.template_id = t.id
                WHERE t.is_active = true
                ORDER BY e.embedding <=> CAST(:query_vec AS vector)
                LIMIT :limit
            """),
            {
                "query_vec": str(query_embedding),
                "limit": limit
            }
        )
        
        return [
            {
                "id": str(r.id),
                "title": r.title,
                "description": r.description,
                "category": r.category,
                "relevance": 1.0 - float(r.similarity)
            }
            for r in result.fetchall()
        ]
        
    except Exception as e:
        logger.error(f"Template matching failed: {e}")
        return []
