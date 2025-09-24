from __future__ import annotations

from typing import Dict
from loguru import logger
from sqlalchemy import select, func

from app.core.celery import celery_app
from app.core.config import settings
from app.core.database import async_session_maker
from app.models.user import User
from app.services.sendgrid_marketing import marketing_client


def _contact_fields_for_user(u: User) -> Dict:
    # Map app fields to SendGrid marketing contact custom fields / standard fields
    # Standard fields we set: email (in contacts list)
    # Custom fields can be configured in SendGrid if needed.
    # For now, we include metadata in reserved fields if SendGrid accepts them; otherwise rely on lists & segments.
    return {
        # SendGrid allows additional top-level keys like first_name/last_name if configured
        # "first_name": (u.full_name or "").split(" ")[0] if u.full_name else None,
        # "last_name": " ".join((u.full_name or "").split(" ")[1:]) if u.full_name and " " in u.full_name else None,
        "custom_fields": {
            # If you create custom fields in SendGrid UI, map their IDs here, e.g., e1_T for text fields
            # Example placeholder (requires corresponding custom field IDs in SendGrid):
            # "e1_T": u.user_kind or "content",
        }
    }


@celery_app.task(name="app.tasks.marketing.sync_contact")
def sync_contact(email: str) -> bool:
    """Upsert a single user as a marketing contact in SendGrid."""
    try:
        list_id = getattr(settings, "SENDGRID_MARKETING_LIST_ID", None)
        # Make a lightweight DB fetch for any extra fields
        async def _run() -> bool:
            async with async_session_maker() as session:
                res = await session.execute(select(User).where(User.email == email))
                u = res.scalar_one_or_none()
                if not u:
                    logger.warning("sync_contact: user not found for {}", email)
                    return False
                fields = _contact_fields_for_user(u)
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
            list_id = getattr(settings, "SENDGRID_MARKETING_LIST_ID", None)
            for u in users:
                ok = marketing_client.upsert_contact(u.email, custom_fields=_contact_fields_for_user(u).get("custom_fields"), list_id=list_id)
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
