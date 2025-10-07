"""Service for managing response queue with rate limiting and human-like behavior."""
import random
from datetime import datetime, timedelta
from typing import List, Optional
from uuid import UUID
import logging

from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.response_queue import ResponseQueue, PlatformRateLimit
from app.models.interaction import Interaction

logger = logging.getLogger(__name__)


class ResponseQueueService:
    """Manages the response queue with intelligent batching and rate limiting."""
    
    @staticmethod
    async def add_to_queue(
        session: AsyncSession,
        interaction_id: UUID,
        response_text: str,
        platform: str,
        user_id: UUID,
        priority: int = 50,
        workflow_id: Optional[UUID] = None,
        organization_id: Optional[UUID] = None,
    ) -> ResponseQueue:
        """Add a response to the queue with intelligent scheduling."""
        
        # Calculate scheduled time based on current queue and rate limits
        scheduled_for = await ResponseQueueService._calculate_send_time(
            session, platform, user_id
        )
        
        # Create queue entry
        queue_item = ResponseQueue(
            interaction_id=interaction_id,
            response_text=response_text,
            platform=platform,
            status='pending',
            priority=priority,
            scheduled_for=scheduled_for,
            workflow_id=workflow_id,
            user_id=user_id,
            organization_id=organization_id,
        )
        
        session.add(queue_item)
        await session.commit()
        await session.refresh(queue_item)
        
        logger.info(f"Added response to queue: {queue_item.id} scheduled for {scheduled_for}")
        return queue_item
    
    @staticmethod
    async def _calculate_send_time(
        session: AsyncSession,
        platform: str,
        user_id: UUID,
    ) -> datetime:
        """Calculate when to send next response based on rate limits and queue."""
        
        # Get or create rate limit config
        rate_limit = await ResponseQueueService._get_rate_limit(session, platform, user_id)
        
        # Get last scheduled time from queue
        last_scheduled_stmt = select(ResponseQueue).where(
            and_(
                ResponseQueue.platform == platform,
                ResponseQueue.user_id == user_id,
                ResponseQueue.status.in_(['pending', 'processing'])
            )
        ).order_by(ResponseQueue.scheduled_for.desc()).limit(1)
        
        result = await session.execute(last_scheduled_stmt)
        last_queued = result.scalar_one_or_none()
        
        # Calculate base next time
        now = datetime.utcnow()
        if last_queued and last_queued.scheduled_for:
            next_time = last_queued.scheduled_for + timedelta(seconds=rate_limit.min_interval_seconds)
        else:
            next_time = now + timedelta(seconds=rate_limit.min_interval_seconds)
        
        # Ensure not in past
        if next_time < now:
            next_time = now + timedelta(seconds=5)
        
        # Add random delay for human-like behavior
        if rate_limit.add_random_delay:
            random_delay = random.randint(rate_limit.min_delay_seconds, rate_limit.max_delay_seconds)
            next_time = next_time + timedelta(seconds=random_delay)
        
        return next_time
    
    @staticmethod
    async def _get_rate_limit(
        session: AsyncSession,
        platform: str,
        user_id: UUID,
    ) -> PlatformRateLimit:
        """Get or create rate limit configuration for platform/user."""
        
        stmt = select(PlatformRateLimit).where(
            and_(
                PlatformRateLimit.platform == platform,
                PlatformRateLimit.user_id == user_id
            )
        )
        result = await session.execute(stmt)
        rate_limit = result.scalar_one_or_none()
        
        if not rate_limit:
            # Create default rate limit
            rate_limit = PlatformRateLimit(
                platform=platform,
                user_id=user_id,
                max_per_hour=60,
                max_per_minute=5,
                min_interval_seconds=10,
                add_random_delay=True,
                min_delay_seconds=5,
                max_delay_seconds=30,
            )
            session.add(rate_limit)
            await session.commit()
            await session.refresh(rate_limit)
        
        return rate_limit
    
    @staticmethod
    async def get_ready_to_send(
        session: AsyncSession,
        batch_size: int = 10,
    ) -> List[ResponseQueue]:
        """Get batch of responses ready to send."""
        
        now = datetime.utcnow()
        
        stmt = select(ResponseQueue).where(
            and_(
                ResponseQueue.status == 'pending',
                ResponseQueue.scheduled_for <= now,
            )
        ).order_by(
            ResponseQueue.priority.desc(),
            ResponseQueue.scheduled_for.asc()
        ).limit(batch_size)
        
        result = await session.execute(stmt)
        return list(result.scalars().all())
    
    @staticmethod
    async def mark_as_processing(
        session: AsyncSession,
        queue_item: ResponseQueue,
        batch_id: str,
    ):
        """Mark a queue item as being processed."""
        queue_item.status = 'processing'
        queue_item.batch_id = batch_id
        queue_item.attempted_at = datetime.utcnow()
        await session.commit()
    
    @staticmethod
    async def mark_as_sent(
        session: AsyncSession,
        queue_item: ResponseQueue,
    ):
        """Mark a queue item as successfully sent."""
        queue_item.status = 'sent'
        queue_item.sent_at = datetime.utcnow()
        
        # Update interaction status
        if queue_item.interaction:
            queue_item.interaction.status = 'answered'
            queue_item.interaction.responded_at = datetime.utcnow()
        
        await session.commit()
        logger.info(f"Response sent successfully: {queue_item.id}")
    
    @staticmethod
    async def mark_as_failed(
        session: AsyncSession,
        queue_item: ResponseQueue,
        error_message: str,
        error_data: Optional[dict] = None,
    ):
        """Mark a queue item as failed and schedule retry if applicable."""
        queue_item.retry_count += 1
        queue_item.error_message = error_message
        queue_item.error_data = error_data
        
        # Retry logic (max 3 attempts)
        if queue_item.retry_count < 3:
            queue_item.status = 'pending'
            # Schedule retry with exponential backoff + randomness
            delay_minutes = (2 ** queue_item.retry_count) * 5  # 5, 10, 20 minutes
            random_extra = random.randint(0, 300)  # 0-5 minutes random
            queue_item.scheduled_for = datetime.utcnow() + timedelta(
                minutes=delay_minutes,
                seconds=random_extra
            )
            logger.warning(f"Response failed, will retry: {queue_item.id} (attempt {queue_item.retry_count})")
        else:
            queue_item.status = 'failed'
            logger.error(f"Response permanently failed after 3 attempts: {queue_item.id}")
        
        await session.commit()
    
    @staticmethod
    async def get_queue_stats(
        session: AsyncSession,
        user_id: UUID,
        platform: Optional[str] = None,
    ) -> dict:
        """Get statistics about the response queue."""
        
        conditions = [ResponseQueue.user_id == user_id]
        if platform:
            conditions.append(ResponseQueue.platform == platform)
        
        # Count by status
        stmt = select(ResponseQueue).where(and_(*conditions))
        result = await session.execute(stmt)
        all_items = result.scalars().all()
        
        stats = {
            'total': len(all_items),
            'pending': len([i for i in all_items if i.status == 'pending']),
            'processing': len([i for i in all_items if i.status == 'processing']),
            'sent': len([i for i in all_items if i.status == 'sent']),
            'failed': len([i for i in all_items if i.status == 'failed']),
            'next_scheduled': None,
        }
        
        # Get next scheduled time
        next_stmt = select(ResponseQueue).where(
            and_(
                ResponseQueue.user_id == user_id,
                ResponseQueue.status == 'pending'
            )
        ).order_by(ResponseQueue.scheduled_for.asc()).limit(1)
        
        next_result = await session.execute(next_stmt)
        next_item = next_result.scalar_one_or_none()
        
        if next_item:
            stats['next_scheduled'] = next_item.scheduled_for.isoformat()
        
        return stats
    
    @staticmethod
    async def update_rate_limits(
        session: AsyncSession,
        user_id: UUID,
        platform: str,
        max_per_hour: Optional[int] = None,
        max_per_minute: Optional[int] = None,
        min_interval_seconds: Optional[int] = None,
    ):
        """Update rate limit configuration for a platform."""
        
        rate_limit = await ResponseQueueService._get_rate_limit(session, platform, user_id)
        
        if max_per_hour is not None:
            rate_limit.max_per_hour = max_per_hour
        if max_per_minute is not None:
            rate_limit.max_per_minute = max_per_minute
        if min_interval_seconds is not None:
            rate_limit.min_interval_seconds = min_interval_seconds
        
        await session.commit()
        logger.info(f"Updated rate limits for {platform}: {user_id}")
