"""Conversation Templates - Pre-built and custom conversation starters"""
from __future__ import annotations

import json
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Body, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel

from app.core.database import get_async_session
from app.core.security import get_current_active_user
from app.models.user import User

router = APIRouter()


class Template(BaseModel):
    id: str
    title: str
    description: str
    category: str
    initial_prompt: str
    system_instructions: Optional[str] = None
    usage_count: int
    is_active: bool


class CreateTemplateRequest(BaseModel):
    title: str
    description: str
    category: str
    initial_prompt: str
    system_instructions: Optional[str] = None


class UseTemplateResponse(BaseModel):
    session_id: str
    template_id: str
    initial_message: Optional[str] = None


# Pre-populated default templates
DEFAULT_TEMPLATES = [
    {
        "title": "Content Strategy Session",
        "description": "Plan your content strategy and growth approach",
        "category": "strategy",
        "initial_prompt": "I want to develop a comprehensive content strategy for my social media. Help me analyze my audience, set goals, and create a posting plan.",
        "system_instructions": "You are a content strategy expert. Help the user develop data-driven strategies focused on engagement, growth, and audience building. Ask clarifying questions about their niche, goals, and current performance."
    },
    {
        "title": "Caption Writer",
        "description": "Generate engaging captions for your posts",
        "category": "content_creation",
        "initial_prompt": "I need help writing engaging captions for my upcoming posts. I'll describe the content and you help me craft compelling copy.",
        "system_instructions": "You are a social media copywriter specializing in viral, engaging captions. Use storytelling, hooks, calls-to-action, and relevant hashtags. Match the user's brand voice."
    },
    {
        "title": "Audience Analysis",
        "description": "Deep dive into your audience demographics and behavior",
        "category": "analytics",
        "initial_prompt": "Help me understand my audience better. Analyze who they are, what they want, and how I can serve them better.",
        "system_instructions": "You are an audience insights analyst. Help users understand their audience demographics, psychographics, pain points, and content preferences. Provide actionable recommendations."
    },
    {
        "title": "Competitor Research",
        "description": "Analyze competitors and find your edge",
        "category": "research",
        "initial_prompt": "I want to research my competitors to understand what's working in my niche and find my unique angle.",
        "system_instructions": "You are a competitive intelligence analyst. Help users identify competitors, analyze their strategies, find gaps, and develop unique positioning. Focus on differentiation."
    },
    {
        "title": "Trend Analysis",
        "description": "Identify and capitalize on trending topics",
        "category": "research",
        "initial_prompt": "Help me identify current trends in my niche and create content that capitalizes on them.",
        "system_instructions": "You are a trend forecasting expert. Help users spot emerging trends, understand their relevance, and create timely content. Focus on actionable trend application."
    },
    {
        "title": "Crisis Management",
        "description": "Handle negative feedback and PR issues",
        "category": "management",
        "initial_prompt": "I need help handling a challenging situation with negative comments or PR issues.",
        "system_instructions": "You are a crisis management specialist. Help users respond professionally to negative situations, protect their reputation, and turn challenges into opportunities. Provide specific response templates."
    },
    {
        "title": "Brand Voice Development",
        "description": "Define and refine your unique brand voice",
        "category": "branding",
        "initial_prompt": "Help me develop a consistent, authentic brand voice that resonates with my audience.",
        "system_instructions": "You are a brand strategist. Help users define their tone, personality, values, and communication style. Create a brand voice guide with examples."
    },
    {
        "title": "Content Calendar Planning",
        "description": "Create a structured 30-day posting schedule",
        "category": "planning",
        "initial_prompt": "Help me create a detailed 30-day content calendar with specific post ideas, timing, and formats.",
        "system_instructions": "You are a content planning expert. Create structured, realistic content calendars with specific themes, formats, and posting times. Consider platform algorithms and audience activity."
    },
    {
        "title": "Engagement Optimization",
        "description": "Boost your engagement rates and community interaction",
        "category": "growth",
        "initial_prompt": "My engagement has plateaued. Help me develop strategies to increase likes, comments, shares, and meaningful interactions.",
        "system_instructions": "You are an engagement specialist. Analyze what drives engagement, suggest tactical improvements, and provide specific content formats and CTAs that boost interaction."
    },
    {
        "title": "Instagram Reels Strategy",
        "description": "Master short-form video for maximum reach",
        "category": "platform_specific",
        "initial_prompt": "Help me create a winning Instagram Reels strategy to grow my reach and engagement.",
        "system_instructions": "You are an Instagram Reels expert. Provide trending audio suggestions, hook formulas, editing tips, and posting strategies specific to Reels algorithm."
    },
    {
        "title": "YouTube Growth Blueprint",
        "description": "Optimize your YouTube channel for subscribers and views",
        "category": "platform_specific",
        "initial_prompt": "Help me grow my YouTube channel with better titles, thumbnails, and content strategy.",
        "system_instructions": "You are a YouTube growth strategist. Focus on CTR optimization, watch time, SEO, thumbnail design, and content formats that drive subscriptions."
    },
    {
        "title": "TikTok Viral Formula",
        "description": "Crack the TikTok algorithm and go viral",
        "category": "platform_specific",
        "initial_prompt": "Help me understand TikTok's algorithm and create content that has viral potential.",
        "system_instructions": "You are a TikTok viral content expert. Explain For You Page mechanics, trending sounds, hook patterns, and content formats with highest viral potential."
    },
    {
        "title": "Monetization Strategy",
        "description": "Turn your audience into sustainable revenue",
        "category": "business",
        "initial_prompt": "Help me develop a monetization strategy for my social media presence.",
        "system_instructions": "You are a creator economy expert. Suggest revenue streams (sponsorships, products, affiliates, memberships), pricing strategies, and pitch templates."
    },
    {
        "title": "Collaboration Outreach",
        "description": "Partner with brands and creators effectively",
        "category": "business",
        "initial_prompt": "Help me identify collaboration opportunities and craft compelling outreach messages.",
        "system_instructions": "You are a creator partnerships specialist. Help identify suitable partners, craft professional pitches, negotiate terms, and structure win-win collaborations."
    },
    {
        "title": "Analytics Deep Dive",
        "description": "Understand your metrics and optimize performance",
        "category": "analytics",
        "initial_prompt": "Help me interpret my social media analytics and use data to improve my content.",
        "system_instructions": "You are a social media analyst. Explain metrics, identify patterns, spot opportunities, and translate data into actionable content improvements."
    }
]


