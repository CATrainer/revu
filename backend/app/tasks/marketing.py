from __future__ import annotations

from typing import Dict, Optional
from loguru import logger
from sqlalchemy import select, func
from datetime import datetime

from app.core.celery import celery_app
from app.core.config import settings
from app.core.database import async_session_maker
from app.models.user import User
from app.services.sendgrid_marketing import marketing_client


async def _compute_waitlist_position(session, user: User) -> Optional[int]:
    """Compute 1-based waitlist rank for a user among waiting statuses by join/create time.

    Returns None if anchor timestamp is missing (unlikely for waitlist users).
    """
    waiting_status = ("waiting", "waiting_list")
    anchor = user.joined_waiting_list_at or user.created_at
    if not anchor:
        return None
    res = await session.execute(
        select(func.count()).where(
            User.access_status.in_(waiting_status),
            func.coalesce(User.joined_waiting_list_at, User.created_at) <= anchor,
        )
    )
    count_before_or_equal = int(res.scalar() or 0)
    # 1-based rank
    return max(count_before_or_equal, 1)


def _build_custom_fields_for_user(
    u: User,
    *,
    waitlist_position: Optional[int],
) -> Dict:
    """Map app fields to SendGrid Marketing custom fields using configured field IDs.

    SendGrid expects custom_fields to be a dict of { field_id: value }.
    Field IDs look like e1_T (text), e2_N (number), e3_D (date).
    """
    cf: Dict[str, object] = {}
    if settings.SENDGRID_CF_WAITLIST_POSITION and waitlist_position is not None:
        cf[settings.SENDGRID_CF_WAITLIST_POSITION] = waitlist_position
    if settings.SENDGRID_CF_ACCESS_STATUS:
        cf[settings.SENDGRID_CF_ACCESS_STATUS] = u.access_status or "waiting"
    if settings.SENDGRID_CF_USER_KIND:
        cf[settings.SENDGRID_CF_USER_KIND] = getattr(u, "user_kind", None) or "content"
    if settings.SENDGRID_CF_JOINED_WAITLIST_AT and (u.joined_waiting_list_at or u.created_at):
        # Format as YYYY-MM-DD
        dt = (u.joined_waiting_list_at or u.created_at)
        cf[settings.SENDGRID_CF_JOINED_WAITLIST_AT] = dt.date().isoformat()
    if settings.SENDGRID_CF_PLANNED_LAUNCH_DATE and settings.PLANNED_LAUNCH_DATE:
        # Expecting YYYY-MM-DD in env; SendGrid date field accepts this
        cf[settings.SENDGRID_CF_PLANNED_LAUNCH_DATE] = settings.PLANNED_LAUNCH_DATE

    return {
        # Example for first/last name if you add standard fields later
        # "first_name": (u.full_name or "").split(" ")[0] if u.full_name else None,
        # "last_name": " ".join((u.full_name or "").split(" ")[1:]) if u.full_name and " " in u.full_name else None,
        "custom_fields": cf,
    }


@celery_app.task(name="app.tasks.marketing.sync_contact")
def sync_contact(email: str) -> bool:
    """Upsert a single user as a marketing contact in SendGrid."""
    try:
        list_id_cfg = getattr(settings, "SENDGRID_MARKETING_LIST_ID", None)
        # Make a lightweight DB fetch for any extra fields
        async def _run() -> bool:
            async with async_session_maker() as session:
                res = await session.execute(select(User).where(User.email == email))
                u = res.scalar_one_or_none()
                if not u:
                    logger.warning("sync_contact: user not found for {}", email)
                    return False
                # Compute waitlist position
                pos = await _compute_waitlist_position(session, u)
                fields = _build_custom_fields_for_user(u, waitlist_position=pos)
                # Attach to list only if user consented
                list_id = list_id_cfg if bool(getattr(u, "marketing_opt_in", False)) else None
                return bool(marketing_client.upsert_contact(email, custom_fields=fields.get("custom_fields"), list_id=list_id))
        import asyncio
        return asyncio.get_event_loop().run_until_complete(_run())
    except Exception as e:  # noqa: BLE001
        logger.error("sync_contact exception for {}: {}", email, e)
        return False


@celery_app.task(name="app.tasks.marketing.sync_all_contacts")
def sync_all_contacts(limit: int = 1000) -> Dict[str, int]:
    """Batch upsert all users to SendGrid Marketing."""
    added = 0
    failed = 0

    async def _run() -> None:
        nonlocal added, failed
        async with async_session_maker() as session:
            # You can filter here to only waiting list or active users
            res = await session.execute(select(User).order_by(User.created_at.asc()).limit(limit))
            users = list(res.scalars())
            list_id_cfg = getattr(settings, "SENDGRID_MARKETING_LIST_ID", None)
            for u in users:
                pos = await _compute_waitlist_position(session, u)
                fields = _build_custom_fields_for_user(u, waitlist_position=pos)
                list_id = list_id_cfg if bool(getattr(u, "marketing_opt_in", False)) else None
                ok = marketing_client.upsert_contact(u.email, custom_fields=fields.get("custom_fields"), list_id=list_id)
                if ok:
                    added += 1
                else:
                    failed += 1

    import asyncio
    try:
        asyncio.get_event_loop().run_until_complete(_run())
    except RuntimeError:
        asyncio.run(_run())
    except Exception as e:  # noqa: BLE001
        logger.error("sync_all_contacts fatal: {}", e)

    return {"added": added, "failed": failed}
