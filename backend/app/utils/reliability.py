from __future__ import annotations

import asyncio
import random
import time
from dataclasses import dataclass
from typing import Any, Awaitable, Callable, Optional


async def async_retry(
    fn: Callable[[], Awaitable[Any]],
    *,
    retries: int = 3,
    base_delay: float = 0.5,
    max_delay: float = 6.0,
    jitter: float = 0.5,
    retry_on: tuple[type[BaseException], ...] = (Exception,),
    should_retry: Optional[Callable[[BaseException], bool]] = None,
) -> Any:
    """Retry an async function with exponential backoff and jitter.

    - retries: number of retry attempts (not counting the first try)
    - should_retry: optional predicate to decide on retry per exception
    """
    attempt = 0
    delay = max(0.0, base_delay)
    while True:
        try:
            return await fn()
        except retry_on as e:  # type: ignore[misc]
            if attempt >= retries:
                raise
            if should_retry and not should_retry(e):
                raise
            # sleep with jitter
            wait = delay + random.uniform(0, max(0.0, jitter * delay))
            await asyncio.sleep(wait)
            delay = min(delay * 2.0, max_delay)
            attempt += 1


@dataclass
class CircuitState:
    failures: int = 0
    last_failure_ts: float = 0.0
    opened_until: float = 0.0


class CircuitBreaker:
    """Simple in-memory circuit breaker.

    - threshold: consecutive failures to open
    - cooldown: seconds to keep open before half-open
    - half_open_max: max attempts in half-open window before deciding
    """

    def __init__(self, *, threshold: int = 5, cooldown: float = 60.0, half_open_max: int = 1) -> None:
        self.threshold = max(1, int(threshold))
        self.cooldown = max(1.0, float(cooldown))
        self.half_open_max = max(1, int(half_open_max))
        self._state = CircuitState()
        self._half_open_attempts = 0

    def is_open(self) -> bool:
        now = time.time()
        return now < self._state.opened_until

    def record_success(self) -> None:
        self._state.failures = 0
        self._state.last_failure_ts = 0.0
        self._state.opened_until = 0.0
        self._half_open_attempts = 0

    def record_failure(self) -> None:
        now = time.time()
        self._state.failures += 1
        self._state.last_failure_ts = now
        if self._state.failures >= self.threshold:
            self._state.opened_until = now + self.cooldown
            self._half_open_attempts = 0

    def allow_request(self) -> bool:
        now = time.time()
        if self._state.opened_until == 0.0:
            return True
        if now >= self._state.opened_until:
            # half-open window
            if self._half_open_attempts < self.half_open_max:
                self._half_open_attempts += 1
                return True
            # too many half-open tries; keep it open a bit longer
            self._state.opened_until = now + self.cooldown
            self._half_open_attempts = 0
            return False
        return False
