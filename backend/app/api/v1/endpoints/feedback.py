"""
Feedback endpoints for user bug reports and feature requests.
"""

from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.core.database import get_async_session
from app.core.security import get_current_user
from app.models.user import User
from app.models.user_feedback import UserFeedback, FeedbackType, FeedbackStatus
from pydantic import BaseModel, Field

router = APIRouter()


class FeedbackCreate(BaseModel):
    """Schema for creating feedback."""
    feedback_type: FeedbackType = Field(..., description="Type of feedback")
    title: str = Field(..., min_length=3, max_length=255, description="Brief title")
    description: str = Field(..., min_length=10, max_length=5000, description="Detailed description")
    page_url: str | None = Field(None, max_length=500, description="Page URL where feedback occurred")


class FeedbackResponse(BaseModel):
    """Schema for feedback response."""
    id: int
    feedback_type: FeedbackType
    title: str
    description: str
    status: FeedbackStatus
    created_at: str
    
    class Config:
        from_attributes = True


@router.post("/submit", response_model=FeedbackResponse, status_code=status.HTTP_201_CREATED)
async def submit_feedback(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
    feedback_in: FeedbackCreate,
    request: Request,
) -> Any:
    """
    Submit user feedback, bug report, or feature request.
    
    Args:
        db: Database session
        current_user: Current authenticated user
        feedback_in: Feedback data
        request: FastAPI request for extracting user agent
    
    Returns:
        Created feedback object
    """
    try:
        # Create feedback entry
        feedback = UserFeedback(
            user_id=current_user.id,
            feedback_type=feedback_in.feedback_type.value,  # Use .value to get lowercase string
            title=feedback_in.title,
            description=feedback_in.description,
            page_url=feedback_in.page_url,
            user_agent=request.headers.get("user-agent"),
            status=FeedbackStatus.NEW.value  # Use .value for consistency
        )
        
        db.add(feedback)
        await db.commit()
        await db.refresh(feedback)
        
        logger.info(f"Feedback submitted by user {current_user.email}: {feedback_in.feedback_type} - {feedback_in.title}")
        
        return FeedbackResponse(
            id=feedback.id,
            feedback_type=feedback.feedback_type,
            title=feedback.title,
            description=feedback.description,
            status=feedback.status,
            created_at=feedback.created_at.isoformat()
        )
        
    except Exception as e:
        logger.error(f"Error submitting feedback: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit feedback"
        )
