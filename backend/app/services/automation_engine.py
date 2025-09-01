"""Automation engine to evaluate rules and execute actions on comments.

- get_active_rules(channel_id): fetch enabled rules for a channel
- evaluate_rule(comment, rule): check if a comment matches rule conditions
- execute_action(comment_id, action): perform the specified action

Rule condition examples:
- classification == "question"
- keywords: ["shipping", "refund"]
- author_status: one of ["owner", "subscriber", "new", "any"]

Actions:
- generate_response: enqueue/trigger AI generation
- delete_comment: remove the comment
- flag_for_review: mark in queue for human review
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple
from uuid import UUID

from loguru import logger
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


@dataclass
class Rule:
    id: str
    channel_id: str
    enabled: bool
    conditions: Dict[str, Any]
    action: Dict[str, Any]


@dataclass
class Comment:
    id: str  # internal UUID of comments_queue
    comment_id: str  # external YouTube ID
    channel_id: str
    video_id: str
    content: str
    classification: Optional[str] = None
    author_channel_id: Optional[str] = None
    author_name: Optional[str] = None


class AutomationEngine:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_active_rules(self, channel_id: UUID) -> List[Rule]:
        """Fetch enabled rules for a channel from automation_rules table."""
        res = await self.session.execute(
            text(
                """
                SELECT id, channel_id, conditions, action
                FROM automation_rules
                WHERE channel_id = :cid AND enabled = true
                ORDER BY priority DESC, created_at ASC
                """
            ),
            {"cid": str(channel_id)},
        )
        rules: List[Rule] = []
        for r in res.fetchall():
            rules.append(
                Rule(
                    id=str(r[0]),
                    channel_id=str(r[1]),
                    enabled=True,
                    conditions=(r[2] or {}) if isinstance(r[2], dict) else {},
                    action=(r[3] or {}) if isinstance(r[3], dict) else {},
                )
            )
        return rules

    def _match_keywords(self, text_val: str, keywords: List[str]) -> bool:
        t = (text_val or "").lower()
        for kw in keywords or []:
            if kw and kw.lower() in t:
                return True
        return False

    def _author_status_matches(self, comment: Comment, status: str) -> bool:
        # Minimal heuristic: owner vs other
        if status == "any" or not status:
            return True
        if status == "owner":
            # In our schema, comments_queue doesn't store is_channel_owner_comment explicitly; fallback via author_channel_id==channel_id
            return str(comment.author_channel_id or "") == str(comment.channel_id)
        # Placeholder for subscriber/new; requires additional metadata
        return False

    def evaluate_rule(self, comment: Comment, rule: Rule) -> bool:
        """Check if the comment matches a rule's conditions."""
        cond = rule.conditions or {}
        # classification
        cls = cond.get("classification")
        if cls and str(cls).lower() != str(comment.classification or "").lower():
            return False
        # keywords
        kws = cond.get("keywords") or []
        if kws and not self._match_keywords(comment.content, kws):
            return False
        # author status
        astatus = cond.get("author_status")
        if astatus and not self._author_status_matches(comment, str(astatus).lower()):
            return False
        return True

    async def execute_action(self, *, comment: Comment, action: Dict[str, Any]) -> bool:
        """Execute an action for a matching rule.

        Supported actions: generate_response, delete_comment, flag_for_review
        """
        atype = (action or {}).get("type")
        if atype == "generate_response":
            # Mark queue row for processing by AI endpoint
            await self.session.execute(
                text(
                    """
                    UPDATE comments_queue
                    SET status = 'processing', updated_at = now()
                    WHERE id = :qid
                    """
                ),
                {"qid": comment.id},
            )
            return True
        if atype == "delete_comment":
            # Soft-delete: mark as ignored and set note
            await self.session.execute(
                text(
                    """
                    UPDATE comments_queue
                    SET status = 'ignored', updated_at = now()
                    WHERE id = :qid
                    """
                ),
                {"qid": comment.id},
            )
            return True
        if atype == "flag_for_review":
            await self.session.execute(
                text(
                    """
                    UPDATE comments_queue
                    SET status = 'needs_review', updated_at = now()
                    WHERE id = :qid
                    """
                ),
                {"qid": comment.id},
            )
            return True
        logger.warning("Unknown action type: {}", atype)
        return False

    async def run(self, *, channel_id: UUID, comments: List[Comment]) -> int:
        """Evaluate all active rules against provided comments and execute actions.

        Returns the count of actions executed.
        """
        rules = await self.get_active_rules(channel_id)
        if not rules:
            return 0
        executed = 0
        for c in comments:
            for r in rules:
                try:
                    if self.evaluate_rule(c, r):
                        ok = await self.execute_action(comment=c, action=r.action)
                        if ok:
                            executed += 1
                except Exception:
                    logger.exception("Rule evaluation failed for comment {} rule {}", c.id, r.id)
        if executed:
            await self.session.commit()
        return executed
