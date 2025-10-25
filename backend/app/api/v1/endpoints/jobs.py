"""Background job status endpoints."""

from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.core.security import get_current_active_user
from app.models.user import User
from app.services.background_jobs import BackgroundJobService

router = APIRouter()


@router.get("/jobs/{job_id}/status")
async def get_job_status(
    job_id: str,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get status of a background job.
    
    Returns:
        Job status information including status, result data, and errors
    """
    job_service = BackgroundJobService(session)
    
    try:
        job = await job_service.get_job(UUID(job_id))
    except ValueError:
        raise HTTPException(400, "Invalid job ID format")
    
    if not job:
        raise HTTPException(404, "Job not found")
    
    # Verify job belongs to current user
    if job.user_id != current_user.id:
        raise HTTPException(403, "Access denied")
    
    return {
        "id": str(job.id),
        "job_type": job.job_type,
        "status": job.status,
        "created_at": job.created_at.isoformat() if job.created_at else None,
        "started_at": job.started_at.isoformat() if job.started_at else None,
        "completed_at": job.completed_at.isoformat() if job.completed_at else None,
        "failed_at": job.failed_at.isoformat() if job.failed_at else None,
        "error_message": job.error_message,
        "error_details": job.error_details,
        "result_data": job.result_data,
        "retry_count": job.retry_count,
        "max_retries": job.max_retries,
        "is_terminal": job.is_terminal,
        "can_retry": job.can_retry,
        "duration_seconds": job.duration_seconds,
    }


@router.get("/jobs")
async def get_user_jobs(
    job_type: str = None,
    status: str = None,
    limit: int = 10,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get background jobs for the current user.
    
    Query Parameters:
        job_type: Optional filter by job type
        status: Optional filter by status
        limit: Maximum number of jobs to return (default 10)
    """
    job_service = BackgroundJobService(session)
    
    jobs = await job_service.get_user_jobs(
        user_id=current_user.id,
        job_type=job_type,
        status=status,
        limit=min(limit, 50),  # Cap at 50
    )
    
    return {
        "jobs": [
            {
                "id": str(job.id),
                "job_type": job.job_type,
                "status": job.status,
                "created_at": job.created_at.isoformat() if job.created_at else None,
                "completed_at": job.completed_at.isoformat() if job.completed_at else None,
                "error_message": job.error_message,
                "is_terminal": job.is_terminal,
            }
            for job in jobs
        ]
    }
