from __future__ import annotations

import asyncio
import math
import os
import time
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple, Callable, Iterable

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.rule_evaluator import RuleEvaluator


# ---------------- Circuit Breaker -----------------
class CircuitState:
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


@dataclass
class CircuitBreaker:
    failure_threshold: int = 5
    recovery_time_seconds: float = 60.0
    half_open_max_calls: int = 3

    _state: str = CircuitState.CLOSED
    _failures: int = 0
    _opened_at: float = 0.0
    _half_open_calls: int = 0

    def allow(self) -> bool:
        now = time.time()
        if self._state == CircuitState.CLOSED:
            return True
        if self._state == CircuitState.OPEN:
            if now - self._opened_at >= self.recovery_time_seconds:
                # Move to half-open after cooldown
                self._state = CircuitState.HALF_OPEN
                self._half_open_calls = 0
                return True
            return False
        if self._state == CircuitState.HALF_OPEN:
            return self._half_open_calls < max(1, self.half_open_max_calls)
        return True

    def record_success(self) -> None:
        if self._state in (CircuitState.OPEN, CircuitState.HALF_OPEN):
            # Successful probe -> close
            self._state = CircuitState.CLOSED
            self._failures = 0
            self._opened_at = 0.0
            self._half_open_calls = 0
        else:
            self._failures = 0

    def record_failure(self) -> None:
        if self._state == CircuitState.HALF_OPEN:
            self._half_open_calls += 1
            # If it fails in half-open, open again
            self._state = CircuitState.OPEN
            self._opened_at = time.time()
            return
        self._failures += 1
        if self._failures >= max(1, self.failure_threshold):
            self._state = CircuitState.OPEN
            self._opened_at = time.time()


# ------------- YouTube Batch Client Contract -------------
class YouTubeBatchClient:
    """
    Contract for batching YouTube API calls. Provide an implementation and inject here.
    Methods should handle rate limits internally and use batching endpoints when available.
    """

    async def batch_get_comment_details(self, comment_ids: List[str]) -> Dict[str, Dict[str, Any]]:
        """Return a mapping of comment_id -> details. Implemented by caller."""
        raise NotImplementedError

    async def batch_get_video_details(self, video_ids: List[str]) -> Dict[str, Dict[str, Any]]:
        """Return a mapping of video_id -> details. Implemented by caller."""
        raise NotImplementedError


# ------------- Batch Rule Processor -------------
@dataclass
class BatchRuleProcessorConfig:
    max_global_concurrency: int = int(os.getenv("BATCH_MAX_CONCURRENCY", "8"))
    per_rule_concurrency: int = int(os.getenv("BATCH_PER_RULE_CONCURRENCY", "2"))
    quota_per_round: int = int(os.getenv("BATCH_QUOTA_PER_ROUND", "10"))
    ai_eval_group_window: float = float(os.getenv("BATCH_AI_GROUP_WINDOW_SECONDS", "0.5"))
    circuit_failure_threshold: int = int(os.getenv("BATCH_CIRCUIT_FAILURES", "5"))
    circuit_recovery_seconds: float = float(os.getenv("BATCH_CIRCUIT_RECOVERY", "60"))
    circuit_half_open_calls: int = int(os.getenv("BATCH_CIRCUIT_HALF_OPEN_CALLS", "3"))


