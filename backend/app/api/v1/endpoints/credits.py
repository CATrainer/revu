"""
Credit tracking endpoints.

For now these are internal/admin only. Will be exposed to users later.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.core.database import get_async_session
from app.core.security import get_current_active_user
from app.models.user import User
from app.services.credit_service import CreditService

router = APIRouter()


@router.get("/credits/balance")
async def get_credit_balance(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Get current user's credit balance.
    
    Returns:
        - current_balance: Available credits
        - monthly_allowance: Credits per month
        - total_consumed: Lifetime credits used
        - next_reset_at: When credits will reset
    """
    service = CreditService(db)
    balance = await service.get_user_balance(current_user.id)
    
    return {
        "current_balance": round(balance.current_balance, 2),
        "monthly_allowance": balance.monthly_allowance,
        "total_consumed": round(balance.total_consumed, 2),
        "current_month_consumed": round(balance.current_month_consumed, 2),
        "next_reset_at": balance.next_reset_at.isoformat(),
        "is_unlimited": balance.is_unlimited
    }


@router.get("/credits/usage")
async def get_credit_usage(
    days: int = 30,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Get credit usage statistics for the current user.
    
    Args:
        days: Number of days to look back (default 30)
    
    Returns:
        - total_credits_used: Total credits in period
        - daily_usage: Credits used per day
        - action_usage: Credits used per action type
        - event_count: Number of events
    """
    service = CreditService(db)
    stats = await service.get_usage_stats(current_user.id, days)
    
    return stats


@router.get("/credits/estimate-ai-cost")
async def estimate_ai_cost(
    input_tokens: int,
    output_tokens: int,
    model: str = "claude",
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Estimate the credit cost of an AI operation.
    
    Useful for showing users cost before they perform an action.
    
    Args:
        input_tokens: Expected input token count
        output_tokens: Expected output token count
        model: Model to use (claude, gpt)
    
    Returns:
        - credits: Estimated credit cost
        - dollars: Estimated dollar cost to us
    """
    service = CreditService(db)
    cost = await service.calculate_ai_cost(input_tokens, output_tokens, model)
    
    return {
        "credits": round(cost["credits"], 4),
        "dollars": round(cost["api_cost"], 4),
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "model": model
    }
