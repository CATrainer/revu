"""
Main API router that combines all v1 endpoints.

This module aggregates all the API routes and provides
a single router to be included in the main application.
"""

from fastapi import APIRouter

from app.api.v1.endpoints import (
    admin,
    admin_credits,
    ai,
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
    chat,
    chat_intelligence,
    chat_templates,
    chat_enhancements,
    chat_streaming,
    content_sync,
    rag,
    context,
    dashboard_metrics,
    feedback,
    credits,
    insights,
    action_plans,
    onboarding,
    applications,
)
from app.api.v1.endpoints import workflows as workflows_endpoints
from app.api.v1.endpoints import marketing_admin
# New interaction management endpoints
from app.api.v1.endpoints import interactions, views, fans
# Demo mode endpoints
from app.api.v1.endpoints import demo, demo_webhooks, analytics, jobs

# Create the main API router
api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(
    admin.router,
    prefix="/admin",
    tags=["admin"],
)

api_router.include_router(
    admin_credits.router,
    tags=["admin", "credits"],
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
    onboarding.router,
    prefix="/onboarding",
    tags=["onboarding"],
)

api_router.include_router(
    applications.router,
    prefix="/admin/applications",
    tags=["admin", "applications"],
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

# Analytics endpoints removed - feature not in production

api_router.include_router(
    dashboard_metrics.router,
    prefix="/dashboard",
    tags=["dashboard", "metrics"],
)

api_router.include_router(
    early_warning.router,
    prefix="/early-warning",
    tags=["early-warning"],
)

# Social monitoring removed - feature not in production

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

# ✅ FULLY ASYNC CONVERTED - All queries now use async/await patterns
api_router.include_router(
    chat_enhancements.router,
    prefix="/chat",
    tags=["chat", "enhancements"],
)

api_router.include_router(
    chat_streaming.router,
    prefix="/chat",
    tags=["chat", "streaming"],
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
    rag.router,
    prefix="/rag",
    tags=["rag"],
)

api_router.include_router(
    workflows_endpoints.router,
    prefix="/workflows",
    tags=["workflows"],
)

# New Interaction Management System
api_router.include_router(
    interactions.router,
    tags=["interactions"],
)

api_router.include_router(
    views.router,
    tags=["views"],
)

api_router.include_router(
    fans.router,
    tags=["fans", "crm"],
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

# Demo mode endpoints
api_router.include_router(
    demo.router,
    tags=["demo"],
)

api_router.include_router(
    demo_webhooks.router,
    tags=["demo-webhooks"],
)

api_router.include_router(
    analytics.router,
    tags=["analytics"],
)

api_router.include_router(
    feedback.router,
    prefix="/feedback",
    tags=["feedback"],
)

api_router.include_router(
    credits.router,
    tags=["credits"],
)

api_router.include_router(
    insights.router,
    prefix="/insights",
    tags=["insights", "analytics"],
)

api_router.include_router(
    action_plans.router,
    prefix="/action-plans",
    tags=["action-plans", "goals"],
)

api_router.include_router(
    jobs.router,
    tags=["jobs"],
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
            "early_warning": "/early-warning",
            "polling": "/polling",
            "chat": "/chat",
            "webhooks": "/webhooks",
            "youtube": "/youtube",
            "interactions": "/interactions",  # NEW
            "views": "/views",  # NEW
            "fans": "/fans",  # NEW
            "workflows": "/workflows",
        },
    }
