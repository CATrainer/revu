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

from loguru import logger


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


async def _load_channel_templates(classification: str, channel_id: Optional[UUID]) -> Sequence[str]:
    """Placeholder for loading channel-specific templates from DB.

    Return an empty list if none exist. Keep async signature for future DB IO.
    """
    # TODO: Implement DB-backed templates, e.g., SELECT templates FROM response_templates WHERE ...
    return []


async def get_template_response(
    classification: str,
    channel_id: Optional[UUID | str] = None,
    *,
    rng: Optional[random.Random] = None,
) -> Optional[str]:
    """Return a canned response for a classification, or None if not applicable.

    For 'simple_positive', randomly selects from default and channel-specific templates.
    For other classifications, returns None to signal AI generation is needed.
    """
    key = (classification or "").strip().lower()
    if key != "simple_positive":
        return None

    # Normalize channel_id to UUID if string provided; ignore parse errors
    ch_id: Optional[UUID]
    try:
        if isinstance(channel_id, str):
            ch_id = UUID(channel_id)
        else:
            ch_id = channel_id
    except Exception:
        logger.debug("template_responses: invalid channel_id provided; ignoring")
        ch_id = None

    defaults = TEMPLATES.get("simple_positive", [])
    custom = await _load_channel_templates("simple_positive", ch_id)
    pool: List[str] = [*defaults, *list(custom or [])]
    pool = [p for p in pool if isinstance(p, str) and p.strip()]
    if not pool:
        return None

    rng = rng or random
    return rng.choice(pool)
