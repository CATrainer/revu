"""
Stripe webhook endpoint for handling Stripe events.
"""

import logging
from fastapi import APIRouter, Request, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.stripe_service import StripeService
import stripe

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/stripe")
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Handle Stripe webhook events.
    
    Supported events:
    - checkout.session.completed: Subscription created via checkout
    - customer.subscription.updated: Subscription status/plan changed
    - customer.subscription.deleted: Subscription canceled
    - invoice.paid: Successful payment
    - invoice.payment_failed: Failed payment
    - payment_method.attached: New payment method added
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    if not sig_header:
        logger.warning("Missing Stripe signature header")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing signature header"
        )
    
    # Verify webhook signature
    try:
        event = StripeService.verify_webhook_signature(payload, sig_header)
    except ValueError as e:
        logger.error(f"Webhook configuration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Webhook configuration error"
        )
    except stripe.SignatureVerificationError as e:
        logger.warning(f"Invalid webhook signature: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid signature"
        )
    
    # Handle the event
    event_type = event.type
    logger.info(f"Processing Stripe webhook: {event_type}")
    
    try:
        if event_type == "checkout.session.completed":
            await StripeService.handle_checkout_completed(db, event)
        
        elif event_type == "customer.subscription.updated":
            await StripeService.handle_subscription_updated(db, event)
        
        elif event_type == "customer.subscription.deleted":
            await StripeService.handle_subscription_deleted(db, event)
        
        elif event_type == "invoice.paid":
            await StripeService.handle_invoice_paid(db, event)
        
        elif event_type == "invoice.payment_failed":
            await StripeService.handle_invoice_payment_failed(db, event)
        
        elif event_type == "payment_method.attached":
            await StripeService.handle_payment_method_attached(db, event)
        
        else:
            logger.info(f"Unhandled webhook event type: {event_type}")
    
    except Exception as e:
        logger.error(f"Error processing webhook {event_type}: {e}")
        # Don't raise - return 200 to avoid Stripe retries for business logic errors
        # Only raise for actual webhook issues
    
    return {"status": "success", "event_type": event_type}
