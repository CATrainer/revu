"""
Celery configuration and app initialization.

This module sets up Celery for background task processing,
including review syncing, email sending, and analytics generation.
"""

import os
from celery import Celery
from celery.schedules import crontab
from loguru import logger

# Get Redis URL from environment
REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379')

# Clean up the Redis URL (remove any trailing path/database)
if REDIS_URL.count('/') > 2 and REDIS_URL.split('/')[-1].isdigit():
    # Remove the database number if present
    REDIS_URL = '/'.join(REDIS_URL.split('/')[:-1])

# Build Celery URLs
CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', '')
CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND', '')

# Handle cases where Railway might not have expanded the variables properly
# or where we just have database numbers
if not CELERY_BROKER_URL or CELERY_BROKER_URL.startswith('/') or CELERY_BROKER_URL == '/0':
    CELERY_BROKER_URL = f"{REDIS_URL}/0"
elif not CELERY_BROKER_URL.startswith('redis://'):
    # If it's not a valid Redis URL, try to fix it
    CELERY_BROKER_URL = f"{REDIS_URL}/0"

if not CELERY_RESULT_BACKEND or CELERY_RESULT_BACKEND.startswith('/') or CELERY_RESULT_BACKEND == '/2':
    CELERY_RESULT_BACKEND = f"{REDIS_URL}/2"
elif not CELERY_RESULT_BACKEND.startswith('redis://'):
    # If it's not a valid Redis URL, try to fix it
    CELERY_RESULT_BACKEND = f"{REDIS_URL}/2"

# Log the configuration (helpful for debugging)
logger.info(f"Celery Broker URL: {CELERY_BROKER_URL}")
logger.info(f"Celery Result Backend: {CELERY_RESULT_BACKEND}")

# Validate that we have proper Redis URLs
if not CELERY_BROKER_URL.startswith('redis://'):
    raise ValueError(
        f"Invalid CELERY_BROKER_URL: {CELERY_BROKER_URL}. "
        f"Expected Redis URL starting with 'redis://'"
    )

if not CELERY_RESULT_BACKEND.startswith('redis://'):
    raise ValueError(
        f"Invalid CELERY_RESULT_BACKEND: {CELERY_RESULT_BACKEND}. "
        f"Expected Redis URL starting with 'redis://'"
    )

# Create Celery app
celery_app = Celery("Repruv")

# Configure Celery using conf.update for better control
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
            "rate_limit": "10/m",  # 10 per minute
        },
        "app.tasks.email.send_email": {
            "rate_limit": "30/m",  # 30 per minute
        },
    },
)

# Configure periodic tasks (beat schedule)
celery_app.conf.beat_schedule = {
    # Sync reviews every hour for active locations
    "sync-all-reviews": {
        "task": "app.tasks.reviews.sync_all_active_locations",
        "schedule": crontab(minute=0),  # Every hour
        "options": {
            "queue": "reviews",
            "expires": 3600,
        },
    },
    
    # Generate daily analytics snapshots
    "generate-analytics-snapshots": {
        "task": "app.tasks.analytics.generate_daily_snapshots",
        "schedule": crontab(hour=2, minute=0),  # 2 AM UTC daily
        "options": {
            "queue": "analytics",
            "expires": 3600,
        },
    },
    
    # Check for trial expirations
    "check-trial-expirations": {
        "task": "app.tasks.email.check_trial_expirations",
        "schedule": crontab(hour=9, minute=0),  # 9 AM UTC daily
        "options": {
            "queue": "email",
            "expires": 3600,
        },
    },
    
    # Process automation rules every 5 minutes
    "process-automation-rules": {
        "task": "app.tasks.automation.process_all_rules",
        "schedule": crontab(minute="*/5"),  # Every 5 minutes
        "options": {
            "queue": "automation",
            "expires": 300,
        },
    },
    
    # Clean up old data monthly
    "cleanup-old-data": {
        "task": "app.tasks.analytics.cleanup_old_data",
        "schedule": crontab(hour=3, minute=0, day_of_month=1),  # First day of month at 3 AM
        "options": {
            "queue": "analytics",
            "expires": 7200,
        },
    },
}


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
        "successful": result.successful(),
        "failed": result.failed(),
    }


def revoke_task(task_id: str, terminate: bool = False) -> bool:
    """
    Revoke a pending or running task.
    
    Args:
        task_id: The task ID to revoke
        terminate: If True, terminate running tasks
        
    Returns:
        bool: True if revocation was sent
    """
    try:
        celery_app.control.revoke(task_id, terminate=terminate)
        return True
    except Exception as e:
        logger.error(f"Failed to revoke task {task_id}: {e}")
        return False


def get_active_queues() -> list:
    """Get list of active queues."""
    try:
        inspect = celery_app.control.inspect()
        active_queues = inspect.active_queues()
        if active_queues:
            return list(active_queues.keys())
        return []
    except Exception as e:
        logger.error(f"Failed to get active queues: {e}")
        return []


def ping_workers() -> bool:
    """Check if Celery workers are responsive."""
    try:
        inspect = celery_app.control.inspect()
        stats = inspect.stats()
        return bool(stats)
    except Exception as e:
        logger.error(f"Failed to ping workers: {e}")
        return False


# Health check function for monitoring
def celery_health_check() -> dict:
    """
    Perform a health check on Celery.
    
    Returns:
        dict: Health check results
    """
    health = {
        "broker_url": CELERY_BROKER_URL.replace(
            CELERY_BROKER_URL.split('@')[0].split('//')[-1], 
            "***"
        ) if '@' in CELERY_BROKER_URL else "not configured",
        "workers_online": ping_workers(),
        "active_queues": get_active_queues(),
    }
    
    # Test Redis connection
    try:
        from redis import Redis
        from urllib.parse import urlparse
        
        parsed = urlparse(CELERY_BROKER_URL)
        redis_client = Redis(
            host=parsed.hostname,
            port=parsed.port or 6379,
            password=parsed.password,
            db=int(parsed.path.lstrip('/')) if parsed.path else 0,
            socket_connect_timeout=5,
        )
        redis_client.ping()
        health["redis_connection"] = "healthy"
    except Exception as e:
        health["redis_connection"] = f"unhealthy: {str(e)}"
    
    return health


# Auto-discovery of tasks when used with Django
try:
    from django.conf import settings as django_settings
    if django_settings.configured:
        celery_app.autodiscover_tasks(lambda: django_settings.INSTALLED_APPS)
except ImportError:
    # Not using Django, tasks should be explicitly imported
    pass


# For debugging - remove in production
if os.environ.get('DEBUG_CELERY'):
    logger.debug(f"Celery configuration loaded:")
    logger.debug(f"  Broker: {CELERY_BROKER_URL}")
    logger.debug(f"  Backend: {CELERY_RESULT_BACKEND}")
    logger.debug(f"  Imports: {celery_app.conf.imports}")