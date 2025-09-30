"""Celery tasks for automatic embedding generation"""
from __future__ import annotations

from uuid import UUID
from sqlalchemy import text
from loguru import logger

from app.core.celery_app import celery
from app.core.database import get_db_context
from app.services.embeddings import (
    embed_content,
    embed_all_user_content,
    embed_template
)


@celery.task(name="generate_content_embeddings")
def generate_content_embeddings():
    """
    Daily task to generate embeddings for all content without them.
    
    Runs after content sync to ensure new content gets embeddings.
    """
    logger.info("Starting automatic embedding generation")
    
    with get_db_context() as db:
        # Get all content without embeddings
        result = db.execute(
            text("""
                SELECT c.id, c.user_id
                FROM user_content_performance c
                LEFT JOIN content_embeddings e ON c.id = e.content_id
                WHERE e.id IS NULL
                ORDER BY c.posted_at DESC
                LIMIT 1000
            """)
        )
        
        items = result.fetchall()
        total = len(items)
        success = 0
        failed = 0
        
        logger.info(f"Found {total} content items to embed")
        
        for item in items:
            try:
                content_id = UUID(str(item.id))
                user_id = UUID(str(item.user_id))
                
                if embed_content(content_id, user_id, db):
                    success += 1
                else:
                    failed += 1
                    
            except Exception as e:
                failed += 1
                logger.error(f"Failed to embed content {item.id}: {e}")
        
        logger.info(
            f"Embedding generation complete. "
            f"Success: {success}, Failed: {failed}, Total: {total}"
        )
        
        return {
            "total": total,
            "success": success,
            "failed": failed
        }


@celery.task(name="generate_user_embeddings")
def generate_user_embeddings(user_id: str):
    """
    Generate embeddings for a specific user's content.
    
    Args:
        user_id: UUID string of the user
    """
    logger.info(f"Generating embeddings for user {user_id}")
    
    with get_db_context() as db:
        try:
            user_uuid = UUID(user_id)
            result = embed_all_user_content(user_uuid, db)
            
            logger.info(
                f"Embedded {result.get('success', 0)}/{result.get('total', 0)} "
                f"items for user {user_id}"
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to embed user content: {e}")
            return {
                "success": 0,
                "failed": 0,
                "error": str(e)
            }


@celery.task(name="embed_all_templates")
def embed_all_templates():
    """
    Generate embeddings for all conversation templates.
    
    Runs once when templates are created/updated.
    """
    logger.info("Embedding all templates")
    
    with get_db_context() as db:
        # Get templates without embeddings
        result = db.execute(
            text("""
                SELECT t.id
                FROM content_templates t
                LEFT JOIN template_embeddings e ON t.id = e.template_id
                WHERE e.id IS NULL
                AND t.is_active = true
            """)
        )
        
        template_ids = [r.id for r in result.fetchall()]
        success = 0
        
        for template_id in template_ids:
            try:
                if embed_template(UUID(str(template_id)), db):
                    success += 1
            except Exception as e:
                logger.error(f"Failed to embed template {template_id}: {e}")
        
        logger.info(f"Embedded {success}/{len(template_ids)} templates")
        
        return {
            "total": len(template_ids),
            "success": success
        }


@celery.task(name="cleanup_old_embeddings")
def cleanup_old_embeddings(days_old: int = 90):
    """
    Clean up embeddings for deleted content.
    
    Args:
        days_old: Delete embeddings older than this many days with no content
    """
    logger.info(f"Cleaning up embeddings older than {days_old} days")
    
    with get_db_context() as db:
        # Delete content embeddings with no associated content
        result = db.execute(
            text("""
                DELETE FROM content_embeddings
                WHERE content_id NOT IN (
                    SELECT id FROM user_content_performance
                )
            """)
        )
        
        deleted = result.rowcount
        db.commit()
        
        logger.info(f"Cleaned up {deleted} orphaned embeddings")
        
        return {"deleted": deleted}
