"""Monetization Engine V2 Models.

This module contains the new monetization engine models:
- MonetizationTemplate: 100 curated templates across 5 categories
- MonetizationProject: User's active projects with AI customization
- MonetizationTask: Individual tasks with Kanban status tracking
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID

from sqlalchemy import (
    Boolean, Column, DateTime, Integer, String, Text,
    ForeignKey, CheckConstraint, Index, Numeric
)
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class MonetizationTemplate(Base):
    """Curated monetization template from the library of 100 templates."""
    
    __tablename__ = "monetization_templates"
    
    id = Column(String(100), primary_key=True)  # e.g., "online-course-comprehensive"
    category = Column(String(50), nullable=False)  # digital_products, services, physical_products, partnerships, platform_features
    subcategory = Column(String(50), nullable=False)  # e.g., "courses", "coaching", "merchandise"
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    
    # Who this template is suitable for
    prerequisites = Column(JSONB, nullable=False, default=list)  # List of prerequisite strings
    suitable_for = Column(JSONB, nullable=False)  # {min_followers, niches, platforms}
    
    # Revenue expectations
    revenue_model = Column(String(50), nullable=False)  # one-time, recurring, hybrid
    expected_timeline = Column(String(100), nullable=False)  # e.g., "3-6 months to first revenue"
    expected_revenue_range = Column(JSONB, nullable=False)  # {low, high, unit}
    
    # Customization options and action plan
    decision_points = Column(JSONB, nullable=False, default=list)  # List of DecisionPoint objects
    action_plan = Column(JSONB, nullable=False, default=list)  # List of ActionPhase objects
    
    # Display settings
    is_active = Column(Boolean, nullable=False, default=True)
    display_order = Column(Integer, nullable=False, default=0)
    
    # Relationships
    projects = relationship("MonetizationProject", back_populates="template")
    
    __table_args__ = (
        Index("idx_monetization_templates_category", "category"),
        Index("idx_monetization_templates_subcategory", "subcategory"),
        Index("idx_monetization_templates_active", "is_active", "display_order"),
    )
    
    def __repr__(self) -> str:
        return f"<MonetizationTemplate(id={self.id}, title={self.title})>"


class MonetizationProject(Base):
    """User's active monetization project based on a template."""
    
    __tablename__ = "monetization_projects"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True, server_default="gen_random_uuid()")
    user_id = Column(PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    template_id = Column(String(100), ForeignKey("monetization_templates.id"), nullable=False)
    
    title = Column(String(200), nullable=False)  # User can rename from template title
    status = Column(String(20), nullable=False, default="active")  # active, paused, completed, abandoned
    
    # AI-customized version of the action plan
    customized_plan = Column(JSONB)  # Full action_plan with AI modifications
    
    # User's configuration choices
    decision_values = Column(JSONB, nullable=False, default=dict)  # {course_topic: "...", price_point: "mid", ...}
    
    # AI's notes about customization
    ai_customization_notes = Column(Text)
    
    # Timeline
    started_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    completed_at = Column(DateTime(timezone=True))
    
    # Relationships
    user = relationship("User", back_populates="monetization_projects")
    template = relationship("MonetizationTemplate", back_populates="projects")
    tasks = relationship("MonetizationTask", back_populates="project", cascade="all, delete-orphan")
    
    __table_args__ = (
        CheckConstraint("status IN ('active', 'paused', 'completed', 'abandoned')", name="ck_monetization_projects_status"),
        Index("idx_monetization_projects_user", "user_id"),
        Index("idx_monetization_projects_status", "status"),
        Index("idx_monetization_projects_user_active", "user_id", "status"),
    )
    
    def __repr__(self) -> str:
        return f"<MonetizationProject(id={self.id}, title={self.title}, status={self.status})>"
    
    @property
    def progress(self) -> Dict[str, Any]:
        """Calculate project progress based on task completion."""
        if not self.tasks:
            return {"total": 0, "completed": 0, "percentage": 0}
        
        total = len(self.tasks)
        completed = sum(1 for t in self.tasks if t.status == "done")
        in_progress = sum(1 for t in self.tasks if t.status == "in_progress")
        
        return {
            "total": total,
            "completed": completed,
            "in_progress": in_progress,
            "todo": total - completed - in_progress,
            "percentage": round((completed / total) * 100) if total > 0 else 0
        }


class MonetizationTask(Base):
    """Individual task from a project's action plan."""
    
    __tablename__ = "monetization_tasks"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True, server_default="gen_random_uuid()")
    project_id = Column(PGUUID(as_uuid=True), ForeignKey("monetization_projects.id", ondelete="CASCADE"), nullable=False)
    
    phase = Column(Integer, nullable=False)  # 1, 2, 3, etc.
    phase_name = Column(String(100), nullable=False)  # e.g., "Validation", "Content Creation"
    task_id = Column(String(20), nullable=False)  # e.g., "1.1", "2.3"
    title = Column(String(300), nullable=False)
    description = Column(Text, nullable=False)
    
    status = Column(String(20), nullable=False, default="todo")  # todo, in_progress, done
    estimated_hours = Column(Numeric(5, 1))
    sort_order = Column(Integer, nullable=False)  # For Kanban ordering within status
    
    depends_on_decisions = Column(JSONB, default=list)  # Which decision_points affect this task
    
    completed_at = Column(DateTime(timezone=True))
    notes = Column(Text)  # User notes on completion
    
    # Relationships
    project = relationship("MonetizationProject", back_populates="tasks")
    
    __table_args__ = (
        CheckConstraint("status IN ('todo', 'in_progress', 'done')", name="ck_monetization_tasks_status"),
        Index("idx_monetization_tasks_project", "project_id"),
        Index("idx_monetization_tasks_status", "status"),
        Index("idx_monetization_tasks_project_phase", "project_id", "phase"),
        Index("idx_monetization_tasks_project_status", "project_id", "status"),
    )
    
    def __repr__(self) -> str:
        return f"<MonetizationTask(id={self.id}, task_id={self.task_id}, status={self.status})>"
