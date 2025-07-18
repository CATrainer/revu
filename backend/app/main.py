"""
Main FastAPI application module.

This module creates and configures the FastAPI application instance,
including middleware, routers, and event handlers.
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from loguru import logger

from app.api.v1.api import api_router
from app.core.config import settings
from app.core.database import create_db_and_tables
from app.utils.logging import setup_logging

# Setup logging
setup_logging()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator:
    """
    Lifespan context manager for startup and shutdown events.

    This handles application initialization and cleanup tasks.
    """
    # Startup
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"CORS Origins: {settings.BACKEND_CORS_ORIGINS}")

    # Initialize database
    await create_db_and_tables()

    # Initialize other services here (Redis, etc.)

    yield

    # Shutdown
    logger.info("Shutting down application")

    # Cleanup tasks here


# Create the FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    openapi_url=(
        f"{settings.API_V1_PREFIX}/openapi.json"
        if not settings.is_production
        else None
    ),
    docs_url=(
        f"{settings.API_V1_PREFIX}/docs" if not settings.is_production else None
    ),
    redoc_url=(
        f"{settings.API_V1_PREFIX}/redoc" if not settings.is_production else None
    ),
    lifespan=lifespan,
)

# HEALTH CHECK ENDPOINT - MUST BE FIRST
@app.get("/health", tags=["health"])
async def health_check():
    """Health check endpoint for Railway."""
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
    }

# Root endpoint
@app.get("/", tags=["root"])
async def root():
    """Root endpoint."""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "message": "Welcome to Revu API",
        "docs": f"{settings.API_V1_PREFIX}/docs" if not settings.is_production else "Disabled in production",
        "health": "/health",
    }

# Configure CORS
origins = settings.BACKEND_CORS_ORIGINS

# If CORS origins are not properly set, use a default that includes your Vercel app
if not origins or origins == [""]:
    logger.warning("CORS origins not properly configured, using defaults")
    origins = [
        "http://localhost:3000",
        "http://localhost:3001",
        "https://revu-one.vercel.app",
        "https://revu.vercel.app",
    ]

logger.info(f"CORS configured for origins: {origins}")

# Add CORS middleware - must be added before other middlewares
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Add other middlewares
app.add_middleware(GZipMiddleware, minimum_size=1000)

if settings.is_production:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["*.revu.ai", "revu.ai", "*.railway.app", "*.vercel.app"],
    )

# Add custom exception handlers
@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": str(exc),
            },
        },
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_ERROR",
                "message": (
                    "An internal error occurred"
                    if settings.is_production
                    else str(exc)
                ),
            },
        },
    )

# Include API routers
app.include_router(api_router, prefix=settings.API_V1_PREFIX)

# Optional: Add request logging for debugging
if settings.DEBUG:
    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        logger.debug(f"Incoming request: {request.method} {request.url.path}")
        logger.debug(f"Origin header: {request.headers.get('origin', 'None')}")
        response = await call_next(request)
        logger.debug(f"Response status: {response.status_code}")
        return response


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.is_development,
        log_level=settings.LOG_LEVEL.lower(),
    )