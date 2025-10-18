"""Main FastAPI application for demo simulator."""
import logging
from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
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


# Background task for content generation
async def generate_initial_content(user_id: str, profile_id: str):
    """Generate initial content in the background."""
    try:
        from app.services.insights_generator import InsightsContentGenerator
        
        # Get profile to retrieve niche
        from app.core.database import AsyncSessionLocal
        async with AsyncSessionLocal() as session:
            stmt = select(DemoProfile).where(DemoProfile.id == uuid.UUID(profile_id))
            result = await session.execute(stmt)
            profile = result.scalar_one_or_none()
            
            if not profile:
                logger.error(f"Profile {profile_id} not found for content generation")
                return
            
            # Generate full batch of content with insights
            generator = InsightsContentGenerator()
            result = await generator.generate_content_batch(
                user_id=user_id,
                niche=profile.niche,
                total_count=35,  # Generate 30-50 pieces
                backend_url=settings.MAIN_APP_URL + '/api/v1',
                session=session,  # CRITICAL: Pass session to save content locally
            )
            
            logger.info(f"Background content generation completed for user {user_id}: {result}")
    except Exception as e:
        logger.error(f"Error generating background content for user {user_id}: {e}")


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
    background_tasks: BackgroundTasks,
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
            
            # Schedule content creation in background
            background_tasks.add_task(generate_initial_content, payload.user_id, str(existing.id))
            
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
    
    # Schedule content creation in background
    background_tasks.add_task(generate_initial_content, payload.user_id, str(profile.id))
    
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
