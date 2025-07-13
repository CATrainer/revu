"""Automation rule model."""

from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class AutomationRule(Base):
    """Automation rule model for automated workflows."""

    __tablename__ = "automation_rules"

    location_id = Column(PGUUID(as_uuid=True), ForeignKey("locations.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    trigger_type = Column(String(50), nullable=False)
    trigger_config = Column(JSONB, nullable=False)
    action_type = Column(String(50), nullable=False)
    action_config = Column(JSONB, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    priority = Column(Integer, default=0, nullable=False)
    created_by_id = Column(PGUUID(as_uuid=True), ForeignKey("users.id"))

    # Relationships
    location = relationship("Location", back_populates="automation_rules")
    created_by = relationship("User", back_populates="automation_rules")

    def __repr__(self) -> str:
        return f"<AutomationRule(name='{self.name}', trigger='{self.trigger_type}')>"

    def matches_review(self, review: dict) -> bool:
        """Check if a review matches this rule's triggers."""
        if not self.is_active:
            return False

        if self.trigger_type == "new_review":
            return True

        elif self.trigger_type == "rating_threshold":
            operator = self.trigger_config.get("operator", "eq")
            threshold = self.trigger_config.get("threshold", 3)
            rating = review.get("rating", 0)

            if operator == "eq":
                return rating == threshold
            elif operator == "lt":
                return rating < threshold
            elif operator == "lte":
                return rating <= threshold
            elif operator == "gt":
                return rating > threshold
            elif operator == "gte":
                return rating >= threshold

        elif self.trigger_type == "keyword_match":
            keywords = self.trigger_config.get("keywords", [])
            text = review.get("review_text", "").lower()
            return any(keyword.lower() in text for keyword in keywords)

        elif self.trigger_type == "sentiment":
            target_sentiment = self.trigger_config.get("sentiment", "negative")
            return review.get("sentiment") == target_sentiment

        return False

    def get_action_description(self) -> str:
        """Get a human-readable description of the action."""
        descriptions = {
            "auto_reply": "Send automated response",
            "notification": "Send notification",
            "tag": "Add tags",
            "assign": "Assign to team member",
        }
        return descriptions.get(self.action_type, "Unknown action")