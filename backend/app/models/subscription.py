"""
Subscription models for Stripe billing integration.
"""

from datetime import datetime
from typing import Optional
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Boolean, Numeric, Text, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID as PGUUID, JSONB
from sqlalchemy.orm import relationship
import enum

from app.core.database import Base


class SubscriptionPlanType(str, enum.Enum):
    """Subscription plan types."""
    FREE = "free"
    CREATOR = "creator"
    AGENCY = "agency"
    ENTERPRISE = "enterprise"


class SubscriptionStatus(str, enum.Enum):
    """Subscription status values."""
    TRIAL = "trial"
    ACTIVE = "active"
    PAST_DUE = "past_due"
    CANCELED = "canceled"
    UNPAID = "unpaid"
    INCOMPLETE = "incomplete"
    INCOMPLETE_EXPIRED = "incomplete_expired"
    PAUSED = "paused"


class SubscriptionPlan(Base):
    """
    Subscription plans available for purchase.
    These map to Stripe Products/Prices.
    """
    __tablename__ = "subscription_plans"

    name = Column(String(100), nullable=False)
    plan_type = Column(SQLEnum(SubscriptionPlanType), nullable=False, default=SubscriptionPlanType.FREE)
    description = Column(Text, nullable=True)
    
    # Pricing
    price_monthly = Column(Numeric(10, 2), nullable=False, default=0)
    price_yearly = Column(Numeric(10, 2), nullable=True)  # Discounted yearly price
    currency = Column(String(3), default="GBP", nullable=False)
    
    # Stripe IDs
    stripe_product_id = Column(String(255), nullable=True, unique=True)
    stripe_price_id_monthly = Column(String(255), nullable=True)
    stripe_price_id_yearly = Column(String(255), nullable=True)
    
    # Features (JSON list of feature strings)
    features = Column(JSONB, default=list, nullable=False)
    
    # Limits
    max_creators = Column(Integer, nullable=True)  # null = unlimited
    max_campaigns = Column(Integer, nullable=True)
    max_ai_messages_monthly = Column(Integer, nullable=True)
    max_integrations = Column(Integer, nullable=True)
    
    # Flags
    is_active = Column(Boolean, default=True, nullable=False)
    is_popular = Column(Boolean, default=False, nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)
    
    # Relationships
    subscriptions = relationship("UserSubscription", back_populates="plan")
    
    def __repr__(self) -> str:
        return f"<SubscriptionPlan(name='{self.name}', type='{self.plan_type}')>"


class UserSubscription(Base):
    """
    User subscription record tracking their Stripe subscription.
    """
    __tablename__ = "user_subscriptions"

    # User reference
    user_id = Column(PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Plan reference
    plan_id = Column(PGUUID(as_uuid=True), ForeignKey("subscription_plans.id"), nullable=True)
    
    # Stripe IDs
    stripe_customer_id = Column(String(255), nullable=True, index=True)
    stripe_subscription_id = Column(String(255), nullable=True, unique=True, index=True)
    stripe_price_id = Column(String(255), nullable=True)
    
    # Subscription details
    status = Column(SQLEnum(SubscriptionStatus), nullable=False, default=SubscriptionStatus.TRIAL)
    billing_interval = Column(String(20), nullable=True)  # 'month' or 'year'
    
    # Dates
    trial_start = Column(DateTime(timezone=True), nullable=True)
    trial_end = Column(DateTime(timezone=True), nullable=True)
    current_period_start = Column(DateTime(timezone=True), nullable=True)
    current_period_end = Column(DateTime(timezone=True), nullable=True)
    canceled_at = Column(DateTime(timezone=True), nullable=True)
    cancel_at_period_end = Column(Boolean, default=False, nullable=False)
    
    # Payment info
    last_payment_date = Column(DateTime(timezone=True), nullable=True)
    last_payment_amount = Column(Numeric(10, 2), nullable=True)
    last_payment_currency = Column(String(3), nullable=True)
    
    # Metadata
    extra_metadata = Column("metadata", JSONB, default=dict, nullable=False)
    
    # Relationships
    user = relationship("User", backref="subscriptions")
    plan = relationship("SubscriptionPlan", back_populates="subscriptions")
    invoices = relationship("SubscriptionInvoice", back_populates="subscription", cascade="all, delete-orphan")
    
    def __repr__(self) -> str:
        return f"<UserSubscription(user_id='{self.user_id}', status='{self.status}')>"
    
    @property
    def is_active(self) -> bool:
        """Check if subscription is in an active state."""
        return self.status in [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL]
    
    @property
    def is_trial(self) -> bool:
        """Check if subscription is in trial period."""
        return self.status == SubscriptionStatus.TRIAL
    
    @property
    def days_until_renewal(self) -> Optional[int]:
        """Calculate days until next billing cycle."""
        if not self.current_period_end:
            return None
        delta = self.current_period_end - datetime.now(self.current_period_end.tzinfo)
        return max(0, delta.days)


class SubscriptionInvoice(Base):
    """
    Invoice records from Stripe.
    """
    __tablename__ = "subscription_invoices"

    # Subscription reference
    subscription_id = Column(PGUUID(as_uuid=True), ForeignKey("user_subscriptions.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Stripe IDs
    stripe_invoice_id = Column(String(255), nullable=False, unique=True, index=True)
    stripe_charge_id = Column(String(255), nullable=True)
    
    # Invoice details
    invoice_number = Column(String(100), nullable=True)
    status = Column(String(50), nullable=False)  # draft, open, paid, uncollectible, void
    
    # Amounts
    amount_due = Column(Numeric(10, 2), nullable=False)
    amount_paid = Column(Numeric(10, 2), nullable=False, default=0)
    currency = Column(String(3), nullable=False, default="GBP")
    
    # Dates
    invoice_date = Column(DateTime(timezone=True), nullable=False)
    due_date = Column(DateTime(timezone=True), nullable=True)
    paid_at = Column(DateTime(timezone=True), nullable=True)
    period_start = Column(DateTime(timezone=True), nullable=True)
    period_end = Column(DateTime(timezone=True), nullable=True)
    
    # PDF
    invoice_pdf_url = Column(String(500), nullable=True)
    hosted_invoice_url = Column(String(500), nullable=True)
    
    # Metadata
    extra_metadata = Column("metadata", JSONB, default=dict, nullable=False)
    
    # Relationships
    subscription = relationship("UserSubscription", back_populates="invoices")
    user = relationship("User", backref="invoices")
    
    def __repr__(self) -> str:
        return f"<SubscriptionInvoice(id='{self.id}', status='{self.status}')>"


class PaymentMethod(Base):
    """
    Payment method records from Stripe.
    """
    __tablename__ = "payment_methods"

    # User reference
    user_id = Column(PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Stripe IDs
    stripe_payment_method_id = Column(String(255), nullable=False, unique=True, index=True)
    
    # Card details (for display only - no sensitive data stored)
    type = Column(String(50), nullable=False)  # 'card', 'bank_account', etc.
    brand = Column(String(50), nullable=True)  # 'visa', 'mastercard', etc.
    last4 = Column(String(4), nullable=True)
    exp_month = Column(Integer, nullable=True)
    exp_year = Column(Integer, nullable=True)
    
    # Flags
    is_default = Column(Boolean, default=False, nullable=False)
    
    # Metadata
    extra_metadata = Column("metadata", JSONB, default=dict, nullable=False)
    
    # Relationships
    user = relationship("User", backref="payment_methods")
    
    def __repr__(self) -> str:
        return f"<PaymentMethod(user_id='{self.user_id}', type='{self.type}', last4='{self.last4}')>"
