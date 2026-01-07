"""
Support ticket models for the internal ticket system.
"""

from datetime import datetime
from typing import Optional, List
from uuid import UUID
import uuid

from sqlalchemy import (
    Column,
    String,
    Text,
    DateTime,
    ForeignKey,
    Boolean,
    Enum,
    Integer,
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class SupportTicket(Base):
    """Support ticket model for agency help requests."""
    
    __tablename__ = "support_tickets"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_number = Column(String(20), unique=True, nullable=False, index=True)
    
    # Submitter info
    agency_id = Column(PGUUID(as_uuid=True), ForeignKey("agencies.id"), nullable=False, index=True)
    user_id = Column(PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Ticket details
    category = Column(String(50), nullable=False)  # technical, billing, feature, account, bug, other
    subject = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    
    # Status management
    status = Column(
        String(30),
        nullable=False,
        default="open"
    )  # open, in_progress, waiting_response, resolved, closed
    priority = Column(
        String(20),
        nullable=False,
        default="medium"
    )  # low, medium, high, urgent
    
    # Admin assignment
    assigned_to = Column(PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    resolved_at = Column(DateTime, nullable=True)
    
    # Relationships
    responses = relationship("SupportTicketResponse", back_populates="ticket", order_by="SupportTicketResponse.created_at")
    submitter = relationship("User", foreign_keys=[user_id])
    assignee = relationship("User", foreign_keys=[assigned_to])
    
    def __repr__(self):
        return f"<SupportTicket {self.ticket_number}: {self.subject[:30]}>"


class SupportTicketResponse(Base):
    """Response to a support ticket."""
    
    __tablename__ = "support_ticket_responses"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id = Column(PGUUID(as_uuid=True), ForeignKey("support_tickets.id"), nullable=False, index=True)
    
    # Author info
    author_id = Column(PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    is_staff = Column(Boolean, default=False, nullable=False)  # True if from support team
    author_name = Column(String(100), nullable=False)
    
    # Message
    message = Column(Text, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    ticket = relationship("SupportTicket", back_populates="responses")
    author = relationship("User")
    
    def __repr__(self):
        return f"<SupportTicketResponse {self.id}: by {'Staff' if self.is_staff else 'User'}>"


class NewsletterSubscription(Base):
    """Newsletter subscription for changelog updates."""
    
    __tablename__ = "newsletter_subscriptions"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), nullable=False, index=True)
    user_id = Column(PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=True)  # Optional link to user
    
    # Subscription lists
    changelog_updates = Column(Boolean, default=True, nullable=False)
    product_news = Column(Boolean, default=False, nullable=False)
    
    # SendGrid contact ID for sync
    sendgrid_contact_id = Column(String(100), nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Timestamps
    subscribed_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    unsubscribed_at = Column(DateTime, nullable=True)
    
    def __repr__(self):
        return f"<NewsletterSubscription {self.email}>"
