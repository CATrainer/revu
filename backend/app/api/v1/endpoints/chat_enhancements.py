"""
API endpoints for chat enhancements: tags, search, export, share, attachments, comments
"""
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Query, status
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import or_, and_, func, select, delete as sql_delete
from typing import List, Optional
from datetime import datetime, timedelta
import secrets
import io

from app.core.database import get_async_session
from app.core.security import get_current_user
from app.models.user import User
from app.models.chat import ChatSession, ChatMessage, session_tags
from app.models.chat_enhancements import Tag, Attachment, SessionShare, SessionCollaborator, MessageComment
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
async def delete_tag(
    tag_id: str,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Delete a tag"""
    result = await db.execute(select(Tag).filter(
        Tag.id == tag_id,
        Tag.user_id == current_user.id
    ))
    tag = result.scalar_one_or_none()
    
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    
    await db.delete(tag)
    await db.commit()
    return None

@router.post("/sessions/{session_id}/tags", status_code=status.HTTP_200_OK)
async def update_session_tags(
    session_id: str,
    tags_update: SessionTagsUpdate,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Update tags for a session"""
    result = await db.execute(select(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id
    ))
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Get valid tags
    result = await db.execute(select(Tag).filter(
        Tag.id.in_(tags_update.tag_ids),
        Tag.user_id == current_user.id
    ))
    valid_tags = result.scalars().all()
    
    # Update session tags
    session.tags = valid_tags
    await db.commit()
    
    return {"message": "Tags updated successfully", "tags": [TagResponse.from_orm(t) for t in valid_tags]}

# ===== SEARCH ENDPOINT =====

@router.get("/search")
async def search_conversations(
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
    query = select(ChatSession).filter(ChatSession.user_id == current_user.id)
    query = query.filter(ChatSession.archived == archived)
    
    # Apply starred filter
    if starred is not None:
        query = query.filter(ChatSession.starred == starred)
    
    # Apply tag filter
    if tags:
        tag_ids = [t.strip() for t in tags.split(',') if t.strip()]
        if tag_ids:
            query = query.join(session_tags).filter(session_tags.c.tag_id.in_(tag_ids))
    
    # Full-text search on title
    search_term = q.strip()
    if search_term:
        query = query.filter(
            func.to_tsvector('english', ChatSession.title).match(search_term)
        )
    
    # Get total count
    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar()
    
    # Paginate and sort by relevance/date
    query = query.order_by(ChatSession.updated_at.desc()).limit(limit).offset(offset)
    result = await db.execute(query)
    sessions = result.scalars().all()
    
    return {
        "items": sessions,
        "total": total,
        "limit": limit,
        "offset": offset
    }

# ===== STAR/ARCHIVE ENDPOINTS =====

@router.post("/sessions/{session_id}/star")
async def toggle_star(
    session_id: str,
    star_update: StarUpdate,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Star or unstar a session"""
    result = await db.execute(select(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id
    ))
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session.starred = star_update.starred
    await db.commit()
    
    return {"message": "Star status updated", "starred": session.starred}

@router.post("/sessions/{session_id}/archive")
async def toggle_archive(
    session_id: str,
    archive_update: ArchiveUpdate,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Archive or unarchive a session"""
    result = await db.execute(select(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id
    ))
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session.archived = archive_update.archived
    await db.commit()
    
    return {"message": "Archive status updated", "archived": session.archived}

# ===== SHARE ENDPOINTS =====

@router.post("/sessions/{session_id}/share", response_model=ShareResponse)
async def create_share_link(
    session_id: str,
    share: ShareCreate,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Create a shareable link for a session"""
    result = await db.execute(select(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id
    ))
    session = result.scalar_one_or_none()
    
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
    await db.commit()
    
    # Construct share URL (adjust domain as needed)
    share_url = f"https://app.repruv.com/shared/{token}"
    
    return ShareResponse(
        share_url=share_url,
        token=token,
        expires_at=expires_at
    )

@router.get("/shared/{token}")
async def get_shared_session(
    token: str,
    db: AsyncSession = Depends(get_async_session),
    current_user: Optional[User] = Depends(get_current_user)
):
    """Access a shared session via token"""
    result = await db.execute(select(SessionShare).filter(SessionShare.token == token))
    share = result.scalar_one_or_none()
    
    if not share:
        raise HTTPException(status_code=404, detail="Share link not found")
    
    if share.is_expired:
        raise HTTPException(status_code=410, detail="Share link has expired")
    
    if share.require_auth and not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    result = await db.execute(select(ChatSession).filter(ChatSession.id == share.session_id))
    session = result.scalar_one_or_none()
    
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
async def export_session(
    session_id: str,
    format: str = Query("markdown", pattern="^(markdown|text|json)$"),
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Export a session in various formats"""
    result = await db.execute(select(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id
    ))
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    result = await db.execute(select(ChatMessage).filter(
        ChatMessage.session_id == session_id
    ).order_by(ChatMessage.created_at))
    messages = result.scalars().all()
    
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
async def add_comment(
    message_id: str,
    comment: CommentCreate,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Add a comment to a message"""
    result = await db.execute(select(ChatMessage).filter(ChatMessage.id == message_id))
    message = result.scalar_one_or_none()
    
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Verify user has access to this session
    result = await db.execute(select(ChatSession).filter(ChatSession.id == message.session_id))
    session = result.scalar_one_or_none()
    if session.user_id != current_user.id:
        # Check if user is a collaborator
        result = await db.execute(select(SessionCollaborator).filter(
            SessionCollaborator.session_id == message.session_id,
            SessionCollaborator.user_id == current_user.id
        ))
        collaborator = result.scalar_one_or_none()
        
        if not collaborator:
            raise HTTPException(status_code=403, detail="Access denied")
    
    new_comment = MessageComment(
        message_id=message_id,
        user_id=current_user.id,
        content=comment.content
    )
    db.add(new_comment)
    await db.commit()
    await db.refresh(new_comment)
    
    return CommentResponse(
        id=str(new_comment.id),
        user_id=str(current_user.id),
        user_name=current_user.full_name or current_user.email,
        content=new_comment.content,
        created_at=new_comment.created_at,
        updated_at=new_comment.updated_at
    )

@router.get("/messages/{message_id}/comments", response_model=List[CommentResponse])
async def get_comments(
    message_id: str,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Get all comments for a message"""
    result = await db.execute(select(MessageComment).filter(
        MessageComment.message_id == message_id
    ).order_by(MessageComment.created_at))
    comments = result.scalars().all()
    
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
async def update_comment(
    comment_id: str,
    comment_update: CommentCreate,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Update a comment"""
    result = await db.execute(select(MessageComment).filter(
        MessageComment.id == comment_id,
        MessageComment.user_id == current_user.id
    ))
    comment = result.scalar_one_or_none()
    
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    comment.content = comment_update.content
    comment.updated_at = datetime.utcnow()
    await db.commit()
    
    return {"message": "Comment updated"}

@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    comment_id: str,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Delete a comment"""
    result = await db.execute(select(MessageComment).filter(
        MessageComment.id == comment_id,
        MessageComment.user_id == current_user.id
    ))
    comment = result.scalar_one_or_none()
    
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    await db.execute(sql_delete(MessageComment).filter(MessageComment.id == comment_id))
    await db.commit()
    return None

# ===== MESSAGE EDITING =====

@router.put("/messages/{message_id}")
async def edit_message(
    message_id: str,
    content: str,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Edit a message and trigger regeneration"""
    result = await db.execute(select(ChatMessage).filter(ChatMessage.id == message_id))
    message = result.scalar_one_or_none()
    
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Verify ownership
    result = await db.execute(select(ChatSession).filter(ChatSession.id == message.session_id))
    session = result.scalar_one_or_none()
    if session.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Only allow editing user messages
    if message.role != "user":
        raise HTTPException(status_code=400, detail="Can only edit user messages")
    
    # Update message
    message.content = content
    message.updated_at = datetime.utcnow()
    
    # Delete all messages after this one
    await db.execute(sql_delete(ChatMessage).filter(
        ChatMessage.session_id == message.session_id,
        ChatMessage.created_at > message.created_at
    ))
    
    await db.commit()
    
    return {"message": "Message updated", "regenerate": True}
