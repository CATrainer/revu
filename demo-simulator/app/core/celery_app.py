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
# OPTIMIZED: Minimal frequencies to keep costs under $5/day for 3 active profiles
celery_app.conf.beat_schedule = {
    # Upload new content - run once per day (only creates content metadata, not interactions)
    "upload-demo-content": {
        "task": "app.tasks.content_tasks.upload_content_for_active_profiles",
        "schedule": 60.0 * 60 * 24,  # 24 hours (1x per day)
    },
    # Generate comments every 2 hours using BATCHED API calls (10x cheaper!)
    "generate-comments": {
        "task": "app.tasks.interaction_tasks.generate_comments_batch",
        "schedule": 60.0 * 60 * 2,  # 2 hours (12x per day, but batched = ~1-2 API calls/run)
    },
    # Generate DMs every 4 hours (was 2 hours)
    "generate-dms": {
        "task": "app.tasks.interaction_tasks.generate_dms_batch",
        "schedule": 60.0 * 60 * 4,  # 4 hours (6x per day max)
    },
    # Send queued interactions every 3 minutes
    "send-interactions": {
        "task": "app.tasks.interaction_tasks.send_queued_interactions",
        "schedule": 60.0 * 3,  # 3 minutes
    },
    # Cleanup old data daily at 3 AM
    "cleanup-old-data": {
        "task": "app.tasks.cleanup_tasks.cleanup_old_demo_data",
        "schedule": crontab(hour=3, minute=0),
    },
}

# Import tasks to register them with Celery
# These imports must happen AFTER celery_app is created
from app.tasks import content_tasks, interaction_tasks, cleanup_tasks  # noqa: F401, E402

# Export celery instance for CLI
celery = celery_app
