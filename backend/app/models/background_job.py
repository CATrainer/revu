"""Background job model for tracking async operations."""

from datetime import datetime
from typing import Optional
import uuid

from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID as PGUUID, JSONB
from sqlalchemy.orm import relationship

from app.core.database import Base


class BackgroundJob(Base):
    """Model for tracking background/async operations."""
    
    __tablename__ = "background_jobs"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_type = Column(String(50), nullable=False, comment="Type of job: demo_enable, demo_disable, oauth_connect, etc.")
    user_id = Column(PGUUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Status tracking
    status = Column(String(20), nullable=False, default='pending', index=True)
    # Status values: pending, running, completed, failed, cancelled
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, index=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    failed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Error tracking
    error_message = Column(Text, nullable=True)
    error_details = Column(JSONB, nullable=True)
    
    # Result data
    result_data = Column(JSONB, nullable=True)
    
    # Retry management
    retry_count = Column(Integer, nullable=False, default=0)
    max_retries = Column(Integer, nullable=False, default=3)
    
    # Relationships
    user = relationship("User", back_populates="background_jobs")
    
    def __repr__(self) -> str:
        return f"<BackgroundJob(id={self.id}, type={self.job_type}, status={self.status})>"
    
    @property
    def is_terminal(self) -> bool:
        """Check if job is in a terminal state (completed or failed)."""
        return self.status in ('completed', 'failed', 'cancelled')
    
    @property
    def can_retry(self) -> bool:
        """Check if job can be retried."""
        return self.status == 'failed' and self.retry_count < self.max_retries
    
    @property
    def duration_seconds(self) -> Optional[float]:
        """Calculate job duration in seconds."""
        if not self.started_at:
            return None
        
        end_time = self.completed_at or self.failed_at or datetime.utcnow()
        return (end_time - self.started_at).total_seconds()
    
    def mark_running(self):
        """Mark job as running."""
        self.status = 'running'
        self.started_at = datetime.utcnow()
    
    def mark_completed(self, result_data: dict = None):
        """Mark job as completed with optional result data."""
        self.status = 'completed'
        self.completed_at = datetime.utcnow()
        if result_data:
            self.result_data = result_data
    
    def mark_failed(self, error_message: str, error_details: dict = None):
        """Mark job as failed with error information."""
        self.status = 'failed'
        self.failed_at = datetime.utcnow()
        self.error_message = error_message
        if error_details:
            self.error_details = error_details
    
    def increment_retry(self):
        """Increment retry count and reset to pending."""
        self.retry_count += 1
        self.status = 'pending'
        self.started_at = None
        self.failed_at = None
        self.error_message = None
        self.error_details = None
