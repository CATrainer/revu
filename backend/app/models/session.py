"""User session model for auth management."""

from datetime import datetime, timedelta
import uuid

from sqlalchemy import Column, String, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PGUUID, INET
from sqlalchemy.orm import relationship

from app.core.database import Base


class UserSession(Base):
    """Model for managing user authentication sessions."""
    
    __tablename__ = "user_sessions"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(PGUUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Tokens
    session_token = Column(String(255), nullable=False, unique=True, index=True)
    refresh_token = Column(String(255), nullable=False, unique=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    last_accessed_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    
    # Client information
    ip_address = Column(INET, nullable=True)
    user_agent = Column(Text, nullable=True)
    
    # Session validity
    is_valid = Column(Boolean, nullable=False, default=True)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="sessions")
    
    def __repr__(self) -> str:
        return f"<UserSession(id={self.id}, user_id={self.user_id}, valid={self.is_valid})>"
    
    @property
    def is_expired(self) -> bool:
        """Check if session is expired."""
        return datetime.utcnow() >= self.expires_at
    
    @property
    def is_active(self) -> bool:
        """Check if session is active (valid and not expired)."""
        return self.is_valid and not self.is_expired and not self.revoked_at
    
    def touch(self):
        """Update last accessed timestamp."""
        self.last_accessed_at = datetime.utcnow()
    
    def revoke(self):
        """Revoke this session."""
        self.is_valid = False
        self.revoked_at = datetime.utcnow()
    
    @classmethod
    def create_for_user(cls, user_id: uuid.UUID, session_token: str, refresh_token: str,
                       expires_in_minutes: int = 30, ip_address: str = None, 
                       user_agent: str = None) -> 'UserSession':
        """Create a new session for a user."""
        return cls(
            user_id=user_id,
            session_token=session_token,
            refresh_token=refresh_token,
            expires_at=datetime.utcnow() + timedelta(minutes=expires_in_minutes),
            ip_address=ip_address,
            user_agent=user_agent,
        )
