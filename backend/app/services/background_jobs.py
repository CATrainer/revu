"""Background job service for managing async operations."""

from datetime import datetime
from typing import Optional, List
from uuid import UUID

from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.background_job import BackgroundJob
from app.models.user import User


class BackgroundJobService:
    """Service for managing background jobs."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create_job(
        self,
        job_type: str,
        user_id: UUID,
        max_retries: int = 3,
    ) -> BackgroundJob:
        """
        Create a new background job.
        
        Args:
            job_type: Type of job (demo_enable, demo_disable, oauth_connect, etc.)
            user_id: ID of user who initiated the job
            max_retries: Maximum number of retry attempts
            
        Returns:
            BackgroundJob: Created job instance
        """
        job = BackgroundJob(
            job_type=job_type,
            user_id=user_id,
            max_retries=max_retries,
        )
        
        self.db.add(job)
        await self.db.commit()
        await self.db.refresh(job)
        
        logger.info(f"Created background job: {job.id} (type={job_type}, user={user_id})")
        
        return job
    
    async def get_job(self, job_id: UUID) -> Optional[BackgroundJob]:
        """
        Get a background job by ID.
        
        Args:
            job_id: Job ID
            
        Returns:
            BackgroundJob if found, None otherwise
        """
        stmt = select(BackgroundJob).where(BackgroundJob.id == job_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
    
    async def get_user_jobs(
        self,
        user_id: UUID,
        job_type: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 10,
    ) -> List[BackgroundJob]:
        """
        Get background jobs for a user.
        
        Args:
            user_id: User ID
            job_type: Optional filter by job type
            status: Optional filter by status
            limit: Maximum number of jobs to return
            
        Returns:
            List of BackgroundJob instances
        """
        stmt = select(BackgroundJob).where(BackgroundJob.user_id == user_id)
        
        if job_type:
            stmt = stmt.where(BackgroundJob.job_type == job_type)
        
        if status:
            stmt = stmt.where(BackgroundJob.status == status)
        
        stmt = stmt.order_by(BackgroundJob.created_at.desc()).limit(limit)
        
        result = await self.db.execute(stmt)
        return list(result.scalars().all())
    
    async def get_latest_job(
        self,
        user_id: UUID,
        job_type: str,
    ) -> Optional[BackgroundJob]:
        """
        Get the most recent job of a specific type for a user.
        
        Args:
            user_id: User ID
            job_type: Job type
            
        Returns:
            BackgroundJob if found, None otherwise
        """
        stmt = (
            select(BackgroundJob)
            .where(
                BackgroundJob.user_id == user_id,
                BackgroundJob.job_type == job_type,
            )
            .order_by(BackgroundJob.created_at.desc())
            .limit(1)
        )
        
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
    
    async def mark_running(self, job_id: UUID) -> BackgroundJob:
        """
        Mark a job as running.
        
        Args:
            job_id: Job ID
            
        Returns:
            Updated BackgroundJob
        """
        job = await self.get_job(job_id)
        if not job:
            raise ValueError(f"Job {job_id} not found")
        
        job.mark_running()
        await self.db.commit()
        await self.db.refresh(job)
        
        logger.info(f"Job {job_id} marked as running")
        
        return job
    
    async def mark_completed(
        self,
        job_id: UUID,
        result_data: Optional[dict] = None,
    ) -> BackgroundJob:
        """
        Mark a job as completed.
        
        Args:
            job_id: Job ID
            result_data: Optional result data from the job
            
        Returns:
            Updated BackgroundJob
        """
        job = await self.get_job(job_id)
        if not job:
            raise ValueError(f"Job {job_id} not found")
        
        job.mark_completed(result_data)
        await self.db.commit()
        await self.db.refresh(job)
        
        logger.info(f"Job {job_id} completed (duration={job.duration_seconds}s)")
        
        return job
    
    async def mark_failed(
        self,
        job_id: UUID,
        error_message: str,
        error_details: Optional[dict] = None,
    ) -> BackgroundJob:
        """
        Mark a job as failed.
        
        Args:
            job_id: Job ID
            error_message: Error message
            error_details: Optional detailed error information
            
        Returns:
            Updated BackgroundJob
        """
        job = await self.get_job(job_id)
        if not job:
            raise ValueError(f"Job {job_id} not found")
        
        job.mark_failed(error_message, error_details)
        await self.db.commit()
        await self.db.refresh(job)
        
        logger.error(f"Job {job_id} failed: {error_message}")
        
        return job
    
    async def retry_job(self, job_id: UUID) -> BackgroundJob:
        """
        Retry a failed job.
        
        Args:
            job_id: Job ID
            
        Returns:
            Updated BackgroundJob
            
        Raises:
            ValueError: If job cannot be retried
        """
        job = await self.get_job(job_id)
        if not job:
            raise ValueError(f"Job {job_id} not found")
        
        if not job.can_retry:
            raise ValueError(f"Job {job_id} cannot be retried (status={job.status}, retries={job.retry_count}/{job.max_retries})")
        
        job.increment_retry()
        await self.db.commit()
        await self.db.refresh(job)
        
        logger.info(f"Job {job_id} queued for retry (attempt {job.retry_count}/{job.max_retries})")
        
        return job
    
    async def cancel_job(self, job_id: UUID) -> BackgroundJob:
        """
        Cancel a pending or running job.
        
        Args:
            job_id: Job ID
            
        Returns:
            Updated BackgroundJob
        """
        job = await self.get_job(job_id)
        if not job:
            raise ValueError(f"Job {job_id} not found")
        
        if job.is_terminal:
            raise ValueError(f"Cannot cancel job {job_id} in terminal state: {job.status}")
        
        job.status = 'cancelled'
        await self.db.commit()
        await self.db.refresh(job)
        
        logger.info(f"Job {job_id} cancelled")
        
        return job
    
    async def cleanup_old_jobs(self, days: int = 30) -> int:
        """
        Clean up completed/failed jobs older than specified days.
        
        Args:
            days: Number of days to keep jobs
            
        Returns:
            Number of jobs deleted
        """
        from datetime import timedelta
        from sqlalchemy import delete
        
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        stmt = delete(BackgroundJob).where(
            BackgroundJob.created_at < cutoff_date,
            BackgroundJob.status.in_(['completed', 'failed', 'cancelled']),
        )
        
        result = await self.db.execute(stmt)
        await self.db.commit()
        
        count = result.rowcount
        logger.info(f"Cleaned up {count} old background jobs (older than {days} days)")
        
        return count
