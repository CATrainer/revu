"""User AI Preferences - Custom instructions, response style, expertise level"""
from __future__ import annotations

import json
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel

from app.core.database import get_async_session
from app.core.security import get_current_active_user
from app.models.user import User

router = APIRouter()

# --- Archive Settings Models ---
from pydantic import BaseModel, Field

class ArchiveSettings(BaseModel):
    archive_inactive_days: int = Field(7, ge=3, le=30)
    archive_delete_days: int = Field(30, ge=7, le=90)

# --- Profile Update Model ---
class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None


class UserAIPreferences(BaseModel):
    custom_instructions: Optional[str] = None
    response_style: Optional[str] = None  # concise, detailed, bullet_points
    expertise_level: Optional[str] = None  # beginner, intermediate, expert
    tone: Optional[str] = None  # professional, casual, friendly
    preferences: Optional[dict] = None


@router.get("/preferences")
async def get_ai_preferences(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Get user's AI preferences."""
    
    result = await db.execute(
        text("""
            SELECT custom_instructions, response_style, expertise_level, tone, preferences
            FROM user_ai_preferences
            WHERE user_id = :uid
        """),
        {"uid": str(current_user.id)}
    )
    
    prefs = result.first()
    
    if not prefs:
        # Return defaults
        return {
            "custom_instructions": None,
            "response_style": "balanced",
            "expertise_level": "intermediate",
            "tone": "friendly",
            "preferences": {}
        }
    
    return {
        "custom_instructions": prefs.custom_instructions,
        "response_style": prefs.response_style or "balanced",
        "expertise_level": prefs.expertise_level or "intermediate",
        "tone": prefs.tone or "friendly",
        "preferences": prefs.preferences or {}
    }


    # --- Archive Settings Endpoints ---
    @router.get("/archive-settings", response_model=ArchiveSettings)
    async def get_archive_settings(
        db: AsyncSession = Depends(get_async_session),
        current_user: User = Depends(get_current_active_user),
    ):
        user = await db.get(User, current_user.id)
        return ArchiveSettings(
            archive_inactive_days=getattr(user, 'archive_inactive_days', 7) or 7,
            archive_delete_days=getattr(user, 'archive_delete_days', 30) or 30
        )

    @router.put("/archive-settings", response_model=ArchiveSettings)
    async def update_archive_settings(
        settings: ArchiveSettings,
        db: AsyncSession = Depends(get_async_session),
        current_user: User = Depends(get_current_active_user),
    ):
        user = await db.get(User, current_user.id)
        user.archive_inactive_days = settings.archive_inactive_days
        user.archive_delete_days = settings.archive_delete_days
        await db.commit()
        return settings

    # --- Profile Endpoints ---
    @router.get("/profile")
    async def get_profile(
        db: AsyncSession = Depends(get_async_session),
        current_user: User = Depends(get_current_active_user),
    ):
        user = await db.get(User, current_user.id)
        return {
            "full_name": user.full_name,
            "phone": user.phone,
            "email": user.email,
            "created_at": user.created_at,
        }

    @router.put("/profile")
    async def update_profile(
        update: ProfileUpdate,
        db: AsyncSession = Depends(get_async_session),
        current_user: User = Depends(get_current_active_user),
    ):
        user = await db.get(User, current_user.id)
        if update.full_name is not None:
            user.full_name = update.full_name
        if update.phone is not None:
            user.phone = update.phone
        await db.commit()
        return {"message": "Profile updated"}


@router.put("/preferences")
async def update_ai_preferences(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    preferences: UserAIPreferences,
):
    """Update user's AI preferences."""
    
    # Upsert preferences
    await db.execute(
        text("""
            INSERT INTO user_ai_preferences 
            (user_id, custom_instructions, response_style, expertise_level, tone, preferences, updated_at)
            VALUES (:uid, :custom, :style, :expertise, :tone, :prefs, NOW())
            ON CONFLICT (user_id)
            DO UPDATE SET
                custom_instructions = EXCLUDED.custom_instructions,
                response_style = EXCLUDED.response_style,
                expertise_level = EXCLUDED.expertise_level,
                tone = EXCLUDED.tone,
                preferences = EXCLUDED.preferences,
                updated_at = NOW()
        """),
        {
            "uid": str(current_user.id),
            "custom": preferences.custom_instructions,
            "style": preferences.response_style,
            "expertise": preferences.expertise_level,
            "tone": preferences.tone,
            "prefs": json.dumps(preferences.preferences or {})
        }
    )
    await db.commit()
    
    return {"message": "Preferences updated successfully"}


@router.delete("/preferences")
async def reset_ai_preferences(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Reset user's AI preferences to defaults."""
    
    await db.execute(
        text("DELETE FROM user_ai_preferences WHERE user_id = :uid"),
        {"uid": str(current_user.id)}
    )
    await db.commit()
    
    return {"message": "Preferences reset to defaults"}


@router.post("/preferences/analyze")
async def analyze_usage_patterns(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Analyze user's chat history to suggest optimal preferences."""
    
    # Get user's chat history
    result = await db.execute(
        text("""
            SELECT role, content, created_at
            FROM ai_chat_messages m
            JOIN ai_chat_sessions s ON m.session_id = s.id
            WHERE s.user_id = :uid
            ORDER BY m.created_at DESC
            LIMIT 50
        """),
        {"uid": str(current_user.id)}
    )
    
    messages = [dict(r._mapping) for r in result.fetchall()]
    
    if len(messages) < 10:
        raise HTTPException(
            status_code=400,
            detail="Not enough chat history to analyze. Have at least 10 messages first."
        )
    
    # Analyze patterns
    user_messages = [m for m in messages if m['role'] == 'user']
    
    # Simple heuristics (could use Claude for better analysis)
    avg_length = sum(len(m['content']) for m in user_messages) / len(user_messages)
    
    # Determine suggested style based on message length
    if avg_length < 50:
        suggested_style = "concise"
    elif avg_length > 200:
        suggested_style = "detailed"
    else:
        suggested_style = "balanced"
    
    # Check for technical keywords
    technical_keywords = ['api', 'code', 'function', 'algorithm', 'database', 'deploy']
    has_technical = any(
        any(keyword in m['content'].lower() for keyword in technical_keywords)
        for m in user_messages
    )
    
    suggested_expertise = "expert" if has_technical else "intermediate"
    
    # Check tone from existing assistant responses
    assistant_messages = [m for m in messages if m['role'] == 'assistant']
    has_casual_language = any(
        any(word in m['content'].lower() for word in ['hey', 'cool', 'awesome', 'gonna'])
        for m in assistant_messages
    )
    
    suggested_tone = "casual" if has_casual_language else "professional"
    
    return {
        "suggestions": {
            "response_style": suggested_style,
            "expertise_level": suggested_expertise,
            "tone": suggested_tone
        },
        "analysis": {
            "message_count": len(messages),
            "avg_user_message_length": round(avg_length, 1),
            "technical_content_detected": has_technical
        }
    }
