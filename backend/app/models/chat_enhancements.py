"""
Chat Enhancement Models - Tags, Attachments, Shares, Collaborators, Comments
"""
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text, Table
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid
from datetime import datetime

# Association table for many-to-many relationship between sessions and tags
session_tags = Table(
    'session_tags',
    Base.metadata,
    Column('session_id', UUID(as_uuid=True), ForeignKey('ai_chat_sessions.id', ondelete='CASCADE'), primary_key=True),
    Column('tag_id', UUID(as_uuid=True), ForeignKey('tags.id', ondelete='CASCADE'), primary_key=True)
)

class Tag(Base):
    """User-created tags for organizing conversations"""
    __tablename__ = 'tags'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    name = Column(String(50), nullable=False)
    color = Column(String(7), nullable=False, default='#3b82f6')
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=True, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="tags")
    sessions = relationship("ChatSession", secondary=session_tags, back_populates="tags")
    
    def __repr__(self):
        return f"<Tag {self.name}>"

class Attachment(Base):
    """File attachments for chat messages"""
    __tablename__ = 'attachments'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_id = Column(UUID(as_uuid=True), ForeignKey('ai_chat_messages.id', ondelete='CASCADE'), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    file_type = Column(String(100))
    file_size = Column(Integer)
    storage_url = Column(Text, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    
    # Relationships
    message = relationship("ChatMessage", back_populates="attachments")
    
    def __repr__(self):
        return f"<Attachment {self.filename}>"

class SessionShare(Base):
    """Shareable links for chat sessions"""
    __tablename__ = 'session_shares'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey('ai_chat_sessions.id', ondelete='CASCADE'), nullable=False, index=True)
    token = Column(String(100), unique=True, nullable=False, index=True)
    permission = Column(String(20), nullable=False, default='view')  # view, comment, edit
    expires_at = Column(DateTime, nullable=True)
    require_auth = Column(Boolean, nullable=False, default=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    
    # Relationships
    session = relationship("ChatSession", back_populates="shares")
    creator = relationship("User", foreign_keys=[created_by])
    
    @property
    def is_expired(self):
        if self.expires_at is None:
            return False
        return datetime.utcnow() > self.expires_at
    
    def __repr__(self):
        return f"<SessionShare {self.token[:8]}...>"

class SessionCollaborator(Base):
    """Users who have access to collaborate on a chat session"""
    __tablename__ = 'session_collaborators'
    
    session_id = Column(UUID(as_uuid=True), ForeignKey('ai_chat_sessions.id', ondelete='CASCADE'), primary_key=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)
    permission = Column(String(20), nullable=False, default='view')  # view, comment, edit
    added_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    
    # Relationships
    session = relationship("ChatSession", back_populates="collaborators")
    user = relationship("User")
    
    def __repr__(self):
        return f"<SessionCollaborator session={self.session_id} user={self.user_id}>"

class MessageComment(Base):
    """Comments on AI assistant messages"""
    __tablename__ = 'message_comments'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_id = Column(UUID(as_uuid=True), ForeignKey('ai_chat_messages.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=True, onupdate=datetime.utcnow)
    
    # Relationships
    message = relationship("ChatMessage", back_populates="comments")
    user = relationship("User")
    
    def __repr__(self):
        return f"<MessageComment {self.id}>"


# Note: Relationships are defined directly in chat.py and user.py models
# No dynamic assignment needed
