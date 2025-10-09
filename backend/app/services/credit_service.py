"""
Credit tracking service.

Handles all credit calculations, tracking, and balance management.
1 credit = $0.10 of actual cost (API + compute)
"""
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from decimal import Decimal

from app.models.credit_usage import (
    CreditUsageEvent,
    UserCreditBalance,
    CreditActionCost,
    ActionType
)
from app.models.user import User


# Pricing constants (per million tokens)
CLAUDE_INPUT_COST_PER_M = 3.0  # $3 per million input tokens
CLAUDE_OUTPUT_COST_PER_M = 15.0  # $15 per million output tokens
OPENAI_INPUT_COST_PER_M = 2.5  # $2.50 per million input tokens (GPT-4)
OPENAI_OUTPUT_COST_PER_M = 10.0  # $10 per million output tokens

# Credit conversion
DOLLARS_PER_CREDIT = 0.10  # 1 credit = $0.10
CREDITS_PER_DOLLAR = 10.0  # $1.00 = 10 credits


class CreditService:
    """Service for managing credit tracking and calculations."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def ensure_user_balance(self, user_id: UUID) -> UserCreditBalance:
        """
        Ensure user has a credit balance record.
        Creates one if it doesn't exist.
        """
        result = await self.db.execute(
            select(UserCreditBalance).filter(UserCreditBalance.user_id == user_id)
        )
        balance = result.scalar_one_or_none()
        
        if not balance:
            # Get user to check signup date
            user_result = await self.db.execute(
                select(User).filter(User.id == user_id)
            )
            user = user_result.scalar_one_or_none()
            
            if not user:
                raise ValueError(f"User {user_id} not found")
            
            # Calculate next reset (1 month from signup)
            signup_date = user.created_at or datetime.utcnow()
            next_reset = self._calculate_next_reset(signup_date)
            
            balance = UserCreditBalance(
                user_id=user_id,
                current_balance=100.0,
                total_earned=100.0,
                total_consumed=0.0,
                monthly_allowance=100.0,
                month_start_balance=100.0,
                current_month_consumed=0.0,
                last_reset_at=signup_date,
                next_reset_at=next_reset
            )
            self.db.add(balance)
            await self.db.commit()
            await self.db.refresh(balance)
        
        return balance
    
    def _calculate_next_reset(self, last_reset: datetime) -> datetime:
        """Calculate next monthly reset date (1 month from last reset)."""
        # Add 1 month (approximately 30 days)
        next_reset = last_reset + timedelta(days=30)
        return next_reset
    
    async def calculate_ai_cost(
        self,
        input_tokens: int,
        output_tokens: int,
        model: str = "claude"
    ) -> Dict[str, float]:
        """
        Calculate the cost of an AI operation based on token usage.
        
        Returns:
            Dict with 'api_cost' (in dollars) and 'credits' (our credit cost)
        """
        if model.startswith("claude"):
            input_cost = (input_tokens / 1_000_000) * CLAUDE_INPUT_COST_PER_M
            output_cost = (output_tokens / 1_000_000) * CLAUDE_OUTPUT_COST_PER_M
        elif model.startswith("gpt"):
            input_cost = (input_tokens / 1_000_000) * OPENAI_INPUT_COST_PER_M
            output_cost = (output_tokens / 1_000_000) * OPENAI_OUTPUT_COST_PER_M
        else:
            # Default to Claude pricing
            input_cost = (input_tokens / 1_000_000) * CLAUDE_INPUT_COST_PER_M
            output_cost = (output_tokens / 1_000_000) * CLAUDE_OUTPUT_COST_PER_M
        
        total_api_cost = input_cost + output_cost
        credits = total_api_cost * CREDITS_PER_DOLLAR
        
        return {
            "api_cost": total_api_cost,
            "credits": credits
        }
    
    async def get_action_cost(self, action_type: ActionType) -> Dict[str, float]:
        """
        Get the configured base and compute cost for an action type.
        
        Returns:
            Dict with 'base_cost', 'compute_cost', and 'total_credits'
        """
        result = await self.db.execute(
            select(CreditActionCost).filter(
                CreditActionCost.action_type == action_type,
                CreditActionCost.is_active == True
            )
        )
        cost_config = result.scalar_one_or_none()
        
        if not cost_config:
            # Default to zero cost if not configured
            return {
                "base_cost": 0.0,
                "compute_cost": 0.0,
                "total_credits": 0.0
            }
        
        total_dollars = cost_config.base_cost_dollars + cost_config.compute_cost_dollars
        total_credits = total_dollars * CREDITS_PER_DOLLAR
        
        return {
            "base_cost": cost_config.base_cost_dollars,
            "compute_cost": cost_config.compute_cost_dollars,
            "total_credits": total_credits
        }
    
    async def track_usage(
        self,
        user_id: UUID,
        action_type: ActionType,
        description: Optional[str] = None,
        input_tokens: Optional[int] = None,
        output_tokens: Optional[int] = None,
        model_used: Optional[str] = None,
        resource_id: Optional[str] = None,
        resource_type: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        manual_credits: Optional[float] = None  # For manual credit specification
    ) -> CreditUsageEvent:
        """
        Track a credit usage event and deduct from user balance.
        
        Args:
            user_id: User ID
            action_type: Type of action
            description: Human-readable description
            input_tokens: For AI operations
            output_tokens: For AI operations
            model_used: Model name (claude-3-5-sonnet, etc.)
            resource_id: Related resource ID
            resource_type: Related resource type
            metadata: Additional context
            manual_credits: Manually specify credit cost (for compute operations)
        
        Returns:
            Created CreditUsageEvent
        """
        # Check if user is in demo mode - don't track if so
        user_result = await self.db.execute(
            select(User).filter(User.id == user_id)
        )
        user = user_result.scalar_one_or_none()
        
        if user and user.demo_mode:
            # Demo mode - don't track
            return None
        
        # Calculate costs
        api_cost = 0.0
        ai_credits = 0.0
        
        if input_tokens and output_tokens:
            ai_cost_data = await self.calculate_ai_cost(
                input_tokens, output_tokens, model_used or "claude"
            )
            api_cost = ai_cost_data["api_cost"]
            ai_credits = ai_cost_data["credits"]
        
        # Get base/compute costs for this action type
        action_costs = await self.get_action_cost(action_type)
        base_cost = action_costs["base_cost"]
        compute_cost = action_costs["compute_cost"]
        action_credits = action_costs["total_credits"]
        
        # Total credits
        if manual_credits is not None:
            # Manual override
            total_credits = manual_credits
        else:
            # Calculated: AI cost + action cost
            total_credits = ai_credits + action_credits
        
        # Round to reasonable precision (5 decimal places)
        total_credits = round(total_credits, 5)
        
        # Create usage event
        event = CreditUsageEvent(
            user_id=user_id,
            action_type=action_type,
            description=description,
            credits_charged=total_credits,
            base_cost=base_cost,
            api_cost=api_cost,
            compute_cost=compute_cost,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            model_used=model_used,
            resource_id=resource_id,
            resource_type=resource_type,
            metadata=metadata
        )
        self.db.add(event)
        
        # Update user balance
        balance = await self.ensure_user_balance(user_id)
        balance.current_balance -= total_credits
        balance.total_consumed += total_credits
        balance.current_month_consumed += total_credits
        balance.updated_at = datetime.utcnow()
        
        # Check if balance reset is needed
        if datetime.utcnow() >= balance.next_reset_at:
            await self._reset_monthly_balance(balance)
        
        await self.db.commit()
        await self.db.refresh(event)
        
        return event
    
    async def _reset_monthly_balance(self, balance: UserCreditBalance):
        """Reset monthly credits for a user."""
        balance.current_balance = balance.monthly_allowance
        balance.month_start_balance = balance.monthly_allowance
        balance.current_month_consumed = 0.0
        balance.total_earned += balance.monthly_allowance
        balance.last_reset_at = datetime.utcnow()
        balance.next_reset_at = self._calculate_next_reset(balance.last_reset_at)
        balance.low_balance_notified = False
        balance.updated_at = datetime.utcnow()
    
    async def get_user_balance(self, user_id: UUID) -> UserCreditBalance:
        """Get current user balance."""
        return await self.ensure_user_balance(user_id)
    
    async def has_sufficient_balance(
        self,
        user_id: UUID,
        required_credits: float
    ) -> bool:
        """Check if user has sufficient balance for an operation."""
        balance = await self.ensure_user_balance(user_id)
        
        if balance.is_unlimited:
            return True
        
        return balance.current_balance >= required_credits
    
    async def get_usage_stats(
        self,
        user_id: UUID,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Get usage statistics for a user.
        
        Returns:
            Dict with usage breakdown by day and action type
        """
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Get events in date range
        result = await self.db.execute(
            select(CreditUsageEvent).filter(
                CreditUsageEvent.user_id == user_id,
                CreditUsageEvent.created_at >= start_date
            ).order_by(CreditUsageEvent.created_at.desc())
        )
        events = result.scalars().all()
        
        # Aggregate by day
        daily_usage = {}
        for event in events:
            day = event.created_at.date().isoformat()
            if day not in daily_usage:
                daily_usage[day] = 0.0
            daily_usage[day] += event.credits_charged
        
        # Aggregate by action type
        action_usage = {}
        for event in events:
            action = event.action_type.value
            if action not in action_usage:
                action_usage[action] = 0.0
            action_usage[action] += event.credits_charged
        
        total_credits_used = sum(event.credits_charged for event in events)
        
        return {
            "total_credits_used": round(total_credits_used, 2),
            "daily_usage": daily_usage,
            "action_usage": action_usage,
            "event_count": len(events)
        }
