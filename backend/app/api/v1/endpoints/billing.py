"""
Billing API endpoints for subscription management.
"""

import logging
from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Request, Header
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.subscription import (
    SubscriptionPlan,
    UserSubscription,
    SubscriptionInvoice,
    PaymentMethod,
    SubscriptionStatus,
    SubscriptionPlanType,
)
from app.services.stripe_service import StripeService

logger = logging.getLogger(__name__)
router = APIRouter()


# ==========================================
# Schemas
# ==========================================

class SubscriptionPlanResponse(BaseModel):
    """Schema for subscription plan response."""
    id: UUID
    name: str
    plan_type: SubscriptionPlanType
    description: Optional[str]
    price_monthly: float
    price_yearly: Optional[float]
    currency: str
    features: List[str]
    max_creators: Optional[int]
    max_campaigns: Optional[int]
    max_ai_messages_monthly: Optional[int]
    is_popular: bool
    stripe_price_id_monthly: Optional[str]
    stripe_price_id_yearly: Optional[str]

    class Config:
        from_attributes = True


class UserSubscriptionResponse(BaseModel):
    """Schema for user subscription response."""
    id: UUID
    status: SubscriptionStatus
    plan_name: Optional[str]
    plan_type: Optional[SubscriptionPlanType]
    billing_interval: Optional[str]
    current_period_end: Optional[str]
    cancel_at_period_end: bool
    is_active: bool
    is_trial: bool
    days_until_renewal: Optional[int]

    class Config:
        from_attributes = True


class InvoiceResponse(BaseModel):
    """Schema for invoice response."""
    id: UUID
    invoice_number: Optional[str]
    status: str
    amount_due: float
    amount_paid: float
    currency: str
    invoice_date: str
    paid_at: Optional[str]
    invoice_pdf_url: Optional[str]
    hosted_invoice_url: Optional[str]

    class Config:
        from_attributes = True


class PaymentMethodResponse(BaseModel):
    """Schema for payment method response."""
    id: UUID
    type: str
    brand: Optional[str]
    last4: Optional[str]
    exp_month: Optional[int]
    exp_year: Optional[int]
    is_default: bool

    class Config:
        from_attributes = True


class CreateCheckoutRequest(BaseModel):
    """Request for creating a checkout session."""
    price_id: str = Field(..., description="Stripe price ID")
    success_url: str = Field(..., description="URL to redirect to on success")
    cancel_url: str = Field(..., description="URL to redirect to on cancel")
    trial_days: int = Field(default=0, ge=0, le=30, description="Trial period in days")


class StartTrialRequest(BaseModel):
    """Request for starting a creator's 30-day free trial."""
    success_url: str = Field(..., description="URL to redirect to on success")
    cancel_url: str = Field(..., description="URL to redirect to on cancel")


class CreateCheckoutResponse(BaseModel):
    """Response for checkout session creation."""
    session_id: str
    url: str


class CreatePortalRequest(BaseModel):
    """Request for creating a customer portal session."""
    return_url: str = Field(..., description="URL to redirect back to")


class CreatePortalResponse(BaseModel):
    """Response for portal session creation."""
    url: str


class BillingOverviewResponse(BaseModel):
    """Complete billing overview for the user."""
    subscription: Optional[UserSubscriptionResponse]
    payment_methods: List[PaymentMethodResponse]
    recent_invoices: List[InvoiceResponse]
    available_plans: List[SubscriptionPlanResponse]


# ==========================================
# Endpoints
# ==========================================

@router.get("/plans", response_model=List[SubscriptionPlanResponse])
async def get_subscription_plans(
    db: AsyncSession = Depends(get_db),
):
    """
    Get all available subscription plans.
    Public endpoint - no authentication required.
    """
    plans = await StripeService.get_subscription_plans(db)
    return [
        SubscriptionPlanResponse(
            id=plan.id,
            name=plan.name,
            plan_type=plan.plan_type,
            description=plan.description,
            price_monthly=float(plan.price_monthly),
            price_yearly=float(plan.price_yearly) if plan.price_yearly else None,
            currency=plan.currency,
            features=plan.features or [],
            max_creators=plan.max_creators,
            max_campaigns=plan.max_campaigns,
            max_ai_messages_monthly=plan.max_ai_messages_monthly,
            is_popular=plan.is_popular,
            stripe_price_id_monthly=plan.stripe_price_id_monthly,
            stripe_price_id_yearly=plan.stripe_price_id_yearly,
        )
        for plan in plans
    ]


