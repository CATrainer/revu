"""Seed demo users for social media focus (simplified version)."""
import os
import sys
from pathlib import Path

# Ensure backend root is on sys.path when executing this script directly
CURRENT_DIR = Path(__file__).resolve().parent
BACKEND_ROOT = CURRENT_DIR.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))
import asyncio
from datetime import datetime
from typing import Optional

from loguru import logger
from sqlalchemy import select

from app.core.database import async_session_maker
from app.core.security import get_password_hash
from app.models.user import User

DEMO_PASSWORD = "Demo2025!"


async def get_or_create_user(db, email: str, full_name: str, is_admin: bool = False, access_status: str = "demo_access", demo_access_type: Optional[str] = None) -> User:
    res = await db.execute(select(User).where(User.email == email))
    user = res.scalar_one_or_none()
    if user:
        return user
    user = User(
        email=email,
        full_name=full_name,
        hashed_password=get_password_hash(DEMO_PASSWORD),
        is_active=True,
        is_admin=is_admin,
        access_status=access_status,
        demo_access_type=demo_access_type,
        joined_waiting_list_at=datetime.utcnow(),
        early_access_granted_at=None,
    )
    db.add(user)
    await db.flush()
    return user


async def main():
    async with async_session_maker() as db:
        # Ensure admin user exists
        await get_or_create_user(db, "admin@revu.dev", "Revu Admin", is_admin=True, access_status="full_access")

        # Demo users for social media focus
        await get_or_create_user(db, "demo+creator@revu.app", "Demo Creator", access_status="demo_access", demo_access_type="creator")
        await get_or_create_user(db, "demo+business@revu.app", "Demo Business", access_status="demo_access", demo_access_type="business")
        await get_or_create_user(db, "demo+agency@revu.app", "Demo Agency", access_status="demo_access", demo_access_type="agency_creators")

        await db.commit()
        logger.info("Seeded demo users for social media focus.")


if __name__ == "__main__":
    asyncio.run(main())
