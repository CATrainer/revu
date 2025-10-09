"""
Admin endpoints for viewing credit usage across all users.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from datetime import datetime, timedelta
from typing import Optional

from app.core.database import get_async_session
from app.core.security import get_current_active_user
from app.models.user import User
from app.models.credit_usage import CreditUsageEvent, UserCreditBalance

router = APIRouter()


def require_admin(current_user: User = Depends(get_current_active_user)) -> User:
    """Require admin privileges."""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


@router.get("/admin/credits/overview")
async def get_credit_overview(
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Get high-level credit usage overview.
    
    Returns:
        - Total events
        - Total credits consumed
        - Total API costs
        - Active users
        - Credits by action type
    """
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Overall stats
    result = await db.execute(
        select(
            func.count(CreditUsageEvent.id).label('total_events'),
            func.sum(CreditUsageEvent.credits_charged).label('total_credits'),
            func.sum(CreditUsageEvent.api_cost).label('total_api_cost'),
            func.count(func.distinct(CreditUsageEvent.user_id)).label('active_users')
        ).filter(CreditUsageEvent.created_at >= start_date)
    )
    stats = result.first()
    
    # By action type
    result = await db.execute(
        select(
            CreditUsageEvent.action_type,
            func.count(CreditUsageEvent.id).label('count'),
            func.sum(CreditUsageEvent.credits_charged).label('credits')
        ).filter(
            CreditUsageEvent.created_at >= start_date
        ).group_by(CreditUsageEvent.action_type)
    )
    by_action = [
        {
            "action_type": row.action_type.value,
            "event_count": row.count,
            "total_credits": round(float(row.credits or 0), 2)
        }
        for row in result.fetchall()
    ]
    
    return {
        "period_days": days,
        "total_events": stats.total_events or 0,
        "total_credits": round(float(stats.total_credits or 0), 2),
        "total_api_cost_dollars": round(float(stats.total_api_cost or 0), 4),
        "active_users": stats.active_users or 0,
        "by_action_type": by_action
    }


