"""
Celery tasks for async credit tracking.
"""
from typing import Optional, Dict, Any
from uuid import UUID

from app.core.celery import celery_app
from app.core.database import get_async_session
from app.services.credit_service import CreditService
from app.models.credit_usage import ActionType


@celery_app.task(name="track_credit_usage", ignore_result=True)
async def track_credit_usage_async(
    user_id: str,
    action_type: str,
    description: Optional[str] = None,
    input_tokens: Optional[int] = None,
    output_tokens: Optional[int] = None,
    model_used: Optional[str] = None,
    resource_id: Optional[str] = None,
    resource_type: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    manual_credits: Optional[float] = None
):
    """
    Async task to track credit usage.
    
    This runs in the background to avoid slowing down API requests.
    """
    try:
        async with get_async_session() as db:
            service = CreditService(db)
            
            await service.track_usage(
                user_id=UUID(user_id),
                action_type=ActionType(action_type),
                description=description,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                model_used=model_used,
                resource_id=resource_id,
                resource_type=resource_type,
                metadata=metadata,
                manual_credits=manual_credits
            )
    except Exception as e:
        # Log error but don't fail - credit tracking shouldn't break the app
        celery_app.logger.error(f"Failed to track credit usage: {e}", exc_info=True)
