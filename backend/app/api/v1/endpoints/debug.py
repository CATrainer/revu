from __future__ import annotations

import os
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException

from app.core.security import get_current_active_user
from app.models.user import User
from app.utils import debug_log

router = APIRouter()


@router.get("/logs")
async def get_debug_logs(
    *,
    current_user: User = Depends(get_current_active_user),
    limit: int = 200,
) -> Dict[str, List[Dict[str, Any]]]:
    """Return recent in-memory debug logs. TESTING_MODE only.

    Query params:
    - limit: number of most-recent entries to return (default 200)
    """
    if os.getenv("TESTING_MODE", "false").lower() != "true":
        raise HTTPException(status_code=403, detail="Testing mode required")

    try:
        lim = max(1, min(int(limit), 1000))
    except Exception:
        lim = 200

    logs = debug_log.get_recent(lim)
    return {"logs": logs}
