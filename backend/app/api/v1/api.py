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
    locations,
    organizations,
    reviews,
    users,
    webhooks,
)

# Create the main API router
api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(
    admin.router,
    prefix="/admin",
    tags=["admin"],
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
    organizations.router,
    prefix="/organizations",
    tags=["organizations"],
)

api_router.include_router(
    locations.router,
    prefix="/locations",
    tags=["locations"],
)

api_router.include_router(
    reviews.router,
    prefix="/reviews",
    tags=["reviews"],
)

api_router.include_router(
    ai.router,
    prefix="/ai",
    tags=["ai"],
)

api_router.include_router(
    analytics.router,
    prefix="/analytics",
    tags=["analytics"],
)

api_router.include_router(
    webhooks.router,
    prefix="/webhooks",
    tags=["webhooks"],
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
            "organizations": "/organizations",
            "locations": "/locations",
            "reviews": "/reviews",
            "ai": "/ai",
            "analytics": "/analytics",
            "webhooks": "/webhooks",
        },
    }