@router.get("/admin/credits/users")
async def get_all_user_balances(
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    sort_by: str = Query("consumed", pattern="^(consumed|balance|email)$"),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Get credit balances for all users.
    
    Args:
        limit: Max results to return
        offset: Pagination offset
        sort_by: Sort by 'consumed', 'balance', or 'email'
    """
    # Build query
    query = select(
        User.email,
        User.full_name,
        UserCreditBalance.current_balance,
        UserCreditBalance.monthly_allowance,
        UserCreditBalance.current_month_consumed,
        UserCreditBalance.total_consumed,
        UserCreditBalance.next_reset_at
    ).join(
        UserCreditBalance, User.id == UserCreditBalance.user_id
    )
    
    # Apply sorting
    if sort_by == "consumed":
        query = query.order_by(UserCreditBalance.current_month_consumed.desc())
    elif sort_by == "balance":
        query = query.order_by(UserCreditBalance.current_balance.asc())
    else:  # email
        query = query.order_by(User.email)
    
    query = query.limit(limit).offset(offset)
    
    result = await db.execute(query)
    users = [
        {
            "email": row.email,
            "full_name": row.full_name,
            "current_balance": round(float(row.current_balance), 2),
            "monthly_allowance": float(row.monthly_allowance),
            "current_month_consumed": round(float(row.current_month_consumed), 2),
            "total_consumed": round(float(row.total_consumed), 2),
            "next_reset_at": row.next_reset_at.isoformat()
        }
        for row in result.fetchall()
    ]
    
    return {
        "users": users,
        "limit": limit,
        "offset": offset,
        "count": len(users)
    }


@router.get("/admin/credits/user/{user_email}")
async def get_user_credit_detail(
    user_email: str,
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Get detailed credit usage for a specific user.
    
    Returns balance, recent events, and breakdown by action type.
    """
    # Get user
    result = await db.execute(
        select(User).filter(User.email == user_email)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get balance
    result = await db.execute(
        select(UserCreditBalance).filter(UserCreditBalance.user_id == user.id)
    )
    balance = result.scalar_one_or_none()
    
    # Get recent events
    start_date = datetime.utcnow() - timedelta(days=days)
    result = await db.execute(
        select(CreditUsageEvent).filter(
            CreditUsageEvent.user_id == user.id,
            CreditUsageEvent.created_at >= start_date
        ).order_by(CreditUsageEvent.created_at.desc()).limit(100)
    )
    events = result.scalars().all()
    
    # Aggregate by action type
    result = await db.execute(
        select(
            CreditUsageEvent.action_type,
            func.count(CreditUsageEvent.id).label('count'),
            func.sum(CreditUsageEvent.credits_charged).label('credits')
        ).filter(
            CreditUsageEvent.user_id == user.id,
            CreditUsageEvent.created_at >= start_date
        ).group_by(CreditUsageEvent.action_type)
    )
    by_action = [
        {
            "action_type": row.action_type.value,
            "count": row.count,
            "total_credits": round(float(row.credits or 0), 2)
        }
        for row in result.fetchall()
    ]
    
    return {
        "user": {
            "email": user.email,
            "full_name": user.full_name,
            "demo_mode": user.demo_mode
        },
        "balance": {
            "current_balance": round(float(balance.current_balance), 2) if balance else 0,
            "monthly_allowance": float(balance.monthly_allowance) if balance else 100,
            "current_month_consumed": round(float(balance.current_month_consumed), 2) if balance else 0,
            "total_consumed": round(float(balance.total_consumed), 2) if balance else 0,
            "next_reset_at": balance.next_reset_at.isoformat() if balance else None
        },
        "recent_events": [
            {
                "timestamp": event.created_at.isoformat(),
                "action_type": event.action_type.value,
                "credits": round(float(event.credits_charged), 4),
                "description": event.description,
                "input_tokens": event.input_tokens,
                "output_tokens": event.output_tokens,
                "model": event.model_used
            }
            for event in events[:20]  # Last 20 events
        ],
        "by_action_type": by_action,
        "period_days": days
    }


@router.get("/admin/credits/top-consumers")
async def get_top_credit_consumers(
    days: int = Query(30, ge=1, le=365),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_async_session)
):
    """Get top credit consumers in the specified period."""
    start_date = datetime.utcnow() - timedelta(days=days)
    
    result = await db.execute(
        select(
            User.email,
            User.full_name,
            func.count(CreditUsageEvent.id).label('event_count'),
            func.sum(CreditUsageEvent.credits_charged).label('total_credits'),
            func.sum(CreditUsageEvent.api_cost).label('total_api_cost')
        ).join(
            CreditUsageEvent, User.id == CreditUsageEvent.user_id
        ).filter(
            CreditUsageEvent.created_at >= start_date
        ).group_by(
            User.id, User.email, User.full_name
        ).order_by(
            func.sum(CreditUsageEvent.credits_charged).desc()
        ).limit(limit)
    )
    
    consumers = [
        {
            "email": row.email,
            "full_name": row.full_name,
            "event_count": row.event_count,
            "total_credits": round(float(row.total_credits or 0), 2),
            "total_api_cost": round(float(row.total_api_cost or 0), 4)
        }
        for row in result.fetchall()
    ]
    
    return {
        "top_consumers": consumers,
        "period_days": days,
        "limit": limit
    }


@router.get("/admin/credits/daily-trend")
async def get_daily_credit_trend(
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_async_session)
):
    """Get daily credit usage trend."""
    start_date = datetime.utcnow() - timedelta(days=days)
    
    result = await db.execute(
        text("""
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as events,
                ROUND(SUM(credits_charged)::numeric, 2) as total_credits,
                COUNT(DISTINCT user_id) as unique_users
            FROM credit_usage_events
            WHERE created_at >= :start_date
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        """),
        {"start_date": start_date}
    )
    
    daily_data = [
        {
            "date": row.date.isoformat(),
            "events": row.events,
            "total_credits": float(row.total_credits or 0),
            "unique_users": row.unique_users
        }
        for row in result.fetchall()
    ]
    
    return {
        "daily_trend": daily_data,
        "period_days": days
    }
