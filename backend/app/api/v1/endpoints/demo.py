"""Demo mode endpoints."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_async_session
from app.core.security import get_current_user
from app.models.user import User
from app.models.demo import DemoAccount
from app.services.demo_data import DemoDataService

router = APIRouter()


Persona = Literal["creator", "agency_creators", "agency_businesses"]


@router.post("/demo/initialize/{user_id}")
async def initialize_demo_mode(
    user_id: str,
    persona_type: Persona,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
):
    """Initialize demo mode for a user with specific persona."""
    if str(current_user.id) != user_id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Forbidden")

    service = DemoDataService(db)
    account = await service.initialize_persona(current_user.email, persona_type)

    # Mark user as demo access for 24h
    current_user.access_status = "demo_access"
    current_user.demo_access_type = persona_type
    current_user.demo_requested = True
    current_user.demo_requested_at = datetime.utcnow()
    await db.commit()

    return {"message": "Demo initialized", "account_id": str(account.id)}


@router.post("/demo/simulate-activity")
async def simulate_activity(
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
):
    """Simulate new comments/activity for demo accounts."""
    res = await db.execute(select(DemoAccount).where(DemoAccount.email == current_user.email))
    account = res.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Demo account not found")

    service = DemoDataService(db)
    result = await service.simulate_new_activity(account)
    return {"message": "Activity simulated", **result}


@router.get("/demo/reset/{user_id}")
async def reset_demo_data(
    user_id: str,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
):
    """Reset demo data to initial state."""
    if str(current_user.id) != user_id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Forbidden")

    service = DemoDataService(db)
    ok = await service.reset_account(current_user.email)
    if not ok:
        raise HTTPException(status_code=404, detail="No demo data to reset")
    return {"message": "Demo data cleared"}
