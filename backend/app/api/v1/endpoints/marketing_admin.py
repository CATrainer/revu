"""
Admin marketing endpoints for SendGrid Marketing operations.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.core.security import get_current_user
from app.models.user import User
from app.tasks.marketing import sync_all_contacts

router = APIRouter(tags=["admin", "marketing"])


@router.post("/marketing/sync-contacts")
async def admin_sync_sendgrid_contacts(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
    limit: int = 1000,
):
    """Trigger a background sync of contacts to SendGrid Marketing (Admin only)."""
    # TODO: Enforce admin when roles are wired
    # if not current_user.is_admin:
    #     raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")

    task = sync_all_contacts.delay(limit)
    return {
        "status": "queued",
        "task_id": str(task.id),
        "limit": limit,
    }
