"""Chat schemas for AI assistant."""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class ChatMessage(BaseModel):
    """Single chat message."""
    role: str = Field(..., description="Message role: 'user' or 'assistant'")
    content: str = Field(..., description="Message content")
    timestamp: Optional[datetime] = None


class ChatRequest(BaseModel):
    """Request to send a chat message."""
    message: str = Field(..., min_length=1, max_length=2000, description="User message")
    conversation_history: Optional[List[ChatMessage]] = Field(default=[], description="Previous messages in conversation")


class ChatResponse(BaseModel):
    """Response from chat endpoint."""
    response: str = Field(..., description="AI assistant response")
    conversation_id: Optional[str] = Field(None, description="Conversation ID for tracking")
    timestamp: datetime = Field(..., description="Response timestamp")
