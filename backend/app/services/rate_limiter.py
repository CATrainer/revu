"""Rate limiting service for AI API usage."""

from datetime import datetime, timedelta
from typing import Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from fastapi import HTTPException
from loguru import logger

from app.models.monetization import AIUsageLog, ProjectChatMessage, ActiveProject


class RateLimiter:
    """Rate limiting for AI API calls with cost tracking."""
    
    # Configuration
    MAX_MESSAGES_PER_DAY = 50
    MAX_INPUT_TOKENS_PER_MESSAGE = 150000
    MAX_OUTPUT_TOKENS_PER_MESSAGE = 50000
    
    # Cost tracking (Claude Sonnet 4 pricing)
    COST_PER_1K_INPUT_TOKENS = 0.003
    COST_PER_1K_OUTPUT_TOKENS = 0.015
    DAILY_COST_ALERT_THRESHOLD = 50.0
    
    @staticmethod
    async def check_rate_limit(user_id: str, db: AsyncSession) -> bool:
        """Check if user has exceeded daily message limit.
        
        Raises:
            HTTPException: If rate limit exceeded
        
        Returns:
            True if within limits
        """
        
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Count messages sent today across all user's projects
        result = await db.execute(
            select(func.count(ProjectChatMessage.id))
            .select_from(ProjectChatMessage)
            .join(ActiveProject, ProjectChatMessage.project_id == ActiveProject.id)
            .where(
                ActiveProject.user_id == user_id,
                ProjectChatMessage.role == "user",
                ProjectChatMessage.created_at >= today_start
            )
        )
        
        message_count = result.scalar() or 0
        
        if message_count >= RateLimiter.MAX_MESSAGES_PER_DAY:
            reset_time = (today_start + timedelta(days=1)).isoformat()
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "rate_limit_exceeded",
                    "message": f"Daily message limit reached ({RateLimiter.MAX_MESSAGES_PER_DAY} messages). Resets at midnight UTC.",
                    "reset_at": reset_time,
                    "current_count": message_count
                }
            )
        
        return True
    
    @staticmethod
    async def log_usage(
        user_id: str,
        project_id: str,
        input_tokens: int,
        output_tokens: int,
        endpoint: str,
        db: AsyncSession
    ) -> float:
        """Log API usage for cost tracking.
        
        Returns:
            Estimated cost in USD
        """
        
        estimated_cost = (
            (input_tokens / 1000) * RateLimiter.COST_PER_1K_INPUT_TOKENS +
            (output_tokens / 1000) * RateLimiter.COST_PER_1K_OUTPUT_TOKENS
        )
        
        # Insert usage log
        usage_log = AIUsageLog(
            user_id=user_id,
            project_id=project_id,
            model="claude-sonnet-4-20250514",
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            estimated_cost=estimated_cost,
            endpoint=endpoint
        )
        
        db.add(usage_log)
        await db.commit()
        
        logger.info(
            f"AI usage logged: user={user_id}, tokens_in={input_tokens}, "
            f"tokens_out={output_tokens}, cost=${estimated_cost:.4f}"
        )
        
        return estimated_cost
    
    @staticmethod
    async def check_daily_costs(db: AsyncSession) -> Dict:
        """Check total costs for the day (admin monitoring).
        
        Returns:
            Dict with total_calls, total_input_tokens, total_output_tokens, total_cost
        """
        
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        
        result = await db.execute(
            select(
                func.count(AIUsageLog.id).label("total_calls"),
                func.sum(AIUsageLog.input_tokens).label("total_input_tokens"),
                func.sum(AIUsageLog.output_tokens).label("total_output_tokens"),
                func.sum(AIUsageLog.estimated_cost).label("total_cost")
            ).where(AIUsageLog.created_at >= today_start)
        )
        
        stats = result.one()
        
        return {
            "total_calls": stats.total_calls or 0,
            "total_input_tokens": stats.total_input_tokens or 0,
            "total_output_tokens": stats.total_output_tokens or 0,
            "total_cost": float(stats.total_cost or 0),
            "date": today_start.date().isoformat(),
            "alert": float(stats.total_cost or 0) > RateLimiter.DAILY_COST_ALERT_THRESHOLD
        }
    
    @staticmethod
    async def get_user_usage_stats(user_id: str, db: AsyncSession, days: int = 7) -> Dict:
        """Get usage statistics for a specific user.
        
        Args:
            user_id: User ID
            db: Database session
            days: Number of days to look back
        
        Returns:
            Dict with usage statistics
        """
        
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        result = await db.execute(
            select(
                func.count(AIUsageLog.id).label("total_calls"),
                func.sum(AIUsageLog.input_tokens).label("total_input_tokens"),
                func.sum(AIUsageLog.output_tokens).label("total_output_tokens"),
                func.sum(AIUsageLog.estimated_cost).label("total_cost")
            ).where(
                AIUsageLog.user_id == user_id,
                AIUsageLog.created_at >= cutoff_date
            )
        )
        
        stats = result.one()
        
        return {
            "total_calls": stats.total_calls or 0,
            "total_input_tokens": stats.total_input_tokens or 0,
            "total_output_tokens": stats.total_output_tokens or 0,
            "total_cost": float(stats.total_cost or 0),
            "period_days": days
        }
