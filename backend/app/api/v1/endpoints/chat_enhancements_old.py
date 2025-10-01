"""
API endpoints for chat enhancements: tags, search, export, share, attachments, comments
"""
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Query, status
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import or_, and_, func, select
from typing import List, Optional
from datetime import datetime, timedelta
import secrets
import io

from app.core.database import get_async_session
from app.core.security import get_current_user
from app.models.user import User
from app.models.chat import ChatSession, ChatMessage
from app.models.chat_enhancements import Tag, Attachment, SessionShare, SessionCollaborator, MessageComment, session_tags
from pydantic import BaseModel, EmailStr, validator

router = APIRouter()

# ===== PYDANTIC SCHEMAS =====

class TagCreate(BaseModel):
    name: str
    color: str = "#3b82f6"
    
    @validator('name')
    def name_must_not_be_empty(cls, v):
        if not v.strip():
            raise ValueError('Tag name cannot be empty')
        return v.strip()[:50]

class TagResponse(BaseModel):
    id: str
    name: str
    color: str
    
    class Config:
        from_attributes = True

class SessionTagsUpdate(BaseModel):
    tag_ids: List[str]

class SearchFilters(BaseModel):
    query: str
    tags: Optional[List[str]] = None
    starred: Optional[bool] = None
    archived: Optional[bool] = False

class StarUpdate(BaseModel):
    starred: bool

class ArchiveUpdate(BaseModel):
    archived: bool

class ShareCreate(BaseModel):
    permission: str = "view"
    expires_in: Optional[int] = None
    require_auth: bool = True
    
    @validator('permission')
    def permission_must_be_valid(cls, v):
        if v not in ['view', 'comment', 'edit']:
            raise ValueError('Permission must be view, comment, or edit')
        return v

class ShareResponse(BaseModel):
    share_url: str
    token: str
    expires_at: Optional[datetime] = None

class CollaboratorInvite(BaseModel):
    email: EmailStr
    permission: str = "view"

class CommentCreate(BaseModel):
    content: str
    
    @validator('content')
    def content_must_not_be_empty(cls, v):
        if not v.strip():
            raise ValueError('Comment cannot be empty')
        return v.strip()

class CommentResponse(BaseModel):
    id: str
    user_id: str
    user_name: str
    content: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# ===== TAGS ENDPOINTS =====

@router.get("/tags", response_model=List[TagResponse])
async def get_user_tags(
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Get all tags for the current user"""
    result = await db.execute(select(Tag).filter(Tag.user_id == current_user.id).order_by(Tag.name))
    tags = result.scalars().all()
    return tags

@router.post("/tags", response_model=TagResponse, status_code=status.HTTP_201_CREATED)
async def create_tag(
    tag: TagCreate,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Create a new tag"""
    # Check if tag already exists
    result = await db.execute(select(Tag).filter(
        Tag.user_id == current_user.id,
        Tag.name == tag.name
    ))
    existing = result.scalar_one_or_none()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tag with this name already exists"
        )
    
    new_tag = Tag(
        user_id=current_user.id,
        name=tag.name,
        color=tag.color
    )
    db.add(new_tag)
    await db.commit()
    await db.refresh(new_tag)
    return new_tag

