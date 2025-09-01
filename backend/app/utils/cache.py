from __future__ import annotations

import asyncio
import time
from typing import Any, Awaitable, Callable, Dict, Hashable, Tuple


class _TTLCache:
    def __init__(self) -> None:
        self._store: Dict[Hashable, Tuple[float, Any]] = {}
        self._lock = asyncio.Lock()

    async def get(self, key: Hashable) -> Any:
        async with self._lock:
            now = time.time()
            item = self._store.get(key)
            if not item:
                return None
            exp, val = item
            if now >= exp:
                self._store.pop(key, None)
                return None
            return val

    async def set(self, key: Hashable, value: Any, ttl: float) -> None:
        async with self._lock:
            self._store[key] = (time.time() + max(0.0, ttl), value)


_cache = _TTLCache()


def async_ttl_cache(ttl_seconds: float, key_builder: Callable[..., Hashable] | None = None):
    """Decorator for caching async function results in-process with TTL.

    Note: process-local only; for multi-worker deployments, prefer Redis.
    """

    def deco(fn: Callable[..., Awaitable[Any]]):
        async def wrapper(*args, **kwargs):
            key: Hashable
            if key_builder:
                key = key_builder(*args, **kwargs)
            else:
                key = (fn.__module__, fn.__qualname__, args, frozenset(kwargs.items()))
            cached = await _cache.get(key)
            if cached is not None:
                return cached
            val = await fn(*args, **kwargs)
            await _cache.set(key, val, ttl_seconds)
            return val

        return wrapper

    return deco
