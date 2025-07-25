"""
Webhook endpoints for external integrations.
"""

from fastapi import APIRouter, Header, HTTPException, Request
from loguru import logger

from app.core.config import settings

router = APIRouter()


@router.post("/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="Stripe-Signature"),
):
    """
    Handle Stripe webhook events.
    """
    if not stripe_signature:
        raise HTTPException(status_code=400, detail="Missing Stripe signature")
    
    # TODO: Implement Stripe webhook handling
    # 1. Verify webhook signature
    # 2. Parse event type
    # 3. Handle subscription events
    # 4. Update organization subscription status
    
    payload = await request.body()
    logger.info(f"Received Stripe webhook: {len(payload)} bytes")
    
    return {"status": "received"}


@router.post("/google-reviews")
async def google_reviews_webhook(
    request: Request,
):
    """
    Handle Google My Business push notifications.
    """
    # TODO: Implement Google webhook handling
    # This would receive real-time review notifications
    
    payload = await request.json()
    logger.info(f"Received Google webhook: {payload}")
    
    return {"status": "received"}