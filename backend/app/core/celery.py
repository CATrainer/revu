"""
Celery configuration and app initialization.
"""

import os
from celery import Celery
from celery.schedules import crontab

# Import settings
from app.core.config import settings

# Print debug info to verify URLs are correct
print(f"[Celery] Initializing with:")
print(f"  Broker: {settings.CELERY_BROKER_URL}")
print(f"  Backend: {settings.CELERY_RESULT_BACKEND}")

# Create Celery app
celery_app = Celery("Repruv")
# Alias for CLI compatibility so `celery -A app.core.celery worker` finds an app
# Celery defaults to looking for a symbol named `celery` in the target module.
celery = celery_app

# Configure Celery
celery_app.conf.update(
    # Use the computed URLs from settings
    broker_url=settings.CELERY_BROKER_URL,
    result_backend=settings.CELERY_RESULT_BACKEND,

    # Serialization
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    result_expires=3600,

    # Timezone
    timezone="UTC",
    enable_utc=True,

    # Task imports
    imports=[
        "app.tasks.reviews",
        "app.tasks.analytics",
        "app.tasks.email",
        "app.tasks.automation",
        "app.tasks.marketing",
    ],

    # Worker settings
    worker_prefetch_multiplier=4,
    worker_max_tasks_per_child=1000,

    # Connection settings
    broker_connection_retry=True,
    broker_connection_retry_on_startup=True,
    broker_connection_max_retries=10,

    # Task routing
    task_routes={
        "app.tasks.reviews.*": {"queue": "reviews"},
        "app.tasks.analytics.*": {"queue": "analytics"},
        "app.tasks.email.*": {"queue": "email"},
        "app.tasks.automation.*": {"queue": "automation"},
        "app.tasks.marketing.*": {"queue": "marketing"},
    },

    # Queue settings
    task_default_queue="default",
    task_create_missing_queues=True,

    # Rate limits
    task_annotations={
        "app.tasks.reviews.sync_google_reviews": {
            "rate_limit": "10/m",
        },
        "app.tasks.email.send_email": {
            "rate_limit": "30/m",
        },
    },
)

# Beat schedule for periodic tasks
celery_app.conf.beat_schedule = {
    "sync-all-reviews": {
        "task": "app.tasks.reviews.sync_all_active_locations",
        "schedule": crontab(minute=0),  # Every hour
    },
    "generate-analytics-snapshots": {
        "task": "app.tasks.analytics.generate_daily_snapshots",
        "schedule": crontab(hour=2, minute=0),  # 2 AM UTC
    },
    "check-trial-expirations": {
        "task": "app.tasks.email.check_trial_expirations",
        "schedule": crontab(hour=9, minute=0),  # 9 AM UTC
    },
    "process-automation-rules": {
        "task": "app.tasks.automation.process_all_rules",
        "schedule": crontab(minute="*/5"),  # Every 5 minutes
    },
    "cleanup-old-data": {
        "task": "app.tasks.analytics.cleanup_old_data",
        "schedule": crontab(hour=3, minute=0, day_of_month=1),  # Monthly
    },
    "sync-sendgrid-contacts": {
        "task": "app.tasks.marketing.sync_all_contacts",
        "schedule": crontab(hour=4, minute=15),  # Daily at 04:15 UTC
    },
    "waitlist-countdown-daily": {
        "task": "app.tasks.email.send_waitlist_countdown_daily",
        "schedule": crontab(hour=9, minute=0),  # Daily at 09:00 UTC
    },
}


def get_task_info(task_id: str) -> dict:
    """Get information about a task."""
    result = celery_app.AsyncResult(task_id)
    return {
        "task_id": task_id,
        "status": result.status,
        "result": result.result if result.successful() else None,
        "error": str(result.info) if result.failed() else None,
        "ready": result.ready(),
    }


# Test function to verify Redis connection
def test_celery_connection():
    """Test if Celery can connect to Redis."""
    try:
        # Try to inspect workers
        i = celery_app.control.inspect()
        stats = i.stats()
        print(f"[Celery] Connection test successful. Workers: {stats}")
        return True
    except Exception as e:
        print(f"[Celery] Connection test failed: {e}")
        return False


# Auto-discover tasks if using Django
try:
    from django.conf import settings as django_settings
    if django_settings.configured:
        celery_app.autodiscover_tasks(lambda: django_settings.INSTALLED_APPS)
except ImportError:
    pass