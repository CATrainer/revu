from __future__ import annotations

from collections import deque
from datetime import datetime, timezone
import os
from typing import Any, Deque, Dict, List

from loguru import logger

# Simple in-memory debug log buffer (testing-only)
_MAX = 1000
_BUF: Deque[Dict[str, Any]] = deque(maxlen=_MAX)


def _testing_on() -> bool:
    return os.getenv("TESTING_MODE", "false").lower() == "true"


def add(event: str, payload: Dict[str, Any] | None = None) -> None:
    """Add a debug record when TESTING_MODE=true; no-op otherwise."""
    if not _testing_on():
        return
    rec = {
        "t": datetime.now(timezone.utc).isoformat(),
        "event": event,
        "data": payload or {},
    }
    try:
        _BUF.append(rec)
    except Exception:
        # best-effort
        pass
    try:
        logger.debug("[dbg] {} - {}", event, payload)
    except Exception:
        pass


def get_recent(limit: int = 200) -> List[Dict[str, Any]]:
    if limit <= 0:
        return []
    items = list(_BUF)
    return items[-limit:]
