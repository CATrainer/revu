"""
Stripe service for handling payments and subscriptions.
"""

import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from uuid import UUID

import stripe
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.models.subscription import (
    SubscriptionPlan,
    UserSubscription,
    SubscriptionInvoice,
    PaymentMethod,
    SubscriptionStatus,
    SubscriptionPlanType,
)
from app.models.user import User

logger = logging.getLogger(__name__)
settings = get_settings()

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY


class StripeService:
    """Service for Stripe operations."""

    @staticmethod
    async def get_or_create_customer(
        db: AsyncSession,
        user: User,
    ) -> str:
        """
        Get existing Stripe customer or create a new one.
        Returns the Stripe customer ID.
        """
        # Check if user already has a subscription with customer ID
        result = await db.execute(
            select(UserSubscription)
            .where(UserSubscription.user_id == user.id)
            .where(UserSubscription.stripe_customer_id.isnot(None))
            .limit(1)
        )
        existing_sub = result.scalar_one_or_none()
        
        if existing_sub and existing_sub.stripe_customer_id:
            return existing_sub.stripe_customer_id
        
        # Create new Stripe customer
        try:
            customer = stripe.Customer.create(
                email=user.email,
                name=f"{user.first_name or ''} {user.last_name or ''}".strip() or user.email,
                metadata={
                    "user_id": str(user.id),
                    "email": user.email,
                }
            )
            logger.info(f"Created Stripe customer {customer.id} for user {user.id}")
            return customer.id
        except stripe.StripeError as e:
            logger.error(f"Failed to create Stripe customer: {e}")
            raise

    @staticmethod
    async def create_checkout_session(
        db: AsyncSession,
        user: User,
        price_id: str,
        success_url: str,
        cancel_url: str,
        trial_days: int = 0,
    ) -> Dict[str, Any]:
        """
        Create a Stripe Checkout Session for subscription.
        Returns the session URL and ID.
        """
        try:
            # Get or create customer
            customer_id = await StripeService.get_or_create_customer(db, user)
            
            session_params = {
                "customer": customer_id,
                "payment_method_types": ["card"],
                "line_items": [{
                    "price": price_id,
                    "quantity": 1,
                }],
                "mode": "subscription",
                "success_url": success_url,
                "cancel_url": cancel_url,
                "metadata": {
                    "user_id": str(user.id),
                },
                "subscription_data": {
                    "metadata": {
                        "user_id": str(user.id),
                    },
                },
                "allow_promotion_codes": True,
            }
            
            # Add trial if specified
            if trial_days > 0:
                session_params["subscription_data"]["trial_period_days"] = trial_days
            
            session = stripe.checkout.Session.create(**session_params)
            
            logger.info(f"Created checkout session {session.id} for user {user.id}")
            
            return {
                "session_id": session.id,
                "url": session.url,
            }
        except stripe.StripeError as e:
            logger.error(f"Failed to create checkout session: {e}")
            raise

    @staticmethod
    async def create_portal_session(
        db: AsyncSession,
        user: User,
        return_url: str,
    ) -> Dict[str, Any]:
        """
        Create a Stripe Customer Portal session.
        Returns the portal URL.
        """
        try:
            # Get customer ID
            result = await db.execute(
                select(UserSubscription)
                .where(UserSubscription.user_id == user.id)
                .where(UserSubscription.stripe_customer_id.isnot(None))
                .limit(1)
            )
            subscription = result.scalar_one_or_none()
            
            if not subscription or not subscription.stripe_customer_id:
                raise ValueError("No Stripe customer found for user")
            
            session = stripe.billing_portal.Session.create(
                customer=subscription.stripe_customer_id,
                return_url=return_url,
            )
            
            logger.info(f"Created portal session for user {user.id}")
            
            return {
                "url": session.url,
            }
        except stripe.StripeError as e:
            logger.error(f"Failed to create portal session: {e}")
            raise

    @staticmethod
    async def get_subscription_plans(db: AsyncSession) -> List[SubscriptionPlan]:
        """Get all active subscription plans."""
        result = await db.execute(
            select(SubscriptionPlan)
            .where(SubscriptionPlan.is_active == True)
            .order_by(SubscriptionPlan.sort_order)
        )
        return result.scalars().all()

    @staticmethod
    async def get_user_subscription(
        db: AsyncSession,
        user_id: UUID,
    ) -> Optional[UserSubscription]:
        """Get the user's current subscription."""
        result = await db.execute(
            select(UserSubscription)
            .options(selectinload(UserSubscription.plan))
            .where(UserSubscription.user_id == user_id)
            .order_by(UserSubscription.created_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_user_invoices(
        db: AsyncSession,
        user_id: UUID,
        limit: int = 10,
    ) -> List[SubscriptionInvoice]:
        """Get the user's recent invoices."""
        result = await db.execute(
            select(SubscriptionInvoice)
            .where(SubscriptionInvoice.user_id == user_id)
            .order_by(SubscriptionInvoice.invoice_date.desc())
            .limit(limit)
        )
        return result.scalars().all()

    @staticmethod
    async def get_user_payment_methods(
        db: AsyncSession,
        user_id: UUID,
    ) -> List[PaymentMethod]:
        """Get the user's payment methods."""
        result = await db.execute(
            select(PaymentMethod)
            .where(PaymentMethod.user_id == user_id)
            .order_by(PaymentMethod.is_default.desc(), PaymentMethod.created_at.desc())
        )
        return result.scalars().all()

    # ==========================================
    # Webhook Handlers
    # ==========================================

    @staticmethod
    async def handle_checkout_completed(
        db: AsyncSession,
        event: stripe.Event,
    ) -> None:
        """
        Handle checkout.session.completed webhook.
        Creates or updates the user's subscription.
        """
        session = event.data.object
        
        user_id_str = session.metadata.get("user_id")
        if not user_id_str:
            logger.warning("No user_id in checkout session metadata")
            return
        
        user_id = UUID(user_id_str)
        
        # Get the subscription from Stripe
        stripe_subscription = stripe.Subscription.retrieve(session.subscription)
        
        # Find matching plan by price ID
        price_id = stripe_subscription.items.data[0].price.id if stripe_subscription.items.data else None
        
        result = await db.execute(
            select(SubscriptionPlan).where(
                (SubscriptionPlan.stripe_price_id_monthly == price_id) |
                (SubscriptionPlan.stripe_price_id_yearly == price_id)
            )
        )
        plan = result.scalar_one_or_none()
        
        # Check for existing subscription
        result = await db.execute(
            select(UserSubscription).where(UserSubscription.user_id == user_id)
        )
        existing_sub = result.scalar_one_or_none()
        
        if existing_sub:
            # Update existing subscription
            existing_sub.stripe_customer_id = session.customer
            existing_sub.stripe_subscription_id = stripe_subscription.id
            existing_sub.stripe_price_id = price_id
            existing_sub.plan_id = plan.id if plan else None
            existing_sub.status = SubscriptionStatus(stripe_subscription.status)
            existing_sub.billing_interval = stripe_subscription.items.data[0].price.recurring.interval if stripe_subscription.items.data else None
            existing_sub.current_period_start = datetime.fromtimestamp(stripe_subscription.current_period_start, tz=timezone.utc)
            existing_sub.current_period_end = datetime.fromtimestamp(stripe_subscription.current_period_end, tz=timezone.utc)
            existing_sub.cancel_at_period_end = stripe_subscription.cancel_at_period_end
            
            if stripe_subscription.trial_start:
                existing_sub.trial_start = datetime.fromtimestamp(stripe_subscription.trial_start, tz=timezone.utc)
            if stripe_subscription.trial_end:
                existing_sub.trial_end = datetime.fromtimestamp(stripe_subscription.trial_end, tz=timezone.utc)
        else:
            # Create new subscription record
            subscription = UserSubscription(
                user_id=user_id,
                plan_id=plan.id if plan else None,
                stripe_customer_id=session.customer,
                stripe_subscription_id=stripe_subscription.id,
                stripe_price_id=price_id,
                status=SubscriptionStatus(stripe_subscription.status),
                billing_interval=stripe_subscription.items.data[0].price.recurring.interval if stripe_subscription.items.data else None,
                current_period_start=datetime.fromtimestamp(stripe_subscription.current_period_start, tz=timezone.utc),
                current_period_end=datetime.fromtimestamp(stripe_subscription.current_period_end, tz=timezone.utc),
                cancel_at_period_end=stripe_subscription.cancel_at_period_end,
            )
            
            if stripe_subscription.trial_start:
                subscription.trial_start = datetime.fromtimestamp(stripe_subscription.trial_start, tz=timezone.utc)
            if stripe_subscription.trial_end:
                subscription.trial_end = datetime.fromtimestamp(stripe_subscription.trial_end, tz=timezone.utc)
            
            db.add(subscription)
        
        # Update user's subscription_status field
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if user:
            user.subscription_status = stripe_subscription.status
        
        await db.commit()
        logger.info(f"Processed checkout.session.completed for user {user_id}")

    @staticmethod
    async def handle_subscription_updated(
        db: AsyncSession,
        event: stripe.Event,
    ) -> None:
        """
        Handle customer.subscription.updated webhook.
        Updates the subscription status and details.
        """
        stripe_subscription = event.data.object
        
        # Find subscription by Stripe subscription ID
        result = await db.execute(
            select(UserSubscription).where(
                UserSubscription.stripe_subscription_id == stripe_subscription.id
            )
        )
        subscription = result.scalar_one_or_none()
        
        if not subscription:
            logger.warning(f"No subscription found for Stripe subscription {stripe_subscription.id}")
            return
        
        # Update subscription details
        subscription.status = SubscriptionStatus(stripe_subscription.status)
        subscription.current_period_start = datetime.fromtimestamp(stripe_subscription.current_period_start, tz=timezone.utc)
        subscription.current_period_end = datetime.fromtimestamp(stripe_subscription.current_period_end, tz=timezone.utc)
        subscription.cancel_at_period_end = stripe_subscription.cancel_at_period_end
        
        if stripe_subscription.canceled_at:
            subscription.canceled_at = datetime.fromtimestamp(stripe_subscription.canceled_at, tz=timezone.utc)
        
        # Update price ID if changed (plan change)
        price_id = stripe_subscription.items.data[0].price.id if stripe_subscription.items.data else None
        if price_id and price_id != subscription.stripe_price_id:
            subscription.stripe_price_id = price_id
            subscription.billing_interval = stripe_subscription.items.data[0].price.recurring.interval
            
            # Find matching plan
            result = await db.execute(
                select(SubscriptionPlan).where(
                    (SubscriptionPlan.stripe_price_id_monthly == price_id) |
                    (SubscriptionPlan.stripe_price_id_yearly == price_id)
                )
            )
            plan = result.scalar_one_or_none()
            if plan:
                subscription.plan_id = plan.id
        
        # Update user's subscription_status
        result = await db.execute(select(User).where(User.id == subscription.user_id))
        user = result.scalar_one_or_none()
        if user:
            user.subscription_status = stripe_subscription.status
        
        await db.commit()
        logger.info(f"Processed subscription.updated for subscription {subscription.id}")

    @staticmethod
    async def handle_subscription_deleted(
        db: AsyncSession,
        event: stripe.Event,
    ) -> None:
        """
        Handle customer.subscription.deleted webhook.
        Marks the subscription as canceled.
        """
        stripe_subscription = event.data.object
        
        # Find subscription by Stripe subscription ID
        result = await db.execute(
            select(UserSubscription).where(
                UserSubscription.stripe_subscription_id == stripe_subscription.id
            )
        )
        subscription = result.scalar_one_or_none()
        
        if not subscription:
            logger.warning(f"No subscription found for Stripe subscription {stripe_subscription.id}")
            return
        
        # Update subscription status
        subscription.status = SubscriptionStatus.CANCELED
        subscription.canceled_at = datetime.now(timezone.utc)
        
        # Update user's subscription_status
        result = await db.execute(select(User).where(User.id == subscription.user_id))
        user = result.scalar_one_or_none()
        if user:
            user.subscription_status = "canceled"
        
        await db.commit()
        logger.info(f"Processed subscription.deleted for subscription {subscription.id}")

    @staticmethod
    async def handle_invoice_paid(
        db: AsyncSession,
        event: stripe.Event,
    ) -> None:
        """
        Handle invoice.paid webhook.
        Records the invoice and updates payment info.
        """
        invoice = event.data.object
        
        # Only process subscription invoices
        if not invoice.subscription:
            return
        
        # Find subscription
        result = await db.execute(
            select(UserSubscription).where(
                UserSubscription.stripe_subscription_id == invoice.subscription
            )
        )
        subscription = result.scalar_one_or_none()
        
        if not subscription:
            logger.warning(f"No subscription found for invoice {invoice.id}")
            return
        
        # Check if invoice already recorded
        result = await db.execute(
            select(SubscriptionInvoice).where(
                SubscriptionInvoice.stripe_invoice_id == invoice.id
            )
        )
        existing = result.scalar_one_or_none()
        
        if not existing:
            # Create invoice record
            invoice_record = SubscriptionInvoice(
                subscription_id=subscription.id,
                user_id=subscription.user_id,
                stripe_invoice_id=invoice.id,
                stripe_charge_id=invoice.charge,
                invoice_number=invoice.number,
                status=invoice.status,
                amount_due=invoice.amount_due / 100,  # Convert from cents
                amount_paid=invoice.amount_paid / 100,
                currency=invoice.currency.upper(),
                invoice_date=datetime.fromtimestamp(invoice.created, tz=timezone.utc),
                due_date=datetime.fromtimestamp(invoice.due_date, tz=timezone.utc) if invoice.due_date else None,
                paid_at=datetime.now(timezone.utc) if invoice.status == "paid" else None,
                period_start=datetime.fromtimestamp(invoice.period_start, tz=timezone.utc) if invoice.period_start else None,
                period_end=datetime.fromtimestamp(invoice.period_end, tz=timezone.utc) if invoice.period_end else None,
                invoice_pdf_url=invoice.invoice_pdf,
                hosted_invoice_url=invoice.hosted_invoice_url,
            )
            db.add(invoice_record)
        
        # Update subscription payment info
        subscription.last_payment_date = datetime.now(timezone.utc)
        subscription.last_payment_amount = invoice.amount_paid / 100
        subscription.last_payment_currency = invoice.currency.upper()
        
        await db.commit()
        logger.info(f"Processed invoice.paid for subscription {subscription.id}")

    @staticmethod
    async def handle_invoice_payment_failed(
        db: AsyncSession,
        event: stripe.Event,
    ) -> None:
        """
        Handle invoice.payment_failed webhook.
        Updates subscription status and records failed invoice.
        """
        invoice = event.data.object
        
        if not invoice.subscription:
            return
        
        # Find subscription
        result = await db.execute(
            select(UserSubscription).where(
                UserSubscription.stripe_subscription_id == invoice.subscription
            )
        )
        subscription = result.scalar_one_or_none()
        
        if not subscription:
            logger.warning(f"No subscription found for failed invoice {invoice.id}")
            return
        
        # Update subscription status to past_due
        subscription.status = SubscriptionStatus.PAST_DUE
        
        # Update user's subscription_status
        result = await db.execute(select(User).where(User.id == subscription.user_id))
        user = result.scalar_one_or_none()
        if user:
            user.subscription_status = "past_due"
        
        # Record the failed invoice
        result = await db.execute(
            select(SubscriptionInvoice).where(
                SubscriptionInvoice.stripe_invoice_id == invoice.id
            )
        )
        existing = result.scalar_one_or_none()
        
        if not existing:
            invoice_record = SubscriptionInvoice(
                subscription_id=subscription.id,
                user_id=subscription.user_id,
                stripe_invoice_id=invoice.id,
                invoice_number=invoice.number,
                status="uncollectible",
                amount_due=invoice.amount_due / 100,
                amount_paid=0,
                currency=invoice.currency.upper(),
                invoice_date=datetime.fromtimestamp(invoice.created, tz=timezone.utc),
                due_date=datetime.fromtimestamp(invoice.due_date, tz=timezone.utc) if invoice.due_date else None,
            )
            db.add(invoice_record)
        else:
            existing.status = "uncollectible"
        
        await db.commit()
        logger.info(f"Processed invoice.payment_failed for subscription {subscription.id}")

    @staticmethod
    async def handle_payment_method_attached(
        db: AsyncSession,
        event: stripe.Event,
    ) -> None:
        """
        Handle payment_method.attached webhook.
        Records the payment method.
        """
        payment_method = event.data.object
        
        # Find user by customer ID
        result = await db.execute(
            select(UserSubscription).where(
                UserSubscription.stripe_customer_id == payment_method.customer
            )
        )
        subscription = result.scalar_one_or_none()
        
        if not subscription:
            logger.warning(f"No subscription found for customer {payment_method.customer}")
            return
        
        # Check if payment method already exists
        result = await db.execute(
            select(PaymentMethod).where(
                PaymentMethod.stripe_payment_method_id == payment_method.id
            )
        )
        existing = result.scalar_one_or_none()
        
        if not existing:
            pm_record = PaymentMethod(
                user_id=subscription.user_id,
                stripe_payment_method_id=payment_method.id,
                type=payment_method.type,
                brand=payment_method.card.brand if payment_method.card else None,
                last4=payment_method.card.last4 if payment_method.card else None,
                exp_month=payment_method.card.exp_month if payment_method.card else None,
                exp_year=payment_method.card.exp_year if payment_method.card else None,
                is_default=False,
            )
            db.add(pm_record)
            await db.commit()
        
        logger.info(f"Processed payment_method.attached for user {subscription.user_id}")

    @staticmethod
    def verify_webhook_signature(payload: bytes, sig_header: str) -> stripe.Event:
        """
        Verify the Stripe webhook signature and return the event.
        """
        webhook_secret = settings.STRIPE_WEBHOOK_SECRET
        
        if not webhook_secret:
            raise ValueError("STRIPE_WEBHOOK_SECRET not configured")
        
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, webhook_secret
            )
            return event
        except stripe.SignatureVerificationError as e:
            logger.error(f"Invalid webhook signature: {e}")
            raise
