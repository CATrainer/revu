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
