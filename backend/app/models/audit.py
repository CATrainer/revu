"""Audit log model."""

from sqlalchemy import Column, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import INET, JSONB, UUID as PGUUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class AuditLog(Base):
    """Audit log model for tracking user actions."""

    __tablename__ = "audit_logs"

    user_id = Column(PGUUID(as_uuid=True), ForeignKey("users.id"))
    organization_id = Column(PGUUID(as_uuid=True), ForeignKey("organizations.id"))
    action = Column(String(100), nullable=False)
    entity_type = Column(String(50))
    entity_id = Column(PGUUID(as_uuid=True))
    changes = Column(JSONB)
    ip_address = Column(INET)
    user_agent = Column(Text)

    # Relationships
    user = relationship("User", back_populates="audit_logs")
    organization = relationship("Organization", back_populates="audit_logs")

    def __repr__(self) -> str:
        return f"<AuditLog(user_id='{self.user_id}', action='{self.action}')>"