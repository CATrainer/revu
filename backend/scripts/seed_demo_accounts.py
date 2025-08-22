"""Seed four demo accounts with access and memberships."""
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
from app.models.organization import Organization
from app.models.location import Location
from app.models.user import User, UserMembership

DEMO_PASSWORD = "Demo2025!"


async def get_or_create_org(db, name: str, type_: str) -> Organization:
    res = await db.execute(select(Organization).where(Organization.name == name))
    org = res.scalar_one_or_none()
    if org:
        return org
    org = Organization(name=name, type=type_, subscription_tier="professional")
    db.add(org)
    await db.flush()
    return org


async def get_or_create_location(db, org_id, name: str, kind: str) -> Location:
    res = await db.execute(select(Location).where(Location.organization_id == org_id, Location.name == name))
    loc = res.scalar_one_or_none()
    if loc:
        return loc
    loc = Location(organization_id=org_id, name=name, kind=kind)
    db.add(loc)
    await db.flush()
    return loc


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


async def get_or_create_membership(db, user_id, org_id, role: str, location_id=None):
    res = await db.execute(
        select(UserMembership).where(
            UserMembership.user_id == user_id,
            UserMembership.organization_id == org_id,
            UserMembership.location_id == location_id,
        )
    )
    m = res.scalar_one_or_none()
    if m:
        return m
    m = UserMembership(user_id=user_id, organization_id=org_id, role=role, location_id=location_id, permissions={})
    db.add(m)
    await db.flush()
    return m


async def main():
    async with async_session_maker() as db:
        # Ensure admin user exists
        await get_or_create_user(db, "admin@revu.dev", "Revu Admin", is_admin=True, access_status="full_access")

        # Business org and user
        biz_org = await get_or_create_org(db, "Demo Bistro", "business")
        await get_or_create_location(db, biz_org.id, "Downtown", "business_location")
        biz_user = await get_or_create_user(db, "demo+business@revu.app", "Demo Business", access_status="demo_access", demo_access_type="business")
        await get_or_create_membership(db, biz_user.id, biz_org.id, "owner")

        # Creator as individual (modeled as business with one location)
        creator_org = await get_or_create_org(db, "Alex The Foodie", "business")
        await get_or_create_location(db, creator_org.id, "Main Channel", "business_location")
        creator_user = await get_or_create_user(db, "demo+creator@revu.app", "Demo Creator", access_status="demo_access", demo_access_type="creator")
        await get_or_create_membership(db, creator_user.id, creator_org.id, "owner")

        # Agency (creators flavor)
        agency_creators = await get_or_create_org(db, "Demo Agency - Creators", "agency")
        c1 = await get_or_create_location(db, agency_creators.id, "TechTuber Tim", "agency_client")
        await get_or_create_location(db, agency_creators.id, "Yoga With Mia", "agency_client")
        agency_user = await get_or_create_user(db, "demo+agency@revu.app", "Demo Agency (Creators)", access_status="demo_access", demo_access_type="agency_creators")
        await get_or_create_membership(db, agency_user.id, agency_creators.id, "owner")
        # Manager with limited scope example
        manager = await get_or_create_user(db, "manager+agency@revu.app", "Agency Manager", access_status="early_access")
        await get_or_create_membership(db, manager.id, agency_creators.id, "manager", c1.id)

        # Agency (businesses flavor)
        agency_biz = await get_or_create_org(db, "Demo Agency - Businesses", "agency")
        await get_or_create_location(db, agency_biz.id, "Cafe Roma", "agency_client")
        await get_or_create_location(db, agency_biz.id, "Bella Nails", "agency_client")
        agency_biz_user = await get_or_create_user(db, "demo+agency-biz@revu.app", "Demo Agency (Businesses)", access_status="demo_access", demo_access_type="agency_businesses")
        await get_or_create_membership(db, agency_biz_user.id, agency_biz.id, "owner")

        await db.commit()
        logger.info("Seeded demo accounts and memberships.")


if __name__ == "__main__":
    asyncio.run(main())
