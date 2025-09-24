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
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec

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
            logger.warning("SendGrid webhook: missing signature headers")
            raise HTTPException(status_code=400, detail="Missing signature headers")

        def _pad(s: str) -> str:
            return s + "=" * (-len(s) % 4)

        def _b64decode_any(s: str) -> bytes:
            s = s.strip()
            try:
                return base64.urlsafe_b64decode(_pad(s))
            except Exception:
                return base64.b64decode(_pad(s))

        signed_data = ts_hdr.encode("utf-8") + raw_body
        signature = _b64decode_any(sig_hdr)

        key_bytes = _b64decode_any(pub_key_b64)

        # Try Ed25519 first (raw 32-byte key). If that fails, try ECDSA P-256 (DER SPKI)
        verified = False
        ed25519_error: str | None = None
        ecdsa_error: str | None = None

        # Attempt Ed25519
        try:
            if len(key_bytes) == 32:
                VerifyKey(key_bytes).verify(signed_data, signature)
                verified = True
            else:
                # Try treating provided key as SPKI for Ed25519 as well
                # Some providers may wrap Ed25519 keys in SPKI format starting with 'MCowBQYDK2VwAyE'
                try:
                    pk = serialization.load_der_public_key(key_bytes)
                    from cryptography.hazmat.primitives.asymmetric import ed25519 as crypto_ed
                    if isinstance(pk, crypto_ed.Ed25519PublicKey):
                        pk.verify(signature, signed_data)
                        verified = True
                except Exception as e:  # noqa: BLE001
                    ed25519_error = f"ed25519 spki load failed: {e}"
        except BadSignatureError:
            ed25519_error = "ed25519 signature invalid"
        except Exception as e:  # noqa: BLE001
            ed25519_error = f"ed25519 verify error: {e}"

        # Attempt ECDSA P-256 if not verified yet
        if not verified:
            try:
                pk = serialization.load_der_public_key(key_bytes)
                if isinstance(pk, ec.EllipticCurvePublicKey):
                    pk.verify(signature, signed_data, ec.ECDSA(hashes.SHA256()))
                    verified = True
                else:
                    ecdsa_error = "public key is not EC"
            except Exception as e:  # noqa: BLE001
                ecdsa_error = f"ecdsa verify error: {e}"

        if not verified:
            logger.warning(
                "SendGrid webhook: signature verification failed (ed25519_err={}, ecdsa_err={})",
                ed25519_error,
                ecdsa_error,
            )
            raise HTTPException(status_code=400, detail="Invalid webhook signature")
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
