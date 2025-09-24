from __future__ import annotations

from typing import List, Dict, Any
import base64
from datetime import datetime, timezone
from fastapi import APIRouter, Request, HTTPException
from loguru import logger
from nacl.signing import VerifyKey
from nacl.exceptions import BadSignatureError
from sqlalchemy import select
from app.core.config import settings
from app.core.database import async_session_maker
from app.models.user import User

router = APIRouter()


@router.post("/sendgrid/events")
async def sendgrid_events(request: Request) -> Dict[str, Any]:
    """
    Receive SendGrid Event Webhook notifications.

    For security, you should verify the signature using Twilio's Email Event Webhook
    public key (Ed25519). This handler currently logs events without verification.
    Consider adding verification with PyNaCl and a SENDGRID_WEBHOOK_PUBLIC_KEY env var.
    """
    raw_body: bytes = await request.body()

    # Optional: Verify signature if public key is configured
    pub_key_b64 = getattr(settings, "SENDGRID_WEBHOOK_PUBLIC_KEY", None)
    if pub_key_b64:
        sig_hdr = (
            request.headers.get("X-Twilio-Email-Event-Webhook-Signature")
            or request.headers.get("x-twilio-email-event-webhook-signature")
        )
        ts_hdr = (
            request.headers.get("X-Twilio-Email-Event-Webhook-Timestamp")
            or request.headers.get("x-twilio-email-event-webhook-timestamp")
        )
        if not sig_hdr or not ts_hdr:
            raise HTTPException(status_code=400, detail="Missing signature headers")
        try:
            verify_key = VerifyKey(base64.b64decode(pub_key_b64))
            signed_data = ts_hdr.encode("utf-8") + raw_body
            signature = base64.b64decode(sig_hdr)
            verify_key.verify(signed_data, signature)
        except BadSignatureError:
            raise HTTPException(status_code=400, detail="Invalid webhook signature")
        except Exception as e:  # noqa: BLE001
            raise HTTPException(status_code=400, detail=f"Verification error: {e}")
    else:
        logger.warning("SENDGRID_WEBHOOK_PUBLIC_KEY not set; accepting events without verification")

    # Parse JSON now that we've optionally verified the payload
    try:
        events: List[Dict[str, Any]] = await request.json()
        if not isinstance(events, list):
            raise ValueError("Expected a JSON array of events")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid payload: {e}")

    # Process and persist relevant events
    async with async_session_maker() as session:
        for ev in events:
            event_type = ev.get("event")
            email = ev.get("email")
            ts = ev.get("timestamp")
            when = None
            try:
                if isinstance(ts, (int, float)):
                    when = datetime.fromtimestamp(float(ts), tz=timezone.utc)
            except Exception:
                when = datetime.now(timezone.utc)

            logger.info(
                "SendGrid event: type={} email={} data={}",
                event_type,
                email,
                {k: v for k, v in ev.items() if k not in ("sg_message_id", "sg_event_id")},
            )

            if not email:
                continue

            try:
                res = await session.execute(select(User).where(User.email == email))
                user = res.scalar_one_or_none()
                if not user:
                    continue

                user.marketing_last_event = event_type
                user.marketing_last_event_at = when or datetime.now(timezone.utc)

                if event_type in ("unsubscribe", "group_unsubscribe", "spamreport"):
                    user.marketing_opt_in = False
                    user.marketing_unsubscribed_at = when or datetime.now(timezone.utc)
                elif event_type in ("bounce", "blocked", "invalid"):
                    user.marketing_bounced_at = when or datetime.now(timezone.utc)
                # delivered/open/click just update last_event fields above

                await session.commit()
            except Exception as e:  # noqa: BLE001
                logger.error("Failed to persist SendGrid event for {}: {}", email, e)

    return {"received": len(events)}
