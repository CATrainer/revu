from typing import Any, Dict, List, Optional
import os
import random
import string

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.database import get_async_session
from app.core.security import get_current_active_user
from app.models.user import User
from app.utils import debug_log

router = APIRouter()


def _rand_text(n: int = 30) -> str:
    letters = string.ascii_letters + "     "
    return "".join(random.choice(letters) for _ in range(n)).strip()


@router.post("/generate-comments")
async def generate_comments(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    payload: Dict[str, Any] | None = None,
):
    """Generate fake comments into comments_queue for testing batch processing.

    Only works when TESTING_MODE=true.

    Body example:
    {
      "count": 10,
      "classifications": ["praise", "question", "complaint"]
    }
    """
    if os.getenv("TESTING_MODE", "false").lower() != "true":
        raise HTTPException(status_code=403, detail="Testing mode required")

    count = int((payload or {}).get("count") or 10)
    kinds: List[str] = list((payload or {}).get("classifications") or [
        "praise", "question", "complaint", "general", "spam"
    ])
    if count <= 0:
        return {"ids": []}

    # Build rows
    ids: List[str] = []
    for i in range(count):
        cls = random.choice(kinds) if kinds else None
        # Fake YouTube ids
        comment_id = "test_" + ''.join(random.choices(string.ascii_lowercase + string.digits, k=16))
        channel_id = "chan_" + ''.join(random.choices(string.ascii_lowercase + string.digits, k=10))
        video_id = "vid_" + ''.join(random.choices(string.ascii_lowercase + string.digits, k=10))
        content = _rand_text(random.randint(20, 120))

        res = await db.execute(
            text(
                """
                INSERT INTO comments_queue (channel_id, video_id, comment_id, content, classification, status, priority, created_at)
                VALUES (:channel_id, :video_id, :comment_id, :content, :classification, 'pending', 0, now())
                RETURNING id
                """
            ),
            {
                "channel_id": channel_id,
                "video_id": video_id,
                "comment_id": comment_id,
                "content": content,
                "classification": cls,
            },
        )
        row = res.first()
        if row:
            ids.append(str(row[0]))

    await db.commit()
    return {"ids": ids, "count": len(ids)}


@router.post("/reset")
async def reset_test_state(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Reset backend state for clean test runs.

    TESTING_MODE only. Clears:
    - Pending items from comments_queue
    - last_batch_processed_at timestamps (set to NULL)
    - All entries from response_cache
    Returns counts of affected rows.
    """
    if os.getenv("TESTING_MODE", "false").lower() != "true":
        raise HTTPException(status_code=403, detail="Testing mode required")

    # Count current pending items
    res = await db.execute(text("SELECT COUNT(1) FROM comments_queue WHERE status = 'pending'"))
    pending_count = int(res.scalar() or 0)

    # Delete pending from queue
    await db.execute(text("DELETE FROM comments_queue WHERE status = 'pending'"))

    # Reset batch timestamps (count rows first for reporting)
    res2 = await db.execute(
        text("SELECT COUNT(1) FROM comments_queue WHERE last_batch_processed_at IS NOT NULL")
    )
    ts_count = int(res2.scalar() or 0)
    await db.execute(
        text("UPDATE comments_queue SET last_batch_processed_at = NULL WHERE last_batch_processed_at IS NOT NULL")
    )

    # Count cache entries and clear
    res3 = await db.execute(text("SELECT COUNT(1) FROM response_cache"))
    cache_count = int(res3.scalar() or 0)
    await db.execute(text("DELETE FROM response_cache"))

    # Commit all changes
    await db.commit()

    if os.getenv("TESTING_MODE", "false").lower() == "true":
        try:
            debug_log.add(
                "test.reset",
                {
                    "pending_deleted": pending_count,
                    "timestamps_reset": ts_count,
                    "cache_cleared": cache_count,
                },
            )
        except Exception:
            pass

    return {
        "pending_deleted": pending_count,
        "timestamps_reset": ts_count,
        "cache_cleared": cache_count,
        "status": "ok",
    }
