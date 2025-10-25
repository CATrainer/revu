"""Platform connection model."""

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class PlatformConnection(Base):
    """Platform connection model for OAuth tokens and API credentials."""

    __tablename__ = "platform_connections"
    __table_args__ = (
        UniqueConstraint("location_id", "platform", name="uq_location_platform"),
    )

    location_id = Column(PGUUID(as_uuid=True), ForeignKey("locations.id"), nullable=False)
    platform = Column(String(50), nullable=False)
    
    # Connection state tracking
    connection_status = Column(String(20), default='disconnected', nullable=False, comment="Current connection state")
    connection_error = Column(Text, nullable=True, comment="Error message if connection failed")
    oauth_state = Column(String(255), nullable=True, comment="OAuth state for CSRF protection")
    
    # OAuth tokens
    access_token = Column(Text)
    refresh_token = Column(Text)
    token_expires_at = Column(DateTime(timezone=True))
    last_token_refresh_at = Column(DateTime(timezone=True), comment="When token was last refreshed")
    next_token_refresh_at = Column(DateTime(timezone=True), comment="When token should be refreshed next")
    
    # Platform data
    account_info = Column(JSONB, default=dict, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    last_sync_at = Column(DateTime(timezone=True))

    # Relationships
    location = relationship("Location", back_populates="platform_connections")

    def __repr__(self) -> str:
        return f"<PlatformConnection(location_id='{self.location_id}', platform='{self.platform}')>"

    @property
    def needs_refresh(self) -> bool:
        """Check if token needs to be refreshed."""
        if not self.token_expires_at:
            return False
        
        from datetime import datetime, timedelta
        # Refresh 5 minutes before expiry
        return datetime.utcnow() >= self.token_expires_at - timedelta(minutes=5)

    def get_account_name(self) -> str:
        """Get the connected account name."""
        return self.account_info.get("name", "Unknown Account")

    def get_account_id(self) -> str:
        """Get the connected account ID."""
        return self.account_info.get("id", "")