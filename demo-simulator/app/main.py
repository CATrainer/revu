"""Main FastAPI application for demo simulator."""
import logging
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
import uuid

from app.core.config import settings
from app.core.database import get_async_session, init_db
from app.models import DemoProfile
from app.services.simulation_engine import SimulationEngine

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    debug=settings.DEBUG,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Schemas
class ProfileCreate(BaseModel):
    user_id: str
    profile_type: str  # 'auto' or 'manual'
    niche: Optional[str] = 'tech_reviews'
    personality: Optional[str] = 'friendly_professional'
    
    # YouTube config
    yt_subscribers: Optional[int] = 100000
    yt_avg_views: Optional[int] = 50000
    yt_upload_frequency: Optional[str] = 'daily'
    
    # Instagram config
    ig_followers: Optional[int] = 50000
    ig_post_frequency: Optional[str] = 'daily'
    
    # TikTok config
    tt_followers: Optional[int] = 200000
    tt_post_frequency: Optional[str] = 'daily'
    
    # Activity
    comment_volume: Optional[str] = 'medium'
    dm_frequency: Optional[str] = 'medium'


class ProfileResponse(BaseModel):
    id: str
    user_id: str
    profile_type: str
    niche: str
    is_active: bool
    created_at: str


# Routes
@app.on_event("startup")
async def startup_event():
    """Initialize database on startup."""
    logger.info("Starting demo simulator service...")
    await init_db()
    logger.info("Database initialized")


@app.get("/")
async def root():
    """Health check."""
    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "operational",
    }


@app.post("/profiles", response_model=ProfileResponse)
async def create_profile(
    payload: ProfileCreate,
    session: AsyncSession = Depends(get_async_session)
):
    """Create a new demo profile."""
    
    # Check if user already has a profile
    stmt = select(DemoProfile).where(DemoProfile.user_id == uuid.UUID(payload.user_id))
    result = await session.execute(stmt)
    existing = result.scalar_one_or_none()
    
    if existing:
        if existing.is_active:
            raise HTTPException(400, "User already has an active demo profile")
        else:
            # Reactivate existing profile
            existing.is_active = True
            await session.commit()
            
            logger.info(f"Reactivated demo profile for user {payload.user_id}")
            
            # Create fresh content for reactivated profile
            engine = SimulationEngine()
            await engine.create_content(session, existing, 'youtube')
            await engine.create_content(session, existing, 'instagram')
            await engine.create_content(session, existing, 'tiktok')
            
            return ProfileResponse(
                id=str(existing.id),
                user_id=str(existing.user_id),
                profile_type=existing.profile_type,
                niche=existing.niche,
                is_active=True,
                created_at=existing.created_at.isoformat(),
            )
    
    # Create new profile
    profile = DemoProfile(
        user_id=uuid.UUID(payload.user_id),
        profile_type=payload.profile_type,
        niche=payload.niche,
        personality=payload.personality,
        yt_subscribers=payload.yt_subscribers,
        yt_avg_views=payload.yt_avg_views,
        yt_upload_frequency=payload.yt_upload_frequency,
        ig_followers=payload.ig_followers,
        ig_post_frequency=payload.ig_post_frequency,
        tt_followers=payload.tt_followers,
        tt_post_frequency=payload.tt_post_frequency,
        comment_volume=payload.comment_volume,
        dm_frequency=payload.dm_frequency,
    )
    
    session.add(profile)
    await session.commit()
    await session.refresh(profile)
    
    logger.info(f"Created demo profile for user {payload.user_id}")
    
    # Trigger initial content creation
    engine = SimulationEngine()
    await engine.create_content(session, profile, 'youtube')
    await engine.create_content(session, profile, 'instagram')
    await engine.create_content(session, profile, 'tiktok')
    
    return ProfileResponse(
        id=str(profile.id),
        user_id=str(profile.user_id),
        profile_type=profile.profile_type,
        niche=profile.niche,
        is_active=True,
        created_at=profile.created_at.isoformat(),
    )


@app.get("/profiles/{user_id}")
async def get_profile(
    user_id: str,
    session: AsyncSession = Depends(get_async_session)
):
    """Get demo profile for a user."""
    stmt = select(DemoProfile).where(DemoProfile.user_id == uuid.UUID(user_id))
    result = await session.execute(stmt)
    profile = result.scalar_one_or_none()
    
    if not profile:
        raise HTTPException(404, "Profile not found")
    
    return {
        "id": str(profile.id),
        "user_id": str(profile.user_id),
        "profile_type": profile.profile_type,
        "niche": profile.niche,
        "is_active": profile.is_active,
        "yt_subscribers": profile.yt_subscribers,
        "ig_followers": profile.ig_followers,
        "tt_followers": profile.tt_followers,
        "created_at": profile.created_at.isoformat(),
    }


@app.delete("/profiles/{user_id}")
async def delete_profile(
    user_id: str,
    session: AsyncSession = Depends(get_async_session)
):
    """Deactivate a demo profile."""
    stmt = select(DemoProfile).where(DemoProfile.user_id == uuid.UUID(user_id))
    result = await session.execute(stmt)
    profile = result.scalar_one_or_none()
    
    if not profile:
        raise HTTPException(404, "Profile not found")
    
    profile.is_active = False
    await session.commit()
    
    return {"status": "deactivated"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
