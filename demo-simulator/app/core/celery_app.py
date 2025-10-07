"""Celery application for demo simulator service."""
from celery import Celery
from celery.schedules import crontab

from app.core.config import settings

# Create Celery app
celery_app = Celery(
    "demo_simulator",
    broker=settings.celery_broker,
    backend=settings.celery_backend,
)

# Configure Celery
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
    task_soft_time_limit=25 * 60,  # 25 minutes
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
)

# Beat schedule for periodic tasks
celery_app.conf.beat_schedule = {
    # Upload new content every 4-6 hours
    "upload-demo-content": {
        "task": "app.tasks.content_tasks.upload_content_for_active_profiles",
        "schedule": 60.0 * 60 * 4,  # 4 hours
    },
    # Generate comments every 5 minutes
    "generate-comments": {
        "task": "app.tasks.interaction_tasks.generate_comments_batch",
        "schedule": 60.0 * 5,  # 5 minutes
    },
    # Generate DMs every 30 minutes
    "generate-dms": {
        "task": "app.tasks.interaction_tasks.generate_dms_batch",
        "schedule": 60.0 * 30,  # 30 minutes
    },
    # Send queued interactions every minute
    "send-interactions": {
        "task": "app.tasks.interaction_tasks.send_queued_interactions",
        "schedule": 60.0,  # 1 minute
    },
    # Cleanup old data daily at 3 AM
    "cleanup-old-data": {
        "task": "app.tasks.cleanup_tasks.cleanup_old_demo_data",
        "schedule": crontab(hour=3, minute=0),
    },
}

# Export celery instance for CLI
celery = celery_app
