"""Main FastAPI application for demo simulator."""
import logging
from datetime import datetime
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
    """Generate initial content with immediate interactions in the background."""
    try:
        from app.services.insights_generator import InsightsContentGenerator
        from app.services.simulation_engine import SimulationEngine
        from app.services.webhook_sender import WebhookSender
        
        # Get profile to retrieve niche
        from app.core.database import AsyncSessionLocal
        async with AsyncSessionLocal() as session:
            stmt = select(DemoProfile).where(DemoProfile.id == uuid.UUID(profile_id))
            result = await session.execute(stmt)
            profile = result.scalar_one_or_none()
            
            if not profile:
                logger.error(f"Profile {profile_id} not found for content generation")
                return
            
            # Step 1: Generate full batch of content with insights
            generator = InsightsContentGenerator()
            content_result = await generator.generate_content_batch(
                user_id=user_id,
                niche=profile.niche,
                total_count=35,  # Generate 30-50 pieces
                backend_url=settings.MAIN_APP_URL + '/api/v1',
                session=session,  # CRITICAL: Pass session to save content locally
            )
            
            logger.info(f"✅ Content generation completed: {content_result}")
            
            # Step 2: IMMEDIATELY generate interactions for all content
            logger.info(f"🔄 Generating initial interactions for {user_id}...")
            
            # Get all demo content just created
            from app.models.demo_content import DemoContent
            stmt = select(DemoContent).where(DemoContent.profile_id == profile.id)
            result = await session.execute(stmt)
            content_items = list(result.scalars().all())
            
            engine = SimulationEngine()
            webhook = WebhookSender()
            
            # Generate comments for all content immediately
            # Add small delays to avoid overwhelming Anthropic API
            import asyncio
            total_interactions = 0
            for idx, content in enumerate(content_items):
                # Generate target number of comments for this content
                comments_to_generate = content.target_comments
                if comments_to_generate > 0:
                    try:
                        # Refresh session every 5 content pieces to avoid connection timeout
                        if (idx + 1) % 5 == 0:
                            await session.commit()  # Commit batch
                            await session.close()
                            # Get fresh session
                            from app.core.database import AsyncSessionLocal
                            session = AsyncSessionLocal()
                            # Re-fetch profile with new session
                            stmt = select(DemoProfile).where(DemoProfile.id == profile.id)
                            result = await session.execute(stmt)
                            profile = result.scalar_one()
                            
                        await engine.generate_comments_for_content(
                            session,
                            content,
                            comments_to_generate
                        )
                        total_interactions += comments_to_generate
                        
                        # Small delay every 5 pieces to avoid API rate limits
                        if (idx + 1) % 5 == 0:
                            await asyncio.sleep(1)
                    except Exception as e:
                        logger.warning(f"Failed to generate comments for content piece: {e}")
                        # Rollback the failed transaction
                        await session.rollback()
                        # Continue with other content pieces
            
            logger.info(f"✅ Generated {total_interactions} comment interactions")
            
            # Ensure we have the final commit before moving to DMs
            await session.commit()
            
            # Step 3: Generate initial 100 DMs
            logger.info(f"🔄 Generating 100 initial DMs for {user_id}...")
            dm_count = 0
            for i in range(100):
                try:
                    # Refresh session every 20 DMs to avoid connection timeout
                    if (i + 1) % 20 == 0:
                        await session.commit()  # Commit batch
                        await session.close()
                        # Get fresh session
                        from app.core.database import AsyncSessionLocal
                        session = AsyncSessionLocal()
                        # Re-fetch profile with new session
                        stmt = select(DemoProfile).where(DemoProfile.id == profile.id)
                        result = await session.execute(stmt)
                        profile = result.scalar_one()
                    
                    await engine.generate_dm(session, profile)
                    dm_count += 1
                    
                    # Small delay every 10 DMs to avoid API rate limits
                    if (i + 1) % 10 == 0:
                        await asyncio.sleep(0.5)
                except Exception as e:
                    logger.warning(f"Failed to generate DM {i+1}: {e}")
                    await session.rollback()
                    # Continue with other DMs
            
            # Final commit for DMs
            await session.commit()
            logger.info(f"✅ Generated {dm_count} DM interactions")
            
            # Step 4: Update all interactions to be sent immediately (not delayed)
            from app.models.demo_interaction import DemoInteraction
            from sqlalchemy.orm import selectinload
            
            # Set all pending interactions to send immediately
            stmt = select(DemoInteraction).where(
                DemoInteraction.profile_id == profile.id,
                DemoInteraction.status == 'pending'
            )
            result = await session.execute(stmt)
            interactions = list(result.scalars().all())
            
            now = datetime.utcnow()
            for interaction in interactions:
                interaction.scheduled_for = now  # Send immediately, not with delay
            await session.commit()
            
            logger.info(f"🔄 Sending {len(interactions)} interactions to main app...")
            
            # Reload with relationships for webhook sending
            stmt = select(DemoInteraction).options(
                selectinload(DemoInteraction.profile),
                selectinload(DemoInteraction.content)
            ).where(
                DemoInteraction.profile_id == profile.id,
                DemoInteraction.status == 'pending'
            )
            result = await session.execute(stmt)
            interactions = list(result.scalars().all())
            
            # Send webhooks and track results (don't update DB yet to avoid session timeout)
            sent_ids = []
            failed_ids = []
            
            for idx, interaction in enumerate(interactions):
                try:
                    payload = interaction.to_webhook_payload()
                    success = await webhook.send_interaction_created(payload)
                    if success:
                        sent_ids.append(str(interaction.id))
                    else:
                        failed_ids.append(str(interaction.id))
                except Exception as e:
                    logger.error(f"Error sending interaction: {e}")
                    failed_ids.append(str(interaction.id))
            
            # Now update statuses in database in batches
            logger.info(f"Updating interaction statuses in database...")
            from sqlalchemy import update as sql_update
            
            if sent_ids:
                # Update sent interactions in batches
                for i in range(0, len(sent_ids), 100):
                    batch = sent_ids[i:i+100]
                    stmt = sql_update(DemoInteraction).where(
                        DemoInteraction.id.in_([uuid.UUID(id) for id in batch])
                    ).values(
                        status='sent',
                        sent_at=datetime.utcnow()
                    )
                    await session.execute(stmt)
                    await session.commit()
            
            if failed_ids:
                # Update failed interactions
                for i in range(0, len(failed_ids), 100):
                    batch = failed_ids[i:i+100]
                    stmt = sql_update(DemoInteraction).where(
                        DemoInteraction.id.in_([uuid.UUID(id) for id in batch])
                    ).values(status='failed')
                    await session.execute(stmt)
                    await session.commit()
            
            logger.info(f"✅ Sent {len(sent_ids)} interactions to main app ({len(failed_ids)} failed)")
            logger.info(f"🎉 Demo mode fully initialized for user {user_id} - {len(sent_ids)} interactions visible immediately")
            
    except Exception as e:
        logger.error(f"Error generating background content for user {user_id}: {e}", exc_info=True)
        try:
            await session.rollback()
        except:
            pass
    finally:
        try:
            await session.close()
        except:
            pass


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
