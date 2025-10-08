"""Demo mode endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional
import httpx

from app.core.database import get_async_session
from app.core.security import get_current_active_user
from app.models.user import User
from app.core.config import settings

router = APIRouter()


class DemoConfigRequest(BaseModel):
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


@router.post("/demo/enable")
async def enable_demo_mode(
    config: DemoConfigRequest,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Enable demo mode for the current user."""
    
    if current_user.demo_mode:
        raise HTTPException(400, "Demo mode already enabled")
    
    # Call demo simulator service to create profile
    demo_service_url = getattr(settings, 'DEMO_SERVICE_URL', None)
    
    if not demo_service_url:
        raise HTTPException(500, "Demo service not configured")
    
    payload = {
        "user_id": str(current_user.id),
        **config.dict(),
    }
    
    async with httpx.AsyncClient(timeout=10.0) as client:  # 10s timeout for creation
        try:
            response = await client.post(
                f"{demo_service_url}/profiles",
                json=payload,
            )
            
            if response.status_code != 200:
                raise HTTPException(500, f"Failed to create demo profile: {response.text}")
            
            profile_data = response.json()
            
        except httpx.TimeoutException:
            raise HTTPException(504, "Demo service timed out - it may be restarting. Please try again in a moment.")
        except httpx.RequestError as e:
            raise HTTPException(500, f"Demo service unavailable: {str(e)}")
    
    # Enable demo mode for user
    current_user.demo_mode = True
    await session.commit()
    
    return {
        "status": "demo_enabled",
        "profile": profile_data,
    }


@router.post("/demo/disable")
async def disable_demo_mode(
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Disable demo mode for the current user."""
    
    if not current_user.demo_mode:
        raise HTTPException(400, "Demo mode not enabled")
    
    # Call demo simulator to deactivate profile
    demo_service_url = getattr(settings, 'DEMO_SERVICE_URL', None)
    
    if demo_service_url:
        async with httpx.AsyncClient(timeout=5.0) as client:
            try:
                await client.delete(
                    f"{demo_service_url}/profiles/{current_user.id}",
                )
            except (httpx.RequestError, httpx.TimeoutException):
                # Continue even if deactivation fails
                pass
    
    # Disable demo mode
    current_user.demo_mode = False
    await session.commit()
    
    return {"status": "demo_disabled"}


@router.get("/demo/status")
async def get_demo_status(
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """Get demo mode status for current user."""
    
    status_data = {
        "demo_mode": current_user.demo_mode,
        "user_id": str(current_user.id),
    }
    
    if current_user.demo_mode:
        # Get profile info from demo service
        demo_service_url = getattr(settings, 'DEMO_SERVICE_URL', None)
        
        if demo_service_url:
            async with httpx.AsyncClient(timeout=5.0) as client:  # Reduced to 5s
                try:
                    response = await client.get(
                        f"{demo_service_url}/profiles/{current_user.id}",
                    )
                    
                    if response.status_code == 200:
                        status_data["profile"] = response.json()
                    elif response.status_code == 404:
                        # Profile not found - demo mode enabled but profile doesn't exist
                        status_data["profile"] = None
                        
                except (httpx.RequestError, httpx.TimeoutException):
                    # Demo service unavailable - return basic status without profile info
                    status_data["profile"] = None
    
    return status_data
