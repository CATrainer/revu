"""Main FastAPI application for demo simulator."""
import logging
import random
from datetime import datetime, timezone
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

# Include action endpoints router
from app.api.actions import router as actions_router
app.include_router(actions_router, tags=["actions"])


# Helper functions
def _generate_channel_name(niche: str) -> str:
    """Generate a realistic channel name based on niche."""
    channel_names = {
        'tech_reviews': ['TechReview Pro', 'GadgetGuru', 'TechBytes', 'Digital Insights', 'TechVision'],
        'gaming': ['ProGamerHQ', 'GamersUnite', 'LevelUp Gaming', 'Elite Gamers', 'Gaming Arena'],
        'beauty': ['GlamourGuide', 'Beauty Insider', 'MakeupMaven', 'Glow & Beauty', 'Style Studio'],
        'fitness': ['FitLife Coach', 'Muscle Motion', 'Wellness Warriors', 'FitZone', 'Active Living'],
        'cooking': ["Chef's Table", 'TastyBites', 'Culinary Corner', 'Kitchen Magic', 'Food Fusion'],
        'travel': ['Wanderlust Journey', 'Travel Tales', 'Global Explorer', 'Adventure Awaits', 'Destination Diaries'],
        'education': ['Learning Hub', 'Knowledge Zone', 'EduPro', 'Study Masters', 'Wisdom Academy'],
        'music': ['Music Vibes', 'Sound Studio', 'Melody Makers', 'Rhythm & Beat', 'Audio Arena'],
        'comedy': ['Laugh Factory', 'Comedy Central', 'Funny Times', 'Humor Hub', 'Jest Jest'],
        'business': ['Business Insights', 'Success Strategies', 'Market Masters', 'Growth Academy', 'Biz Pro'],
    }
    
    # Get channel names for niche or use default
    names = channel_names.get(niche, ['Demo Creator', 'Content Pro', 'The Channel'])
    return random.choice(names)


# Schemas
class ProfileCreate(BaseModel):
    user_id: str
    profile_type: str  # 'auto' or 'manual'
    channel_name: Optional[str] = None  # AI Assistant context
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
    channel_name: Optional[str] = None
    niche: str
    is_active: bool
    created_at: str