@router.delete("/tags/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tag(
    tag_id: str,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Delete a tag"""
    tag = db.query(Tag).filter(
        Tag.id == tag_id,
        Tag.user_id == current_user.id
    ).first()
    
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    
    db.delete(tag)
    db.commit()
    return None

@router.post("/sessions/{session_id}/tags", status_code=status.HTTP_200_OK)
def update_session_tags(
    session_id: str,
    tags_update: SessionTagsUpdate,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Update tags for a session"""
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Get valid tags
    valid_tags = db.query(Tag).filter(
        Tag.id.in_(tags_update.tag_ids),
        Tag.user_id == current_user.id
    ).all()
    
    # Update session tags
    session.tags = valid_tags
    db.commit()
    
    return {"message": "Tags updated successfully", "tags": [TagResponse.from_orm(t) for t in valid_tags]}

# ===== SEARCH ENDPOINT =====

@router.get("/search")
def search_conversations(
    q: str = Query(..., min_length=1, description="Search query"),
    tags: Optional[str] = Query(None, description="Comma-separated tag IDs"),
    starred: Optional[bool] = Query(None),
    archived: Optional[bool] = Query(False),
    limit: int = Query(50, le=100),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Search conversations with full-text search and filters"""
    
    # Base query
    query = db.query(ChatSession).filter(ChatSession.user_id == current_user.id)
    
    # Apply archived filter
    query = query.filter(ChatSession.archived == archived)
    
    # Apply starred filter
    if starred is not None:
        query = query.filter(ChatSession.starred == starred)
    
    # Apply tag filter
    if tags:
        tag_ids = [t.strip() for t in tags.split(',') if t.strip()]
        if tag_ids:
            query = query.join(session_tags).filter(session_tags.c.tag_id.in_(tag_ids))
    
    # Full-text search on title and messages
    search_term = q.strip()
    if search_term:
        # Search in session titles
        title_matches = query.filter(
            func.to_tsvector('english', ChatSession.title).match(search_term)
        )
        
        # Search in messages
        message_session_ids = db.query(ChatMessage.session_id).filter(
            ChatMessage.session_id.in_(query.with_entities(ChatSession.id)),
            func.to_tsvector('english', ChatMessage.content).match(search_term)
        ).distinct()
        
        # Combine results
        query = query.filter(
            or_(
                ChatSession.id.in_(message_session_ids),
                func.to_tsvector('english', ChatSession.title).match(search_term)
            )
        )
    
    # Get total count
    total = query.count()
    
    # Paginate and sort by relevance/date
    sessions = query.order_by(ChatSession.updated_at.desc()).limit(limit).offset(offset).all()
    
    return {
        "items": sessions,
        "total": total,
        "limit": limit,
        "offset": offset
    }

# ===== STAR/ARCHIVE ENDPOINTS =====

@router.post("/sessions/{session_id}/star")
def toggle_star(
    session_id: str,
    star_update: StarUpdate,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Star or unstar a session"""
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session.starred = star_update.starred
    db.commit()
    
    return {"message": "Star status updated", "starred": session.starred}

@router.post("/sessions/{session_id}/archive")
def toggle_archive(
    session_id: str,
    archive_update: ArchiveUpdate,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Archive or unarchive a session"""
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session.archived = archive_update.archived
    db.commit()
    
    return {"message": "Archive status updated", "archived": session.archived}

# ===== SHARE ENDPOINTS =====

@router.post("/sessions/{session_id}/share", response_model=ShareResponse)
def create_share_link(
    session_id: str,
    share: ShareCreate,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Create a shareable link for a session"""
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Generate unique token
    token = secrets.token_urlsafe(32)
    
    # Calculate expiration
    expires_at = None
    if share.expires_in:
        expires_at = datetime.utcnow() + timedelta(days=share.expires_in)
    
    # Create share
    new_share = SessionShare(
        session_id=session_id,
        token=token,
        permission=share.permission,
        expires_at=expires_at,
        require_auth=share.require_auth,
        created_by=current_user.id
    )
    db.add(new_share)
    db.commit()
    
    # Construct share URL (adjust domain as needed)
    share_url = f"https://app.repruv.com/shared/{token}"
    
    return ShareResponse(
        share_url=share_url,
        token=token,
        expires_at=expires_at
    )

@router.get("/shared/{token}")
def get_shared_session(
    token: str,
    db: AsyncSession = Depends(get_async_session),
    current_user: Optional[User] = Depends(get_current_user)
):
    """Access a shared session via token"""
    share = db.query(SessionShare).filter(SessionShare.token == token).first()
    
    if not share:
        raise HTTPException(status_code=404, detail="Share link not found")
    
    if share.is_expired:
        raise HTTPException(status_code=410, detail="Share link has expired")
    
    if share.require_auth and not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    session = db.query(ChatSession).filter(ChatSession.id == share.session_id).first()
    
    return {
        "session": session,
        "permission": share.permission
    }

# ===== FILE UPLOAD ENDPOINT =====

@router.post("/attachments")
async def upload_attachment(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Upload a file attachment"""
    
    # Validate file size (10MB limit)
    MAX_SIZE = 10 * 1024 * 1024
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds 10MB limit"
        )
    
    # TODO: Upload to Cloudflare R2
    # For now, return a placeholder
    # In production, integrate with Cloudflare R2 SDK
    
    storage_url = f"https://storage.repruv.com/attachments/{secrets.token_urlsafe(16)}/{file.filename}"
    
    return {
        "id": str(secrets.token_urlsafe(16)),
        "filename": file.filename,
        "file_type": file.content_type,
        "file_size": len(content),
        "storage_url": storage_url
    }

# ===== EXPORT ENDPOINT =====

@router.get("/sessions/{session_id}/export")
def export_session(
    session_id: str,
    format: str = Query("markdown", regex="^(markdown|text|json)$"),
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Export a session in various formats"""
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    messages = db.query(ChatMessage).filter(
        ChatMessage.session_id == session_id
    ).order_by(ChatMessage.created_at).all()
    
    if format == "markdown":
        content = f"# {session.title}\n\n"
        content += f"**Exported:** {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}\n\n"
        content += f"**Messages:** {len(messages)}\n\n---\n\n"
        
        for msg in messages:
            role = "👤 You" if msg.role == "user" else "🤖 AI"
            content += f"### {role}\n\n{msg.content}\n\n---\n\n"
        
        return StreamingResponse(
            io.BytesIO(content.encode()),
            media_type="text/markdown",
            headers={"Content-Disposition": f"attachment; filename={session.title}.md"}
        )
    
    elif format == "text":
        content = f"{session.title}\n{'='*len(session.title)}\n\n"
        content += f"Exported: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}\n\n"
        
        for msg in messages:
            role = "YOU" if msg.role == "user" else "AI"
            content += f"{role}:\n{msg.content}\n\n{'-'*50}\n\n"
        
        return StreamingResponse(
            io.BytesIO(content.encode()),
            media_type="text/plain",
            headers={"Content-Disposition": f"attachment; filename={session.title}.txt"}
        )
    
    else:  # json
        data = {
            "session": {
                "id": str(session.id),
                "title": session.title,
                "created_at": session.created_at.isoformat(),
            },
            "messages": [
                {
                    "role": msg.role,
                    "content": msg.content,
                    "created_at": msg.created_at.isoformat()
                }
                for msg in messages
            ]
        }
        
        import json
        return StreamingResponse(
            io.BytesIO(json.dumps(data, indent=2).encode()),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename={session.title}.json"}
        )

# ===== COMMENTS ENDPOINTS =====

@router.post("/messages/{message_id}/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
def add_comment(
    message_id: str,
    comment: CommentCreate,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Add a comment to a message"""
    message = db.query(ChatMessage).filter(ChatMessage.id == message_id).first()
    
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Verify user has access to this session
    session = db.query(ChatSession).filter(ChatSession.id == message.session_id).first()
    if session.user_id != current_user.id:
        # Check if user is a collaborator
        collaborator = db.query(SessionCollaborator).filter(
            SessionCollaborator.session_id == message.session_id,
            SessionCollaborator.user_id == current_user.id
        ).first()
        
        if not collaborator:
            raise HTTPException(status_code=403, detail="Access denied")
    
    new_comment = MessageComment(
        message_id=message_id,
        user_id=current_user.id,
        content=comment.content
    )
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)
    
    return CommentResponse(
        id=str(new_comment.id),
        user_id=str(current_user.id),
        user_name=current_user.full_name or current_user.email,
        content=new_comment.content,
        created_at=new_comment.created_at,
        updated_at=new_comment.updated_at
    )

@router.get("/messages/{message_id}/comments", response_model=List[CommentResponse])
def get_comments(
    message_id: str,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Get all comments for a message"""
    comments = db.query(MessageComment).filter(
        MessageComment.message_id == message_id
    ).order_by(MessageComment.created_at).all()
    
    return [
        CommentResponse(
            id=str(c.id),
            user_id=str(c.user_id),
            user_name=c.user.full_name or c.user.email,
            content=c.content,
            created_at=c.created_at,
            updated_at=c.updated_at
        )
        for c in comments
    ]

@router.put("/comments/{comment_id}")
def update_comment(
    comment_id: str,
    comment_update: CommentCreate,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Update a comment"""
    comment = db.query(MessageComment).filter(
        MessageComment.id == comment_id,
        MessageComment.user_id == current_user.id
    ).first()
    
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    comment.content = comment_update.content
    comment.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Comment updated"}

@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_comment(
    comment_id: str,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Delete a comment"""
    comment = db.query(MessageComment).filter(
        MessageComment.id == comment_id,
        MessageComment.user_id == current_user.id
    ).first()
    
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    db.delete(comment)
    db.commit()
    return None

# ===== MESSAGE EDITING =====

@router.put("/messages/{message_id}")
def edit_message(
    message_id: str,
    content: str,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Edit a message and trigger regeneration"""
    message = db.query(ChatMessage).filter(ChatMessage.id == message_id).first()
    
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Verify ownership
    session = db.query(ChatSession).filter(ChatSession.id == message.session_id).first()
    if session.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Only allow editing user messages
    if message.role != "user":
        raise HTTPException(status_code=400, detail="Can only edit user messages")
    
    # Update message
    message.content = content
    message.updated_at = datetime.utcnow()
    
    # Delete all messages after this one
    db.query(ChatMessage).filter(
        ChatMessage.session_id == message.session_id,
        ChatMessage.created_at > message.created_at
    ).delete()
    
    db.commit()
    
    return {"message": "Message updated", "regenerate": True}
