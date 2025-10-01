"""Template responses service.

Provides canned replies for specific comment classifications. For now only
"simple_positive" uses templates; others should return None so the AI pipeline
can handle them.

Future: load channel-specific templates from the database and merge/override.
"""
from __future__ import annotations

import random
from typing import Dict, List, Optional, Sequence
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.models.template import ResponseTemplate


# Default, platform-agnostic templates per classification
TEMPLATES: Dict[str, List[str]] = {
    "simple_positive": [
        "Thanks for watching!",
        "Glad you enjoyed it!",
        "Appreciate the support!",
        "Thanks a ton!",
        "That means a lot, thank you!",
        "You're awesome — thanks for being here!",
        "Thanks! More coming soon 🙌",
    ]
}


async def _load_user_templates(
    user_id: UUID,
    classification: str,
    db: AsyncSession
) -> Sequence[str]:
    """Load user-specific templates from DB.
    
    Args:
        user_id: User ID to load templates for
        classification: Template category (e.g., 'simple_positive')
        db: Database session
    
    Returns:
        List of template texts matching the category
    """
    try:
        result = await db.execute(
            select(ResponseTemplate)
            .where(ResponseTemplate.created_by_id == user_id)
            .where(ResponseTemplate.category == classification)
        )
        templates = result.scalars().all()
        return [t.template_text for t in templates]
    except Exception as e:
        logger.error(f"Failed to load user templates: {e}")
        return []


async def get_template_response(
    classification: str,
    user_id: Optional[UUID] = None,
    db: Optional[AsyncSession] = None,
    *,
    rng: Optional[random.Random] = None,
) -> Optional[str]:
    """Return a canned response for a classification, or None if not applicable.

    For 'simple_positive', randomly selects from default and user-specific templates.
    For other classifications, returns None to signal AI generation is needed.
    
    Args:
        classification: Template category
        user_id: User ID to load custom templates for
        db: Database session (required if user_id provided)
        rng: Random number generator (for testing)
    """
    key = (classification or "").strip().lower()
    if key != "simple_positive":
        return None

    defaults = TEMPLATES.get("simple_positive", [])
    
    # Load user-specific templates if user_id and db provided
    custom: Sequence[str] = []
    if user_id and db:
        custom = await _load_user_templates(user_id, "simple_positive", db)
    
    pool: List[str] = [*defaults, *list(custom or [])]
    pool = [p for p in pool if isinstance(p, str) and p.strip()]
    if not pool:
        return None

    rng = rng or random
    return rng.choice(pool)