async def ensure_default_templates(db: AsyncSession):
    """Ensure default templates exist in database."""
    for template in DEFAULT_TEMPLATES:
        await db.execute(
            text("""
                INSERT INTO content_templates 
                (id, title, description, category, initial_prompt, system_instructions, is_active)
                VALUES (gen_random_uuid(), :title, :desc, :cat, :prompt, :sys, true)
                ON CONFLICT (title) DO NOTHING
            """),
            {
                "title": template["title"],
                "desc": template["description"],
                "cat": template["category"],
                "prompt": template["initial_prompt"],
                "sys": template["system_instructions"]
            }
        )
    await db.commit()


@router.get("/templates", response_model=List[Template])
async def list_templates(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
):
    """List all available conversation templates."""
    
    # Ensure defaults exist
    await ensure_default_templates(db)
    
    query = """
        SELECT id, title, description, category, initial_prompt, 
               system_instructions, usage_count, is_active
        FROM content_templates
        WHERE is_active = true
    """
    params = {}
    
    if category:
        query += " AND category = :cat"
        params["cat"] = category
    
    if search:
        query += " AND (title ILIKE :search OR description ILIKE :search)"
        params["search"] = f"%{search}%"
    
    query += " ORDER BY usage_count DESC, title ASC"
    
    result = await db.execute(text(query), params)
    templates = result.fetchall()
    
    return [
        Template(
            id=str(t.id),
            title=t.title,
            description=t.description,
            category=t.category,
            initial_prompt=t.initial_prompt,
            system_instructions=t.system_instructions,
            usage_count=t.usage_count,
            is_active=t.is_active
        )
        for t in templates
    ]


@router.get("/templates/categories")
async def list_categories(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Get all template categories with counts."""
    
    result = await db.execute(
        text("""
            SELECT category, COUNT(*) as count
            FROM content_templates
            WHERE is_active = true
            GROUP BY category
            ORDER BY count DESC
        """)
    )
    
    categories = result.fetchall()
    
    return [
        {"category": c.category, "count": c.count, "label": c.category.replace('_', ' ').title()}
        for c in categories
    ]


@router.post("/templates/{template_id}/use", response_model=UseTemplateResponse)
async def use_template(
    *,
    template_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Start a new conversation from a template."""
    
    # Get template
    template_result = await db.execute(
        text("""
            SELECT title, initial_prompt, system_instructions
            FROM content_templates
            WHERE id = :tid AND is_active = true
        """),
        {"tid": str(template_id)}
    )
    template = template_result.first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Create new session
    session_result = await db.execute(
        text("""
            INSERT INTO ai_chat_sessions 
            (id, user_id, title, mode, status, created_at, updated_at)
            VALUES (gen_random_uuid(), :uid, :title, 'general', 'active', NOW(), NOW())
            RETURNING id
        """),
        {
            "uid": str(current_user.id),
            "title": template.title
        }
    )
    session_id = session_result.scalar_one()
    
    # Increment usage count
    await db.execute(
        text("UPDATE content_templates SET usage_count = usage_count + 1 WHERE id = :tid"),
        {"tid": str(template_id)}
    )
    
    # Insert initial user message
    await db.execute(
        text("""
            INSERT INTO ai_chat_messages 
            (id, session_id, user_id, role, content, created_at)
            VALUES (gen_random_uuid(), :sid, :uid, 'user', :content, NOW())
        """),
        {
            "sid": str(session_id),
            "uid": str(current_user.id),
            "content": template.initial_prompt
        }
    )
    
    await db.commit()
    
    return UseTemplateResponse(
        session_id=str(session_id),
        template_id=str(template_id),
        initial_message=None  # Will be generated via normal chat flow
    )


@router.post("/templates")
async def create_custom_template(
    *,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    template: CreateTemplateRequest,
):
    """Create a custom template (user-created)."""
    
    result = await db.execute(
        text("""
            INSERT INTO content_templates 
            (id, title, description, category, initial_prompt, system_instructions, is_active)
            VALUES (gen_random_uuid(), :title, :desc, :cat, :prompt, :sys, true)
            RETURNING id
        """),
        {
            "title": template.title,
            "desc": template.description,
            "cat": template.category,
            "prompt": template.initial_prompt,
            "sys": template.system_instructions
        }
    )
    template_id = result.scalar_one()
    await db.commit()
    
    return {"template_id": str(template_id), "message": "Template created successfully"}


@router.delete("/templates/{template_id}")
async def delete_template(
    *,
    template_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a custom template (soft delete)."""
    
    await db.execute(
        text("UPDATE content_templates SET is_active = false WHERE id = :tid"),
        {"tid": str(template_id)}
    )
    await db.commit()
    
    return {"message": "Template deleted successfully"}