@router.get("/overview", response_model=BillingOverviewResponse)
async def get_billing_overview(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get complete billing overview for the current user.
    Includes subscription, payment methods, invoices, and available plans.
    """
    # Get subscription
    subscription = await StripeService.get_user_subscription(db, current_user.id)
    
    # Get payment methods
    payment_methods = await StripeService.get_user_payment_methods(db, current_user.id)
    
    # Get recent invoices
    invoices = await StripeService.get_user_invoices(db, current_user.id, limit=10)
    
    # Get available plans
    plans = await StripeService.get_subscription_plans(db)
    
    # Format subscription response
    subscription_response = None
    if subscription:
        subscription_response = UserSubscriptionResponse(
            id=subscription.id,
            status=subscription.status,
            plan_name=subscription.plan.name if subscription.plan else None,
            plan_type=subscription.plan.plan_type if subscription.plan else None,
            billing_interval=subscription.billing_interval,
            current_period_end=subscription.current_period_end.isoformat() if subscription.current_period_end else None,
            cancel_at_period_end=subscription.cancel_at_period_end,
            is_active=subscription.is_active,
            is_trial=subscription.is_trial,
            days_until_renewal=subscription.days_until_renewal,
        )
    
    # Format payment methods response
    payment_method_responses = [
        PaymentMethodResponse(
            id=pm.id,
            type=pm.type,
            brand=pm.brand,
            last4=pm.last4,
            exp_month=pm.exp_month,
            exp_year=pm.exp_year,
            is_default=pm.is_default,
        )
        for pm in payment_methods
    ]
    
    # Format invoices response
    invoice_responses = [
        InvoiceResponse(
            id=inv.id,
            invoice_number=inv.invoice_number,
            status=inv.status,
            amount_due=float(inv.amount_due),
            amount_paid=float(inv.amount_paid),
            currency=inv.currency,
            invoice_date=inv.invoice_date.isoformat(),
            paid_at=inv.paid_at.isoformat() if inv.paid_at else None,
            invoice_pdf_url=inv.invoice_pdf_url,
            hosted_invoice_url=inv.hosted_invoice_url,
        )
        for inv in invoices
    ]
    
    # Format plans response
    plan_responses = [
        SubscriptionPlanResponse(
            id=plan.id,
            name=plan.name,
            plan_type=plan.plan_type,
            description=plan.description,
            price_monthly=float(plan.price_monthly),
            price_yearly=float(plan.price_yearly) if plan.price_yearly else None,
            currency=plan.currency,
            features=plan.features or [],
            max_creators=plan.max_creators,
            max_campaigns=plan.max_campaigns,
            max_ai_messages_monthly=plan.max_ai_messages_monthly,
            is_popular=plan.is_popular,
            stripe_price_id_monthly=plan.stripe_price_id_monthly,
            stripe_price_id_yearly=plan.stripe_price_id_yearly,
        )
        for plan in plans
    ]
    
    return BillingOverviewResponse(
        subscription=subscription_response,
        payment_methods=payment_method_responses,
        recent_invoices=invoice_responses,
        available_plans=plan_responses,
    )


@router.get("/subscription", response_model=Optional[UserSubscriptionResponse])
async def get_current_subscription(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the current user's subscription details."""
    subscription = await StripeService.get_user_subscription(db, current_user.id)
    
    if not subscription:
        return None
    
    return UserSubscriptionResponse(
        id=subscription.id,
        status=subscription.status,
        plan_name=subscription.plan.name if subscription.plan else None,
        plan_type=subscription.plan.plan_type if subscription.plan else None,
        billing_interval=subscription.billing_interval,
        current_period_end=subscription.current_period_end.isoformat() if subscription.current_period_end else None,
        cancel_at_period_end=subscription.cancel_at_period_end,
        is_active=subscription.is_active,
        is_trial=subscription.is_trial,
        days_until_renewal=subscription.days_until_renewal,
    )


@router.get("/invoices", response_model=List[InvoiceResponse])
async def get_invoices(
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the current user's invoices."""
    invoices = await StripeService.get_user_invoices(db, current_user.id, limit=min(limit, 50))
    
    return [
        InvoiceResponse(
            id=inv.id,
            invoice_number=inv.invoice_number,
            status=inv.status,
            amount_due=float(inv.amount_due),
            amount_paid=float(inv.amount_paid),
            currency=inv.currency,
            invoice_date=inv.invoice_date.isoformat(),
            paid_at=inv.paid_at.isoformat() if inv.paid_at else None,
            invoice_pdf_url=inv.invoice_pdf_url,
            hosted_invoice_url=inv.hosted_invoice_url,
        )
        for inv in invoices
    ]


@router.get("/payment-methods", response_model=List[PaymentMethodResponse])
async def get_payment_methods(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the current user's payment methods."""
    payment_methods = await StripeService.get_user_payment_methods(db, current_user.id)
    
    return [
        PaymentMethodResponse(
            id=pm.id,
            type=pm.type,
            brand=pm.brand,
            last4=pm.last4,
            exp_month=pm.exp_month,
            exp_year=pm.exp_year,
            is_default=pm.is_default,
        )
        for pm in payment_methods
    ]


@router.post("/checkout", response_model=CreateCheckoutResponse)
async def create_checkout_session(
    request: CreateCheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a Stripe Checkout session for subscription purchase.
    Returns a URL to redirect the user to.
    """
    try:
        result = await StripeService.create_checkout_session(
            db=db,
            user=current_user,
            price_id=request.price_id,
            success_url=request.success_url,
            cancel_url=request.cancel_url,
            trial_days=request.trial_days,
        )
        return CreateCheckoutResponse(**result)
    except Exception as e:
        logger.error(f"Failed to create checkout session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create checkout session"
        )


@router.post("/portal", response_model=CreatePortalResponse)
async def create_portal_session(
    request: CreatePortalRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a Stripe Customer Portal session.
    Returns a URL to redirect the user to manage their subscription.
    """
    try:
        result = await StripeService.create_portal_session(
            db=db,
            user=current_user,
            return_url=request.return_url,
        )
        return CreatePortalResponse(**result)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to create portal session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create portal session"
        )


@router.post("/start-trial", response_model=CreateCheckoutResponse)
async def start_creator_trial(
    request: StartTrialRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Start a 30-day free trial for a creator account.
    
    This endpoint:
    1. Validates the user is a creator account
    2. Checks they haven't already started a trial
    3. Creates a Stripe Checkout session with 30-day trial (card required)
    4. Returns the checkout URL to redirect the user
    
    After checkout, the Stripe webhook will:
    - Set subscription_tier to 'pro'
    - Set has_payment_method to True
    - Set trial_start_date and trial_end_date
    
    When trial expires (or payment fails), the webhook will:
    - Set subscription_tier back to 'free'
    """
    # Validate user is a creator
    if current_user.account_type != "creator":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only creator accounts can start a trial"
        )
    
    # Check if already has an active subscription or trial
    if current_user.subscription_tier == "pro":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have an active subscription or trial"
        )
    
    # Get the Creator plan price ID
    from sqlalchemy import select
    result = await db.execute(
        select(SubscriptionPlan).where(
            SubscriptionPlan.plan_type == SubscriptionPlanType.CREATOR,
            SubscriptionPlan.is_active == True
        ).limit(1)
    )
    creator_plan = result.scalar_one_or_none()
    
    if not creator_plan or not creator_plan.stripe_price_id_monthly:
        logger.error("Creator plan not found or missing Stripe price ID")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Creator plan not configured. Please contact support."
        )
    
    try:
        # Create checkout session with 30-day trial
        result = await StripeService.create_checkout_session(
            db=db,
            user=current_user,
            price_id=creator_plan.stripe_price_id_monthly,
            success_url=request.success_url,
            cancel_url=request.cancel_url,
            trial_days=30,  # 30-day free trial
        )
        
        logger.info(f"Created trial checkout session for creator {current_user.id}")
        return CreateCheckoutResponse(**result)
        
    except Exception as e:
        logger.error(f"Failed to create trial checkout session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start trial. Please try again."
        )
