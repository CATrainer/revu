"""Background tasks for the FastAPI app.

Provides a periodic polling loop that checks channels and enqueues new
YouTube comments for processing.
"""
from __future__ import annotations

import asyncio
from typing import Optional

from loguru import logger

from app.core.database import get_async_session
from app.services.polling_service import PollingService
from app.services.automation_engine import AutomationEngine, Comment as AutoComment
from sqlalchemy import text


async def _poll_once() -> int:
    """Run a single polling iteration across all active channels.

    Returns total number of comments enqueued across all channels.
    """
    total_enqueued = 0
    # Acquire a new DB session for this iteration
    async for session in get_async_session():
        try:
            service = PollingService(session)
            channels = await service.get_active_channels()
            if not channels:
                logger.debug("Polling: no active channels found")
                break

            for ch in channels:
                cid = ch.get("channel_id")
                try:
                    # Respect per-channel interval rules
                    should = await service.should_poll(channel_id=cid)
                    if not should:
                        continue

                    count = await service.poll_channel_comments(channel_id=cid)
                    total_enqueued += int(count or 0)
                except Exception:
                    logger.exception("Polling: error while processing channel {cid}", cid=str(cid))
                    # continue to next channel
            # Commit once per iteration
            await session.commit()
        except Exception:
            logger.exception("Polling: iteration failed")
        finally:
            # get_async_session context manager will handle close/rollback as needed
            break

    return total_enqueued


async def run_polling_cycle(interval_seconds: int = 60, stop_event: Optional[asyncio.Event] = None) -> None:
    """Continuously run the polling cycle every `interval_seconds` seconds.

    This function is designed to be scheduled on app startup via asyncio.create_task().
    """
    logger.info("Starting background polling loop (interval={}s)", interval_seconds)
    try:
        while True:
            if stop_event and stop_event.is_set():
                logger.info("Stop signal received; exiting polling loop")
                break
            try:
                enq = await _poll_once()
                if enq:
                    logger.info("Polling cycle complete; enqueued={} new comments", enq)
                else:
                    logger.debug("Polling cycle complete; no new comments")
            except Exception:
                logger.exception("Unhandled error in polling cycle")

            # Sleep until next cycle, but wake early if stop_event is set
            try:
                if stop_event:
                    await asyncio.wait_for(stop_event.wait(), timeout=interval_seconds)
                    # If we reach here without TimeoutError, stop_event was set
                    if stop_event.is_set():
                        logger.info("Stop signal received during sleep; exiting polling loop")
                        break
                else:
                    await asyncio.sleep(interval_seconds)
            except asyncio.TimeoutError:
                # Expected when using wait_for with stop_event
                pass
    finally:
        logger.info("Background polling loop stopped")


async def run_automation_cycle(interval_seconds: int = 300, stop_event: Optional[asyncio.Event] = None) -> None:
    """Continuously run automation every `interval_seconds` seconds.

    For each channel with active automation rules:
    - Get pending comments for that channel
    - Evaluate all active rules per comment
    - Execute the highest priority matching rule (rules are already ordered by priority in engine)
    - Respect per-rule response limits (response_limit_per_run) and a global safeguard
    - If requires_approval is false and action is generate_response, auto-post to YouTube
    """
    logger.info("Starting automation loop (interval={}s)", interval_seconds)
    try:
        while True:
            if stop_event and stop_event.is_set():
                logger.info("Stop signal received; exiting automation loop")
                break

            async for session in get_async_session():
                try:
                    # Fetch channels that have any enabled automation rules
                    res = await session.execute(
                        text(
                            """
                            SELECT DISTINCT channel_id
                            FROM automation_rules
                            WHERE enabled = true
                            """
                        )
                    )
                    channels = [r[0] for r in res.fetchall()]
                    if not channels:
                        break

                    engine = AutomationEngine(session)

                    for cid in channels:
                        # Load rules first to get limits and approval flags
                        rules = await engine.get_active_rules(channel_id=cid)
                        if not rules:
                            continue

                        # Determine per-run limit: min of rule-specific limits if provided, else default 20
                        # We cannot read limits from our Rule dataclass (doesn't include it), so fetch from table quickly
                        limits_res = await session.execute(
                            text(
                                """
                                SELECT COALESCE(MIN(NULLIF(response_limit_per_run, 0)), 20),
                                       BOOL_OR(NOT COALESCE(require_approval, false))
                                FROM automation_rules
                                WHERE channel_id = :cid AND enabled = true
                                """
                            ),
                            {"cid": str(cid)},
                        )
                        row = limits_res.first()
                        max_responses = int(row[0] or 20)
                        any_auto_post = bool(row[1] or False)

                        # Get pending comments for this channel ordered by priority
                        pending_res = await session.execute(
                            text(
                                """
                                SELECT id, comment_id, channel_id, video_id, content, classification, author_channel_id, author_name
                                FROM comments_queue
                                WHERE channel_id = :cid AND status = 'pending'
                                ORDER BY priority DESC, created_at ASC
                                LIMIT 100
                                """
                            ),
                            {"cid": str(cid)},
                        )
                        pending = [
                            AutoComment(
                                id=str(r[0]),
                                comment_id=str(r[1]),
                                channel_id=str(r[2]),
                                video_id=str(r[3]),
                                content=str(r[4] or ""),
                                classification=(r[5] or None),
                                author_channel_id=(r[6] or None),
                                author_name=(r[7] or None),
                            )
                            for r in pending_res.fetchall()
                        ]

                        executed = 0
                        for c in pending:
                            if executed >= max_responses:
                                break
                            # Evaluate and execute highest priority matching rule: rules are already sorted in engine.get_active_rules
                            for r in rules:
                                try:
                                    if engine.evaluate_rule(c, r):
                                        ok = await engine.execute_action(comment=c, action=r.action)
                                        if ok:
                                            executed += 1
                                            # Optional: auto-post if no approval required and action is generate_response
                                            if any_auto_post and (r.action or {}).get("type") == "generate_response":
                                                # Mark queue row as ready to post by setting status to 'processing' (YouTube posting handled elsewhere)
                                                await session.execute(
                                                    text(
                                                        """
                                                        UPDATE comments_queue
                                                        SET status = 'processing', updated_at = now()
                                                        WHERE id = :qid
                                                        """
                                                    ),
                                                    {"qid": c.id},
                                                )
                                            break  # do not evaluate other rules for this comment
                                except Exception:
                                    logger.exception("Automation evaluate/execute failed for comment {}", c.id)
                        if executed:
                            await session.commit()
                except Exception:
                    logger.exception("Automation iteration failed")
                finally:
                    break

            # Sleep or exit early
            try:
                if stop_event:
                    await asyncio.wait_for(stop_event.wait(), timeout=interval_seconds)
                    if stop_event.is_set():
                        logger.info("Stop signal received during automation sleep; exiting loop")
                        break
                else:
                    await asyncio.sleep(interval_seconds)
            except asyncio.TimeoutError:
                pass
    finally:
        logger.info("Automation loop stopped")
