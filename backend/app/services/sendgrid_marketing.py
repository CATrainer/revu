from __future__ import annotations

from typing import Dict, Any, Optional
from loguru import logger

from app.core.config import settings

try:
    from sendgrid import SendGridAPIClient
except Exception:  # pragma: no cover
    SendGridAPIClient = None  # type: ignore


class SendGridMarketing:
    """Lightweight wrapper around SendGrid Marketing Contacts API.

    Docs: https://docs.sendgrid.com/api-reference/contacts/add-or-update-a-contact
    """

    def __init__(self, api_key: Optional[str] = None) -> None:
        self.api_key = api_key or getattr(settings, "SENDGRID_API_KEY", None)
        if not self.api_key:
            logger.warning("SENDGRID_API_KEY missing; marketing sync will be a no-op")
        self._client = SendGridAPIClient(self.api_key) if self.api_key and SendGridAPIClient else None

    def upsert_contact(self, email: str, custom_fields: Optional[Dict[str, Any]] = None, list_id: Optional[str] = None) -> bool:
        """
        Upsert a single contact.
        Optionally attach to a Marketing List via list_id.
        """
        if not self._client:
            logger.warning("SendGrid client unavailable; skipping contact upsert for {}", email)
            return False

        body: Dict[str, Any] = {
            "contacts": [
                {
                    "email": email,
                    # Add other top-level fields here if desired (first_name, last_name)
                }
            ]
        }
        if custom_fields:
            body["contacts"][0].update(custom_fields)
        if list_id:
            body["list_ids"] = [list_id]

        try:
            resp = self._client.client.marketing.contacts.put(request_body=body)
            ok = 200 <= int(resp.status_code) < 300
            if not ok:
                logger.error("SendGrid upsert failed status={} body={}", resp.status_code, getattr(resp, "body", b"").decode("utf-8", "ignore") if getattr(resp, "body", None) else "<empty>")
            else:
                logger.info("SendGrid contact upserted: {} (status={})", email, resp.status_code)
            return ok
        except Exception as e:  # noqa: BLE001
            logger.error("SendGrid upsert exception for {}: {}", email, e)
            return False


marketing_client = SendGridMarketing()
