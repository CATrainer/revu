"""
Celery configuration and app initialization.

This module sets up Celery for background task processing,
including review syncing, email sending, and analytics generation.
"""

import os
from urllib.parse import urlparse, urlunparse
from celery import Celery
from celery.schedules import crontab
from loguru import logger


def build_redis_url_with_db(base_url: str, db_number: int) -> str:
    """
    Build a Redis URL with a specific database number.
    
    Args:
        base_url: Base Redis URL (might already have a db number)
        db_number: Database number to use (0-15)
    
    Returns:
        str: Redis URL with the specified database
    """
    if not base_url:
        return f"redis://localhost:6379/{db_number}"
    
    # Parse the URL
    parsed = urlparse(base_url)
    
    # Build new path with just the database number
    new_path = f"/{db_number}"
    
    # Reconstruct the URL with the new database
    new_url = urlunparse((
        parsed.scheme,
        parsed.netloc,  # includes username:password@host:port
        new_path,
        parsed.params,
        parsed.query,
        parsed.fragment
    ))
    
    return new_url


# Get base Redis URL from environment
REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379')

# Build Celery URLs with specific databases
CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', '')
CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND', '')

# If the URLs aren't properly set or are just database numbers, build them
if not CELERY_BROKER_URL.startswith('redis://'):
    CELERY_BROKER_URL = build_redis_url_with_db(REDIS_URL, 0)

if not CELERY_RESULT_BACKEND.startswith('redis://'):
    CELERY_RESULT_BACKEND = build_redis_url_with_db(REDIS_URL, 2)

# Log the configuration (helpful for debugging)
logger.info(f"Redis Base URL: {REDIS_URL.split('@')[-1] if '@' in REDIS_URL else REDIS_URL}")  # Hide password
logger.info(f"Celery Broker URL (db 0): {CELERY_BROKER_URL.split('@')[-1] if '@' in CELERY_BROKER_URL else CELERY_BROKER_URL}")
logger.info(f"Celery Result Backend (db 2): {CELERY_RESULT_BACKEND.split('@')[-1] if '@' in CELERY_RESULT_BACKEND else CELERY_RESULT_BACKEND}")

# Validate URLs
if not CELERY_BROKER_URL.startswith('redis://'):
    raise ValueError(f"Invalid CELERY_BROKER_URL: {CELERY_BROKER_URL}")

if not CELERY_RESULT_BACKEND.startswith('redis://'):
    raise ValueError(f"Invalid CELERY_RESULT_BACKEND: {CELERY_RESULT_BACKEND}")

# Create Celery app
celery_app = Celery("Repruv")

# Configure Celery
celery_app.conf.update(
    # Broker and Backend
    broker_url=CELERY_BROKER_URL,
    result_backend=CELERY_RESULT_BACKEND,
    
    # Task settings
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    result_expires=3600,  # 1 hour
    timezone="UTC",
    enable_utc=True,
    
    # Import tasks
    imports=[
        "app.tasks.reviews",
        "app.tasks.analytics",
        "app.tasks.email",
        "app.tasks.automation",
    ],
    
    # Worker settings
    worker_prefetch_multiplier=4,
    worker_max_tasks_per_child=1000,
    worker_disable_rate_limits=False,
    
    # Connection pool settings
    broker_connection_retry=True,
    broker_connection_retry_on_startup=True,
    broker_connection_max_retries=10,
    broker_pool_limit=10,
    
    # Result backend settings
    result_backend_pool_limit=10,
    
    # Task execution settings
    task_track_started=True,
    task_time_limit=300,  # 5 minutes hard limit
    task_soft_time_limit=240,  # 4 minutes soft limit
    task_acks_late=True,
    
    # Task routing
    task_routes={
        "app.tasks.reviews.*": {"queue": "reviews"},
        "app.tasks.analytics.*": {"queue": "analytics"},
        "app.tasks.email.*": {"queue": "email"},
        "app.tasks.automation.*": {"queue": "automation"},
    },
    
    # Default queue
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

# Configure periodic tasks
celery_app.conf.beat_schedule = {
    "sync-all-reviews": {
        "task": "app.tasks.reviews.sync_all_active_locations",
        "schedule": crontab(minute=0),
        "options": {"queue": "reviews", "expires": 3600},
    },
    "generate-analytics-snapshots": {
        "task": "app.tasks.analytics.generate_daily_snapshots",
        "schedule": crontab(hour=2, minute=0),
        "options": {"queue": "analytics", "expires": 3600},
    },
    "check-trial-expirations": {
        "task": "app.tasks.email.check_trial_expirations",
        "schedule": crontab(hour=9, minute=0),
        "options": {"queue": "email", "expires": 3600},
    },
    "process-automation-rules": {
        "task": "app.tasks.automation.process_all_rules",
        "schedule": crontab(minute="*/5"),
        "options": {"queue": "automation", "expires": 300},
    },
    "cleanup-old-data": {
        "task": "app.tasks.analytics.cleanup_old_data",
        "schedule": crontab(hour=3, minute=0, day_of_month=1),
        "options": {"queue": "analytics", "expires": 7200},
    },
}


def get_task_info(task_id: str) -> dict:
    """Get information about a specific task."""
    result = celery_app.AsyncResult(task_id)
    return {
        "task_id": task_id,
        "status": result.status,
        "result": result.result if result.successful() else None,
        "error": str(result.info) if result.failed() else None,
        "ready": result.ready(),
        "successful": result.successful(),
        "failed": result.failed(),
    }


def celery_health_check() -> dict:
    """Perform a health check on Celery."""
    health = {"status": "checking"}
    
    try:
        # Test broker connection
        from kombu import Connection
        with Connection(CELERY_BROKER_URL) as conn:
            conn.ensure_connection(max_retries=3)
        health["broker"] = "connected"
    except Exception as e:
        health["broker"] = f"error: {str(e)}"
    
    try:
        # Test result backend
        from redis import Redis
        parsed = urlparse(CELERY_RESULT_BACKEND)
        db_num = int(parsed.path.lstrip('/')) if parsed.path else 0
        redis_client = Redis(
            host=parsed.hostname,
            port=parsed.port or 6379,
            password=parsed.password,
            db=db_num,
            socket_connect_timeout=5,
        )
        redis_client.ping()
        health["result_backend"] = "connected"
    except Exception as e:
        health["result_backend"] = f"error: {str(e)}"
    
    health["status"] = "healthy" if all(
        "connected" in str(v) for v in [health.get("broker"), health.get("result_backend")]
    ) else "unhealthy"
    
    return health


# Auto-discovery of tasks when used with Django
try:
    from django.conf import settings as django_settings
    if django_settings.configured:
        celery_app.autodiscover_tasks(lambda: django_settings.INSTALLED_APPS)
except ImportError:
    pass