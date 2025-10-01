"""
AI Chat models for chat sessions and messages
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Boolean, Integer, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector

from app.core.database import Base


class ChatSession(Base):
    """AI Chat Session model"""
    __tablename__ = 'ai_chat_sessions'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    title = Column(String, nullable=True)
    context_tags = Column(JSONB, nullable=True)  # Array of context tags
    system_prompt = Column(Text, nullable=True)  # Custom system prompt
    mode = Column(String, default='general', nullable=False)
    status = Column(String, default='active', nullable=False, index=True)
    last_message_at = Column(DateTime, nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Branching support
    parent_session_id = Column(UUID(as_uuid=True), ForeignKey('ai_chat_sessions.id', ondelete='CASCADE'), nullable=True)
    branch_point_message_id = Column(UUID(as_uuid=True), nullable=True)
    context_inheritance = Column(JSONB, nullable=True)
    branch_name = Column(String(255), nullable=True)
    depth_level = Column(Integer, default=0, nullable=False)
    
    # Enhancement columns (from migration 20251001_1100)
    starred = Column(Boolean, default=False, nullable=False)
    archived = Column(Boolean, default=False, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")
    tags = relationship("Tag", secondary="session_tags", back_populates="sessions")
    shares = relationship("SessionShare", back_populates="session", cascade="all, delete-orphan")
    collaborators = relationship("SessionCollaborator", back_populates="session", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('idx_ai_chat_sessions_user', 'user_id'),
        Index('idx_ai_chat_sessions_status', 'status'),
        Index('idx_ai_chat_sessions_last_message', 'last_message_at'),
        Index('idx_ai_chat_sessions_parent_id', 'parent_session_id'),
        Index('idx_ai_chat_sessions_branch_point', 'branch_point_message_id'),
    )


class ChatMessage(Base):
    """AI Chat Message model"""
    __tablename__ = 'ai_chat_messages'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey('ai_chat_sessions.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    role = Column(String, nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    message_metadata = Column('metadata', JSONB, nullable=True)  # Use different Python name
    tokens_used = Column(Integer, nullable=True)
    model = Column(String, nullable=True)
    
    # Status tracking (from migration 20250930_1850)
    status = Column(String, default='completed', nullable=True)
    error = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0, nullable=True)
    
    # Vector embedding for RAG
    embedding = Column(Vector(1536), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    session = relationship("ChatSession", back_populates="messages")
    user = relationship("User")
    comments = relationship("MessageComment", back_populates="message", cascade="all, delete-orphan")
    attachments = relationship("Attachment", back_populates="message", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('idx_ai_chat_messages_session', 'session_id'),
        Index('idx_ai_chat_messages_user', 'user_id'),
        Index('idx_ai_chat_messages_role', 'role'),
    )