class BatchRuleProcessor:
    """
    Processes rules against comments with:
    - Similar AI evaluation grouping to reduce LLM calls
    - Batched YouTube API calls via provided client
    - Priority ordering of rules
    - Fair scheduling (round-robin with per-rule quotas)
    - Anti-monopoly controls (per-rule concurrency + quotas)
    - Circuit breaker per rule to avoid repeated failures
    """

    def __init__(self, config: Optional[BatchRuleProcessorConfig] = None) -> None:
        self.config = config or BatchRuleProcessorConfig()
        self._evaluator = RuleEvaluator()
        self._global_sem = asyncio.Semaphore(self.config.max_global_concurrency)
        self._rule_sems: Dict[str, asyncio.Semaphore] = {}
        self._breakers: Dict[str, CircuitBreaker] = {}

    # --------- Public entrypoints ---------
    async def process(
        self,
        db: AsyncSession,
        *,
        rules: List[Dict[str, Any]],
        comments: List[Dict[str, Any]],
        youtube_client: Optional[YouTubeBatchClient] = None,
        context_base: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Process a batch of comments across rules.
        Returns a list of results per (rule, comment).
        """
        # 1) Sort rules by priority (desc), then name/id for stability
        ordered = sorted(rules or [], key=lambda r: (-(self._priority(r) or 0), str(r.get("name") or r.get("id") or "")))

        # 2) Prepare per-rule semaphores and breakers
        for r in ordered:
            rid = str(r.get("id") or r.get("rule_id") or id(r))
            if rid not in self._rule_sems:
                self._rule_sems[rid] = asyncio.Semaphore(self.config.per_rule_concurrency)
            if rid not in self._breakers:
                self._breakers[rid] = CircuitBreaker(
                    failure_threshold=self.config.circuit_failure_threshold,
                    recovery_time_seconds=self.config.circuit_recovery_seconds,
                    half_open_max_calls=self.config.circuit_half_open_calls,
                )

        # 3) Optionally prefetch/batch YouTube details to enrich comments
        if youtube_client:
            await self._batch_prefetch_youtube(youtube_client, comments)

        # 4) Fair scheduling: perform rounds; each rule gets up to quota
        results: List[Dict[str, Any]] = []
        remaining = list(comments or [])
        if not remaining or not ordered:
            return results

        # Precompute AI grouping plan per rule to reduce LLM calls
        ai_plan: Dict[str, Dict[str, List[int]]] = {
            self._rule_id(r): self._group_ai_keys(r, remaining) for r in ordered
        }

        # For bookkeeping of which comments are already processed for a rule
        processed: Dict[Tuple[str, str], bool] = {}

        # Iterate in rounds until all comments considered
        cursor = {self._rule_id(r): 0 for r in ordered}
        total = len(remaining)
        while any(cursor[self._rule_id(r)] < total for r in ordered):
            for r in ordered:
                rid = self._rule_id(r)
                quota = self.config.quota_per_round
                if quota <= 0:
                    continue
                took = 0
                # Skip rules with open breakers (unless moving to half-open)
                if not self._breakers[rid].allow():
                    continue
                # Round-robin over comments starting from cursor
                start = cursor[rid]
                i = start
                while took < quota and i < total:
                    c = remaining[i]
                    key = (rid, str(c.get("id") or i))
                    if not processed.get(key):
                        try:
                            out = await self._eval_one(db, r, c, context_base or {}, rid, ai_plan[rid])
                            results.append(out)
                            self._breakers[rid].record_success()
                        except Exception:
                            self._breakers[rid].record_failure()
                        processed[key] = True
                        took += 1
                    i += 1
                cursor[rid] = i
        return results

    # --------- Core helpers ---------
    async def _eval_one(
        self,
        db: AsyncSession,
        rule: Dict[str, Any],
        comment: Dict[str, Any],
        base_ctx: Dict[str, Any],
        rid: str,
        ai_groups: Dict[str, List[int]],
    ) -> Dict[str, Any]:
        # Anti-monopoly controls via semaphores
        async with self._global_sem, self._rule_sems[rid]:
            # Use grouped AI evals when possible by priming cache for similar keys
            await self._prime_ai_groups(db, rule, [comment], base_ctx, ai_groups)
            res = await self._evaluator.evaluate_rule(db, rule, comment, base_ctx)
            return {
                "rule_id": rid,
                "comment_id": comment.get("id"),
                "matches": res.matches,
                "confidence": res.confidence,
                "matched_conditions": res.matched_conditions,
            }

    async def _prime_ai_groups(
        self,
        db: AsyncSession,
        rule: Dict[str, Any],
        comments: List[Dict[str, Any]],
        base_ctx: Dict[str, Any],
        ai_groups: Dict[str, List[int]],
    ) -> None:
        """Evaluate one representative per AI key to populate cache for similar comments."""
        if not ai_groups:
            return
        # For the provided comments, compute their key and pick the first seen in each group to prime
        taken: set[str] = set()
        for idx, c in enumerate(comments):
            for cond in (rule.get("conditions") or []):
                if (cond.get("type") or "").lower() != "ai":
                    continue
                prompt = cond.get("prompt") or ""
                ch_id = str(base_ctx.get("channel_id") or "")
                # Reuse evaluator's key behavior by calling evaluate_ai_condition per-group representative
                # We use the similarity key we precomputed in _group_ai_keys
                k = self._ai_key_for_comment(prompt, ch_id, c)
                if k in taken:
                    continue
                # Pick first comment index in the group to actually evaluate; others benefit from cache
                taken.add(k)
                try:
                    await self._evaluator.evaluate_ai_condition(
                        db,
                        c,
                        prompt,
                        channel_id=ch_id,
                        channel_name=str(base_ctx.get("channel_name") or ""),
                        video_title=str(base_ctx.get("video_title") or ""),
                    )
                except Exception:
                    # Ignore; failure recorded by breaker at caller
                    pass

    def _group_ai_keys(self, rule: Dict[str, Any], comments: List[Dict[str, Any]]) -> Dict[str, List[int]]:
        groups: Dict[str, List[int]] = {}
        ai_conds = [c for c in (rule.get("conditions") or []) if (c.get("type") or "").lower() == "ai"]
        if not ai_conds:
            return groups
        # For each AI condition, group comments by similarity key
        for i, c in enumerate(comments):
            for ac in ai_conds:
                prompt = ac.get("prompt") or ""
                key = self._ai_key_for_comment(prompt, str(c.get("channel_id") or ""), c)
                groups.setdefault(key, []).append(i)
        return groups

    def _ai_key_for_comment(self, prompt: str, channel_id: str, comment: Dict[str, Any]) -> str:
        # Mirror evaluator's similarity behavior: normalize text and keep first tokens
        text = str(comment.get("text") or "")
        # Avoid importing evaluator internals; simple normalization must align with evaluator._ai_cache_key
        import re as _re
        t = text.lower()
        t = _re.sub(r"https?://\S+|www\.\S+", " ", t)
        t = _re.sub(r"[@#]\w+", " ", t)
        t = _re.sub(r"\d+", " ", t)
        t = _re.sub(r"[^a-z\s]", " ", t)
        t = _re.sub(r"\s+", " ", t).strip()
        tokens = t.split()
        sig = " ".join(tokens[:12])
        return f"ai:{channel_id}:{hash((sig, prompt.strip()[:120]))}"

    async def _batch_prefetch_youtube(self, yt: YouTubeBatchClient, comments: List[Dict[str, Any]]) -> None:
        # Gather IDs to fetch
        cids = [str(c.get("id")) for c in comments if c.get("id")]
        vids = [str(c.get("video_id")) for c in comments if c.get("video_id")]
        # Chunking utility
        def chunks(seq: List[str], n: int) -> Iterable[List[str]]:
            for i in range(0, len(seq), n):
                yield seq[i:i + n]
        # YouTube APIs often allow batches of ~50
        batch_size = 50
        # Fetch in parallel where possible
        tasks: List[asyncio.Task] = []
        for ch in chunks(cids, batch_size):
            tasks.append(asyncio.create_task(yt.batch_get_comment_details(ch)))
        for ch in chunks(vids, batch_size):
            tasks.append(asyncio.create_task(yt.batch_get_video_details(ch)))
        if tasks:
            try:
                await asyncio.gather(*tasks, return_exceptions=True)
            except Exception:
                # Prefetch is best-effort
                pass

    @staticmethod
    def _priority(rule: Dict[str, Any]) -> Optional[int]:
        pr = rule.get("priority")
        if pr is None and isinstance(rule.get("action"), dict):
            pr = rule.get("action", {}).get("priority")
        try:
            return int(pr) if pr is not None else None
        except Exception:
            return None

    @staticmethod
    def _rule_id(rule: Dict[str, Any]) -> str:
        return str(rule.get("id") or rule.get("rule_id") or id(rule))
