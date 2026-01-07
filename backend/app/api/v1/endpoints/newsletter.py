"""
Newsletter subscription endpoints.

Handles subscribing to changelog updates and other newsletters via SendGrid.
"""

import os
from datetime import datetime
from typing import Any, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from loguru import logger
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.core.security import get_current_user, get_optional_current_user
from app.models.user import User
from app.models.support_ticket import NewsletterSubscription

router = APIRouter()


# ============================================
# Schemas
# ============================================

class SubscribeRequest(BaseModel):
    """Request to subscribe to newsletter."""
    email: EmailStr
    lists: List[str] = Field(default=["changelog_updates"])


class SubscriptionStatus(BaseModel):
    """Subscription status response."""
    subscribed: bool
    email: Optional[str] = None
    lists: List[str] = []


# ============================================
# SendGrid Integration
# ============================================

async def add_to_sendgrid(email: str, lists: List[str]) -> Optional[str]:
    """
    Add email to SendGrid marketing contacts.
    Returns SendGrid contact ID on success.
    """
    try:
        import httpx
        
        sendgrid_api_key = os.environ.get("SENDGRID_API_KEY")
        if not sendgrid_api_key:
            logger.warning("SendGrid API key not configured")
            return None
        
        # SendGrid Marketing Contacts API
        async with httpx.AsyncClient() as client:
            # Add contact to SendGrid
            response = await client.put(
                "https://api.sendgrid.com/v3/marketing/contacts",
                headers={
                    "Authorization": f"Bearer {sendgrid_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "contacts": [
                        {
                            "email": email,
                            "custom_fields": {
                                "changelog_updates": "changelog_updates" in lists,
                                "product_news": "product_news" in lists
                            }
                        }
                    ]
                }
            )
            
            if response.status_code in [200, 202]:
                data = response.json()
                logger.info(f"Added {email} to SendGrid contacts")
                return data.get("job_id")
            else:
                logger.error(f"SendGrid API error: {response.status_code} - {response.text}")
                return None
                
    except ImportError:
        logger.warning("httpx not installed, skipping SendGrid integration")
        return None
    except Exception as e:
        logger.error(f"Error adding to SendGrid: {e}")
        return None


# ============================================
# Endpoints
# ============================================

@router.get("/status", response_model=SubscriptionStatus)
async def get_subscription_status(
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    """Check if current user is subscribed to newsletters."""
    if not current_user:
        return SubscriptionStatus(subscribed=False)
    
    try:
        result = await db.execute(
            select(NewsletterSubscription)
            .where(NewsletterSubscription.email == current_user.email)
            .where(NewsletterSubscription.is_active == True)
        )
        subscription = result.scalar_one_or_none()
        
        if not subscription:
            return SubscriptionStatus(subscribed=False, email=current_user.email)
        
        lists = []
        if subscription.changelog_updates:
            lists.append("changelog_updates")
        if subscription.product_news:
            lists.append("product_news")
        
        return SubscriptionStatus(
            subscribed=True,
            email=subscription.email,
            lists=lists
        )
        
    except Exception as e:
        logger.error(f"Error checking subscription status: {e}")
        return SubscriptionStatus(subscribed=False)


@router.post("/subscribe", response_model=SubscriptionStatus)
async def subscribe_to_newsletter(
    request: SubscribeRequest,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    """Subscribe an email to the newsletter."""
    try:
        # Check if already subscribed
        result = await db.execute(
            select(NewsletterSubscription)
            .where(NewsletterSubscription.email == request.email)
        )
        existing = result.scalar_one_or_none()
        
        if existing:
            if existing.is_active:
                return SubscriptionStatus(
                    subscribed=True,
                    email=existing.email,
                    lists=["changelog_updates"] if existing.changelog_updates else []
                )
            else:
                # Reactivate subscription
                existing.is_active = True
                existing.unsubscribed_at = None
                existing.changelog_updates = "changelog_updates" in request.lists
                existing.product_news = "product_news" in request.lists
                await db.commit()
        else:
            # Create new subscription
            subscription = NewsletterSubscription(
                email=request.email,
                user_id=current_user.id if current_user else None,
                changelog_updates="changelog_updates" in request.lists,
                product_news="product_news" in request.lists,
            )
            db.add(subscription)
            await db.commit()
            
            existing = subscription
        
        # Add to SendGrid
        sendgrid_id = await add_to_sendgrid(request.email, request.lists)
        if sendgrid_id and existing:
            existing.sendgrid_contact_id = sendgrid_id
            await db.commit()
        
        logger.info(f"Subscribed {request.email} to newsletter")
        
        return SubscriptionStatus(
            subscribed=True,
            email=request.email,
            lists=request.lists
        )
        
    except Exception as e:
        logger.error(f"Error subscribing to newsletter: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to subscribe"
        )


@router.post("/unsubscribe")
async def unsubscribe_from_newsletter(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    """Unsubscribe current user from newsletter."""
    try:
        result = await db.execute(
            select(NewsletterSubscription)
            .where(NewsletterSubscription.email == current_user.email)
        )
        subscription = result.scalar_one_or_none()
        
        if subscription:
            subscription.is_active = False
            subscription.unsubscribed_at = datetime.utcnow()
            await db.commit()
            
            logger.info(f"Unsubscribed {current_user.email} from newsletter")
        
        return {"success": True, "message": "Unsubscribed successfully"}
        
    except Exception as e:
        logger.error(f"Error unsubscribing from newsletter: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to unsubscribe"
        )
