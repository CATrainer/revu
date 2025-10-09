"""
Utilities and decorators for credit tracking.

Makes it easy to track credit usage throughout the application.
"""
from functools import wraps
from typing import Optional, Callable, Any, Dict
from uuid import UUID
import asyncio

from app.models.credit_usage import ActionType
from app.tasks.credit_tasks import track_credit_usage_async


def track_credits(
    action_type: ActionType,
    description: Optional[str] = None,
    manual_credits: Optional[float] = None,
    resource_type: Optional[str] = None
):
    """
    Decorator to automatically track credit usage for a function.
    
    Usage:
        @track_credits(ActionType.WORKFLOW_EXECUTION, manual_credits=0.001)
        async def execute_workflow(user_id: UUID, workflow_id: str):
            # ... function code
            pass
    
    The decorator will:
    1. Execute the function normally
    2. Send credit tracking to background task (non-blocking)
    3. Extract user_id from function args/kwargs
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            # Execute the actual function first
            result = await func(*args, **kwargs)
            
            # Extract user_id from args or kwargs
            user_id = None
            if args and hasattr(args[0], 'id'):
                # First arg might be User object
                user_id = str(args[0].id)
            elif 'user_id' in kwargs:
                user_id = str(kwargs['user_id'])
            elif 'current_user' in kwargs and hasattr(kwargs['current_user'], 'id'):
                user_id = str(kwargs['current_user'].id)
            
            if user_id:
                # Track in background (fire and forget)
                try:
                    track_credit_usage_async.delay(
                        user_id=user_id,
                        action_type=action_type.value,
                        description=description,
                        manual_credits=manual_credits,
                        resource_type=resource_type
                    )
                except Exception as e:
                    # Don't fail the request if tracking fails
                    print(f"Warning: Failed to queue credit tracking: {e}")
            
            return result
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            # For sync functions
            result = func(*args, **kwargs)
            
            # Extract user_id
            user_id = None
            if args and hasattr(args[0], 'id'):
                user_id = str(args[0].id)
            elif 'user_id' in kwargs:
                user_id = str(kwargs['user_id'])
            elif 'current_user' in kwargs and hasattr(kwargs['current_user'], 'id'):
                user_id = str(kwargs['current_user'].id)
            
            if user_id:
                try:
                    track_credit_usage_async.delay(
                        user_id=user_id,
                        action_type=action_type.value,
                        description=description,
                        manual_credits=manual_credits,
                        resource_type=resource_type
                    )
                except Exception as e:
                    print(f"Warning: Failed to queue credit tracking: {e}")
            
            return result
        
        # Return appropriate wrapper based on function type
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator


async def track_ai_usage(
    user_id: UUID,
    action_type: ActionType,
    input_tokens: int,
    output_tokens: int,
    model: str = "claude-3-5-sonnet",
    description: Optional[str] = None,
    resource_id: Optional[str] = None,
    resource_type: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
):
    """
    Track AI usage with token counts.
    
    This is for manual tracking of AI operations where we know the token counts.
    Use this after making AI API calls.
    
    Example:
        response = await claude_api.messages.create(...)
        await track_ai_usage(
            user_id=current_user.id,
            action_type=ActionType.AI_CHAT_MESSAGE,
            input_tokens=response.usage.input_tokens,
            output_tokens=response.usage.output_tokens,
            model="claude-3-5-sonnet",
            description="AI chat response"
        )
    """
    try:
        track_credit_usage_async.delay(
            user_id=str(user_id),
            action_type=action_type.value,
            description=description,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            model_used=model,
            resource_id=resource_id,
            resource_type=resource_type,
            metadata=metadata
        )
    except Exception as e:
        print(f"Warning: Failed to queue AI usage tracking: {e}")


async def track_compute_usage(
    user_id: UUID,
    action_type: ActionType,
    credits: float,
    description: Optional[str] = None,
    resource_id: Optional[str] = None,
    resource_type: Optional[str] = None
):
    """
    Track compute usage with manual credit specification.
    
    Use this for Celery tasks or compute operations where you define the credit cost.
    
    Example:
        # At the end of a Celery task
        await track_compute_usage(
            user_id=workflow.user_id,
            action_type=ActionType.WORKFLOW_EXECUTION,
            credits=0.001,  # Tiny fraction of a credit
            description="Workflow execution",
            resource_id=str(workflow.id),
            resource_type="workflow"
        )
    """
    try:
        track_credit_usage_async.delay(
            user_id=str(user_id),
            action_type=action_type.value,
            description=description,
            manual_credits=credits,
            resource_id=resource_id,
            resource_type=resource_type
        )
    except Exception as e:
        print(f"Warning: Failed to queue compute usage tracking: {e}")


# Predefined credit costs for common Celery tasks
# These are small fractions since compute is cheap
CELERY_TASK_COSTS = {
    "workflow_execution": 0.001,  # 0.1% of a credit per workflow run
    "youtube_sync": 0.005,  # 0.5% of a credit per sync
    "analytics_generation": 0.002,  # 0.2% of a credit
    "bulk_operation": 0.01,  # 1% of a credit for bulk ops
    "scheduled_task": 0.0005,  # 0.05% of a credit for scheduled tasks
}


def get_task_credit_cost(task_name: str) -> float:
    """Get predefined credit cost for a Celery task."""
    return CELERY_TASK_COSTS.get(task_name, 0.001)  # Default to 0.001
