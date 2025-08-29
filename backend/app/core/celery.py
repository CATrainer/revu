"""
Celery configuration and app initialization.

This module sets up Celery for background task processing,
including review syncing, email sending, and analytics generation.
"""

from celery import Celery
from celery.schedules import crontab

from app.core.config import settings

# Create Celery app
celery_app = Celery(
    "Repruv",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "app.tasks.reviews",
        "app.tasks.analytics",
        "app.tasks.email",
        "app.tasks.automation",
    ],
)

# Configure Celery
celery_app.conf.update(
    # Task settings
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    result_expires=3600,  # 1 hour
    timezone="UTC",
    enable_utc=True,
    
    # Worker settings
    worker_prefetch_multiplier=4,
    worker_max_tasks_per_child=1000,
    
    # Task routing
    task_routes={
        "app.tasks.reviews.*": {"queue": "reviews"},
        "app.tasks.analytics.*": {"queue": "analytics"},
        "app.tasks.email.*": {"queue": "email"},
        "app.tasks.automation.*": {"queue": "automation"},
    },
    
    # Rate limits
    task_annotations={
        "app.tasks.reviews.sync_google_reviews": {
            "rate_limit": "10/m",  # 10 per minute
        },
        "app.tasks.email.send_email": {
            "rate_limit": "30/m",  # 30 per minute
        },
    },
)

# Configure periodic tasks
celery_app.conf.beat_schedule = {
    # Sync reviews every hour for active locations
    "sync-all-reviews": {
        "task": "app.tasks.reviews.sync_all_active_locations",
        "schedule": crontab(minute=0),  # Every hour
    },
    
    # Generate daily analytics snapshots
    "generate-analytics-snapshots": {
        "task": "app.tasks.analytics.generate_daily_snapshots",
        "schedule": crontab(hour=2, minute=0),  # 2 AM UTC daily
    },
    
    # Check for trial expirations
    "check-trial-expirations": {
        "task": "app.tasks.email.check_trial_expirations",
        "schedule": crontab(hour=9, minute=0),  # 9 AM UTC daily
    },
    
    # Process automation rules every 5 minutes
    "process-automation-rules": {
        "task": "app.tasks.automation.process_all_rules",
        "schedule": crontab(minute="*/5"),  # Every 5 minutes
    },
    
    # Clean up old data monthly
    "cleanup-old-data": {
        "task": "app.tasks.analytics.cleanup_old_data",
        "schedule": crontab(hour=3, minute=0, day_of_month=1),  # First day of month at 3 AM
    },
}

# Task base name
celery_app.conf.task_default_queue = "default"
celery_app.conf.task_create_missing_queues = True


def get_task_info(task_id: str) -> dict:
    """
    Get information about a specific task.
    
    Args:
        task_id: The task ID to look up
        
    Returns:
        dict: Task information including status and result
    """
    result = celery_app.AsyncResult(task_id)
    
    return {
        "task_id": task_id,
        "status": result.status,
        "result": result.result if result.successful() else None,
        "error": str(result.info) if result.failed() else None,
        "ready": result.ready(),
    }