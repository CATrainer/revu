"""
Calendly webhook handlers.

Handles Calendly webhook events to automatically update user records.
"""

from fastapi import APIRouter, Request, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
import json
import os
import hmac
import hashlib

from app.core.database import get_async_session
from app.models.user import User

router = APIRouter()


@router.post("/calendly")
async def calendly_webhook(
    request: Request,
    db: AsyncSession = Depends(get_async_session),
):
    """
    Handle Calendly webhook events.
    
    Events we handle:
    - invitee.created: When someone schedules a demo
    - invitee.canceled: When someone cancels a demo
    """
    try:
        # Get request body for signature verification
        body = await request.body()
        
        # Verify webhook signature (optional but recommended for production)
        signature = request.headers.get('calendly-webhook-signature', '')
        if not verify_webhook_signature(signature, body):
            print("Invalid webhook signature")
            # In production, you might want to reject invalid signatures
            # raise HTTPException(status_code=401, detail="Invalid signature")
        
        # Parse the JSON payload
        payload = json.loads(body.decode('utf-8'))
        event = payload.get('event')
        
        if event == 'invitee.created':
            await handle_demo_scheduled(payload, db)
        elif event == 'invitee.canceled':
            await handle_demo_canceled(payload, db)
        
        return {"status": "ok", "event": event}
    
    except Exception as e:
        print(f"Webhook error: {e}")
        # Return 200 to avoid Calendly retrying
        return {"status": "error", "message": str(e)}


async def handle_demo_scheduled(payload: dict, db: AsyncSession):
    """Update user when demo is scheduled via Calendly."""
    try:
        invitee_data = payload.get('payload', {})
        email = invitee_data.get('email')
        scheduled_event = invitee_data.get('scheduled_event', {})
        start_time = scheduled_event.get('start_time')
        
        if not email or not start_time:
            print("Missing email or start_time in webhook payload")
            return
        
        # Find user by email
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        
        if user:
            # Parse ISO datetime string to datetime object
            scheduled_datetime = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
            user.demo_scheduled_at = scheduled_datetime
            
            await db.commit()
            print(f"Updated demo scheduled time for user {email}: {scheduled_datetime}")
        else:
            print(f"User not found for email: {email}")
            
    except Exception as e:
        print(f"Error handling demo scheduled: {e}")


async def handle_demo_canceled(payload: dict, db: AsyncSession):
    """Handle demo cancellation via Calendly."""
    try:
        invitee_data = payload.get('payload', {})
        email = invitee_data.get('email')
        
        if not email:
            print("Missing email in cancellation webhook payload")
            return
        
        # Find user by email
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        
        if user:
            user.demo_scheduled_at = None
            await db.commit()
            print(f"Cleared demo scheduled time for user {email}")
        else:
            print(f"User not found for email: {email}")
            
    except Exception as e:
        print(f"Error handling demo canceled: {e}")


def verify_webhook_signature(signature: str, body: bytes) -> bool:
    """
    Verify Calendly webhook signature for security.
    
    Returns True if signature is valid, False otherwise.
    If no webhook secret is configured, returns True (allows webhook).
    """
    webhook_secret = os.getenv("CALENDLY_WEBHOOK_SECRET")
    if not webhook_secret:
        print("No CALENDLY_WEBHOOK_SECRET configured - skipping signature verification")
        return True
    
    if not signature:
        print("No signature provided in webhook request")
        return False
    
    try:
        # Calendly sends signature as: calendly-signature=<signature>
        if signature.startswith('calendly-signature='):
            signature = signature.replace('calendly-signature=', '')
        
        # Calculate expected signature
        expected = hmac.new(
            webhook_secret.encode('utf-8'),
            body,
            hashlib.sha256
        ).hexdigest()
        
        # Compare signatures securely
        return hmac.compare_digest(signature, expected)
        
    except Exception as e:
        print(f"Error verifying webhook signature: {e}")
        return False
