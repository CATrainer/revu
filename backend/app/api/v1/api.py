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
    insights_v2,
    action_plans,
    onboarding,
    applications,
    monetization,
    monetization_discovery,
)
from app.api.v1.endpoints import workflows as workflows_endpoints
from app.api.v1.endpoints import marketing_admin
# New interaction management endpoints
from app.api.v1.endpoints import interactions, views, fans
# Demo mode endpoints
from app.api.v1.endpoints import demo, demo_webhooks, analytics, jobs
# Agency endpoints
from app.api.v1.endpoints import agency_auth, agency, creator_agency, agency_opportunities, creator_opportunities
# Team management endpoints
from app.api.v1.endpoints import agency_team
# New Agency Dashboard endpoints
from app.api.v1.endpoints import agency_dashboard, agency_campaigns, agency_finance, agency_tasks
# Creator tools (notifications, deals, calendar, insights, media kit, rates)
from app.api.v1.endpoints import creator_tools
# Currency endpoints
from app.api.v1.endpoints import currency
# Notification endpoints
from app.api.v1.endpoints import notifications, agency_notifications
# Support and Newsletter endpoints
from app.api.v1.endpoints import agency_support, newsletter
# Billing and Stripe webhooks
from app.api.v1.endpoints import billing, stripe_webhooks

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
    insights_v2.router,
    prefix="/insights/v2",
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

api_router.include_router(
    monetization.router,
    prefix="/monetization",
    tags=["monetization"],
)

api_router.include_router(
    monetization_discovery.router,
    tags=["monetization", "discovery"],
)

# Agency endpoints
api_router.include_router(
    agency_auth.router,
    prefix="/agency",
    tags=["agency", "authentication"],
)

api_router.include_router(
    agency.router,
    prefix="/agency",
    tags=["agency"],
)

api_router.include_router(
    creator_agency.router,
    prefix="/creator/agency",
    tags=["creator", "agency"],
)

api_router.include_router(
    agency_opportunities.router,
    prefix="/agency/opportunities",
    tags=["agency", "opportunities"],
)

api_router.include_router(
    creator_opportunities.router,
    prefix="/creator/opportunities",
    tags=["creator", "opportunities"],
)

# Team Management endpoints
api_router.include_router(
    agency_team.router,
    prefix="/agency/team",
    tags=["agency", "team"],
)

# Agency Dashboard endpoints
api_router.include_router(
    agency_dashboard.router,
    prefix="/agency/dashboard",
    tags=["agency", "dashboard"],
)

api_router.include_router(
    agency_campaigns.router,
    prefix="/agency/campaigns",
    tags=["agency", "campaigns"],
)

api_router.include_router(
    agency_finance.router,
    prefix="/agency/finance",
    tags=["agency", "finance"],
)

api_router.include_router(
    agency_tasks.router,
    prefix="/agency",
    tags=["agency", "tasks"],
)

# Creator tools (notifications, deals, calendar, insights, media kit, rates)
api_router.include_router(
    creator_tools.router,
    prefix="/creator",
    tags=["creator", "tools"],
)

# Currency endpoints
api_router.include_router(
    currency.router,
    prefix="/currency",
    tags=["currency"],
)

# Notification endpoints (creator)
api_router.include_router(
    notifications.router,
    tags=["notifications"],
)

# Agency notification endpoints
api_router.include_router(
    agency_notifications.router,
    prefix="/agency",
    tags=["agency", "notifications"],
)

# Agency support ticket system
api_router.include_router(
    agency_support.router,
    prefix="/agency/support",
    tags=["agency", "support"],
)

# Newsletter subscription endpoints
api_router.include_router(
    newsletter.router,
    prefix="/newsletter",
    tags=["newsletter"],
)

# Billing endpoints
api_router.include_router(
    billing.router,
    prefix="/billing",
    tags=["billing"],
)

# Stripe webhook endpoints
api_router.include_router(
    stripe_webhooks.router,
    prefix="/webhooks",
    tags=["webhooks", "stripe"],
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
