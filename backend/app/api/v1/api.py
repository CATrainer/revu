"""
Main API router that combines all v1 endpoints.

This module aggregates all the API routes and provides
a single router to be included in the main application.
"""

from fastapi import APIRouter

from app.api.v1.endpoints import (
    admin,
    ai,
    analytics,
    auth,
    early_warning,
    debug,
    test_utils,
    automation,
    system,
    youtube_auth,
    youtube_content,
    platforms,
    users,
    user_preferences,
    webhooks,
    social_monitoring,
    chat,
    chat_intelligence,
    chat_templates,
    content_sync,
    context,
)
from app.api.v1.endpoints import workflows as workflows_endpoints
from app.api.v1.endpoints import marketing_admin

# Create the main API router
api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(
    admin.router,
    prefix="/admin",
    tags=["admin"],
)

api_router.include_router(
    marketing_admin.router,
    prefix="/admin",
    tags=["admin","marketing"],
)

api_router.include_router(
    auth.router,
    prefix="/auth",
    tags=["authentication"],
)

api_router.include_router(
    users.router,
    prefix="/users",
    tags=["users"],
)

api_router.include_router(
    user_preferences.router,
    prefix="/users",
    tags=["users", "preferences"],
)

# Removed: organizations, locations, reviews - not needed for social media focus

api_router.include_router(
    ai.router,
    prefix="/ai",
    tags=["ai"],
)

api_router.include_router(
    automation.router,
    prefix="/automation",
    tags=["automation"],
)

api_router.include_router(
    system.router,
    prefix="/system",
    tags=["system"],
)

# Removed segments - not needed for social media focus

api_router.include_router(
    test_utils.router,
    prefix="/test",
    tags=["test"],
)

api_router.include_router(
    debug.router,
    prefix="/debug",
    tags=["debug"],
)

api_router.include_router(
    analytics.router,
    prefix="/analytics",
    tags=["analytics"],
)

api_router.include_router(
    early_warning.router,
    prefix="/early-warning",
    tags=["early-warning"],
)

api_router.include_router(
    social_monitoring.router,
    prefix="/monitoring",
    tags=["monitoring"],
)

api_router.include_router(
    chat.router,
    prefix="/chat",
    tags=["chat"],
)

api_router.include_router(
    chat_intelligence.router,
    prefix="/chat",
    tags=["chat", "intelligence"],
)

api_router.include_router(
    chat_templates.router,
    prefix="/chat",
    tags=["chat", "templates"],
)

api_router.include_router(
    content_sync.router,
    prefix="/content",
    tags=["content", "sync"],
)

api_router.include_router(
    context.router,
    prefix="/ai",
    tags=["ai", "context"],
)

api_router.include_router(
    workflows_endpoints.router,
    prefix="/workflows",
    tags=["workflows"],
)

api_router.include_router(
    webhooks.router,
    prefix="/webhooks",
    tags=["webhooks"],
)

# demo routes removed for production revamp

api_router.include_router(
    platforms.router,
    tags=["platforms"],
)

api_router.include_router(
    youtube_auth.router,
    prefix="/youtube",
    tags=["youtube"],
)

api_router.include_router(
    youtube_content.router,
    prefix="/youtube",
    tags=["youtube"],
)

from app.api.v1.endpoints import polling as polling_endpoints

api_router.include_router(
    polling_endpoints.router,
    prefix="/polling",
    tags=["polling"],
)


# Root endpoint for API version
@api_router.get("/", tags=["root"])
async def api_root():
    """API v1 root endpoint."""
    return {
        "version": "v1",
        "status": "active",
        "endpoints": {
            "auth": "/auth",
            "users": "/users",
            "ai": "/ai",
            "automation": "/automation",
            "analytics": "/analytics",
            "social_monitoring": "/monitoring",
            "early_warning": "/early-warning",
            "polling": "/polling",
            "chat": "/chat",
            "webhooks": "/webhooks",
            "youtube": "/youtube",
        },
    }