# Background task for content generation
async def generate_initial_content(user_id: str, profile_id: str):
    """Generate initial content with immediate interactions in the background."""
    from app.services.insights_generator import InsightsContentGenerator
    from app.services.simulation_engine import SimulationEngine
    from app.services.webhook_sender import WebhookSender
    from app.core.database import AsyncSessionLocal
    
    session = None
    try:
        # Get profile to retrieve niche
        session = AsyncSessionLocal()
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
        
        # Step 2: IMMEDIATELY generate interactions for {user_id}...")
        logger.info(f"🔄 Generating initial interactions for {user_id}...")
        
        # Get all demo content just created
        from app.models.demo_content import DemoContent
        from sqlalchemy.orm import selectinload
        stmt = select(DemoContent).options(
            selectinload(DemoContent.profile)
        ).where(DemoContent.profile_id == profile.id)
        result = await session.execute(stmt)
        content_items = list(result.scalars().all())
        
        # Store content IDs and targets to avoid detached object issues
        content_tasks = [
            {
                'id': content.id,
                'target_comments': content.target_comments,
                'title': content.title[:30]
            }
            for content in content_items
        ]
        
        engine = SimulationEngine()
        webhook = WebhookSender()
        
        # OPTIMIZATION: Batch ALL content into fewer API calls (10x cost savings!)
        # Instead of 35 API calls, we'll make ~7 calls (5 videos per batch)
        logger.info(f"🚀 Using BATCHED generation for {len(content_tasks)} videos (10x cheaper!)")
        
        import asyncio
        total_interactions = 0
        batch_size = 8  # Process 8 videos per API call
        
        for batch_start in range(0, len(content_tasks), batch_size):
            batch_end = min(batch_start + batch_size, len(content_tasks))
            batch = content_tasks[batch_start:batch_end]
            
            try:
                # Prepare batch requests with reduced comment counts for initial load
                batch_requests = []
                for task in batch:
                    # For initial setup, generate fewer comments per video (2-4 instead of full target)
                    # This gives good variety while keeping costs down
                    comments_count = min(task['target_comments'], random.randint(2, 4))
                    if comments_count > 0:
                        # Re-fetch content
                        stmt = select(DemoContent).options(
                            selectinload(DemoContent.profile)
                        ).where(DemoContent.id == task['id'])
                        result = await session.execute(stmt)
                        content = result.scalar_one()
                        
                        batch_requests.append({
                            'content': content,
                            'count': comments_count,
                            'title': content.title
                        })
                
                if batch_requests:
                    # Generate ALL comments in ONE API call!
                    await engine.generate_comments_batch_optimized(session, batch_requests)
                    batch_total = sum(r['count'] for r in batch_requests)
                    total_interactions += batch_total
                    logger.info(f"✅ Batch {batch_start//batch_size + 1}: {len(batch_requests)} videos, {batch_total} comments in 1 API call")
                    
                    # Small delay between batches
                    if batch_end < len(content_tasks):
                        await asyncio.sleep(2)
                
            except Exception as e:
                logger.error(f"Failed to generate batch starting at {batch_start}: {e}")
                try:
                    await session.rollback()
                except:
                    pass
        
        logger.info(f"✅ Generated {total_interactions} comment interactions using batched API calls")
        
        # Ensure we have the final commit before moving to DMs
        await session.commit()
        
        # Step 3: Generate initial 100 DMs
        logger.info(f"🔄 Generating 100 initial DMs for {user_id}...")
        
        # Re-fetch profile after commit to ensure it's attached to session
        stmt = select(DemoProfile).where(DemoProfile.id == profile.id)
        result = await session.execute(stmt)
        profile = result.scalar_one()
        
        dm_count = 0
        for i in range(100):
            try:
                # Refresh session and profile every 20 DMs to avoid connection timeout
                if i > 0 and i % 20 == 0:
                    await session.commit()  # Commit batch
                    await session.close()
                    # Get fresh session
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
                try:
                    await session.rollback()
                except:
                    pass
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
        
        now = datetime.now(timezone.utc)
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
        
        # Now update statuses in database in smaller batches with fresh sessions
        logger.info(f"Updating interaction statuses in database...")
        from sqlalchemy import update as sql_update
        
        if sent_ids:
            # Update sent interactions in smaller batches (50 at a time)
            for i in range(0, len(sent_ids), 50):
                batch = sent_ids[i:i+50]
                try:
                    # Use a fresh session for each batch to avoid connection timeouts
                    if i > 0 and i % 200 == 0:
                        await session.commit()
                        await session.close()
                        session = AsyncSessionLocal()
                    
                    stmt = sql_update(DemoInteraction).where(
                        DemoInteraction.id.in_([uuid.UUID(id) for id in batch])
                    ).values(
                        status='sent',
                        sent_at=datetime.now(timezone.utc),
                        updated_at=datetime.now(timezone.utc)
                    )
                    await session.execute(stmt)
                    await session.commit()
                    
                    if (i + 50) % 100 == 0:
                        logger.info(f"Updated {i + 50}/{len(sent_ids)} sent interactions")
                except Exception as e:
                    logger.error(f"Failed to update batch {i}-{i+50}: {e}")
                    await session.rollback()
        
        if failed_ids:
            # Update failed interactions in smaller batches
            for i in range(0, len(failed_ids), 50):
                batch = failed_ids[i:i+50]
                try:
                    stmt = sql_update(DemoInteraction).where(
                        DemoInteraction.id.in_([uuid.UUID(id) for id in batch])
                    ).values(
                        status='failed',
                        updated_at=datetime.now(timezone.utc)
                    )
                    await session.execute(stmt)
                    await session.commit()
                except Exception as e:
                    logger.error(f"Failed to update failed batch {i}-{i+50}: {e}")
                    await session.rollback()
        
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
                channel_name=existing.channel_name or _generate_channel_name(existing.niche),
                niche=existing.niche,
                is_active=True,
                created_at=existing.created_at.isoformat(),
            )
    
    # Create new profile
    profile = DemoProfile(
        user_id=uuid.UUID(payload.user_id),
        profile_type=payload.profile_type,
        channel_name=payload.channel_name or _generate_channel_name(payload.niche),
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
        channel_name=profile.channel_name,
        niche=profile.niche,
        is_active=True,
        created_at=profile.created_at.isoformat(),
    )


@app.get("/profiles/{user_id}")
async def get_profile(
    user_id: str,
    session: AsyncSession = Depends(get_async_session)
):
    """Get demo profile for a user - structured for AI Assistant integration."""
    stmt = select(DemoProfile).where(DemoProfile.user_id == uuid.UUID(user_id))
    result = await session.execute(stmt)
    profile = result.scalar_one_or_none()
    
    if not profile:
        raise HTTPException(404, "Profile not found")
    
    # Return structured data for AI Assistant context
    return {
        "id": str(profile.id),
        "user_id": str(profile.user_id),
        "channel_name": profile.channel_name or _generate_channel_name(profile.niche),
        "niche": profile.niche,
        "personality": profile.personality,
        "platforms": {
            "youtube": {
                "subscribers": profile.yt_subscribers,
                "avg_views": profile.yt_avg_views,
                "engagement_rate": profile.yt_engagement_rate,
                "upload_frequency": profile.yt_upload_frequency,
            },
            "instagram": {
                "followers": profile.ig_followers,
                "avg_likes": profile.ig_avg_likes,
                "story_views": profile.ig_story_views,
                "post_frequency": profile.ig_post_frequency,
            },
            "tiktok": {
                "followers": profile.tt_followers,
                "avg_views": profile.tt_avg_views,
                "engagement_rate": profile.tt_engagement_rate,
                "post_frequency": profile.tt_post_frequency,
            },
        },
        "comment_volume": profile.comment_volume,
        "dm_frequency": profile.dm_frequency,
        "is_active": profile.is_active,
        "created_at": profile.created_at.isoformat(),
        "last_activity_at": profile.last_activity_at.isoformat() if profile.last_activity_at else None,
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
    
    return {
        "success": True,
        "user_id": str(profile.user_id),
        "deactivated_at": datetime.utcnow().isoformat()
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
