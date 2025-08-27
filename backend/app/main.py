"""
Main FastAPI application module.

This module creates and configures the FastAPI application instance,
including middleware, routers, and event handlers.
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request, status, HTTPException

from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from loguru import logger

from app.api.v1.api import api_router
from app.core.config import settings
from app.core.database import create_db_and_tables
from app.utils.logging import setup_logging
from app.middleware.error_handler import register_error_handlers, add_error_handling_middleware

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
    try:
        await create_db_and_tables()
        logger.info("✅ Database initialization completed")
        
        # Verify critical tables and columns exist
        from app.core.database import get_async_session
        from sqlalchemy import text
        
        async for session in get_async_session():
            # Check if the users table has key columns
            result = await session.execute(
                text("SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name IN ('access_status', 'demo_requested', 'user_kind')")
            )
            columns = [row[0] for row in result.fetchall()]
            
            if 'access_status' not in columns or 'demo_requested' not in columns:
                logger.error("❌ Database schema appears to be missing recent migration columns")
                logger.error("This may cause application errors. Please check migration status.")
            else:
                logger.info("✅ Database schema verification passed")
            break
            
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {e}")
        # Don't exit here, let the app try to start anyway
        # The health check endpoint will catch any issues

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
    """Enhanced health check endpoint for Railway with database verification."""
    health_status = {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "checks": {}
    }
    
    # Database connectivity check
    try:
        from app.core.database import get_async_session
        from sqlalchemy import text
        
        async for session in get_async_session():
            await session.execute(text("SELECT 1"))
            health_status["checks"]["database"] = "healthy"
            
            # Check if critical columns exist
            result = await session.execute(
                text("SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'access_status'")
            )
            if result.fetchone():
                health_status["checks"]["schema"] = "healthy"
            else:
                health_status["checks"]["schema"] = "missing_columns"
                health_status["status"] = "degraded"
            break
            
    except Exception as e:
        health_status["checks"]["database"] = f"unhealthy: {str(e)}"
        health_status["status"] = "unhealthy"
    
    # Import checks
    try:
        from app.models.user import User
        from app.schemas.user import User as UserSchema
        health_status["checks"]["imports"] = "healthy"
    except Exception as e:
        health_status["checks"]["imports"] = f"unhealthy: {str(e)}"
        health_status["status"] = "unhealthy"
    
    return health_status

# Root endpoint
@app.get("/", tags=["root"])
async def root():
    """Root endpoint."""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "message": "Welcome to Repruv API",
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
        "https://www.repruv.co.uk",
    ]

# Ensure new production domain is present (idempotent)
if "https://www.repruv.co.uk" not in origins:
    origins.append("https://www.repruv.co.uk")
if "https://repruv.co.uk" not in origins:
    origins.append("https://repruv.co.uk")

# Normalize (strip trailing slashes) and coerce to plain strings
origins = [str(o).rstrip('/').lower() for o in origins if o]
# De-duplicate while preserving order
_seen = set()
origins = [o for o in origins if not (o in _seen or _seen.add(o))]

logger.info(f"CORS configured for origins: {origins}")

# Use Starlette's CORSMiddleware for robust, battle-tested handling
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
    ,expose_headers=["Content-Disposition"],
    max_age=3600,
)

# Add other middlewares
app.add_middleware(GZipMiddleware, minimum_size=1000)

if settings.is_production:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["*.Repruv.ai", "Repruv.ai", "*.railway.app", "*.vercel.app"],
    )

# Add custom exception handlers
register_error_handlers(app)

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
    import traceback
    
    # Log the full traceback for debugging
    logger.error(f"Unhandled exception on {request.method} {request.url.path}")
    logger.error(f"Exception type: {type(exc).__name__}")
    logger.error(f"Exception message: {str(exc)}")
    logger.error(f"Full traceback:\n{traceback.format_exc()}")
    
    # Also log request details that might be relevant
    logger.error(f"Request headers: {dict(request.headers)}")
    
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
                "type": type(exc).__name__ if not settings.is_production else None,
            },
        },
    )

# Include API routers
app.include_router(api_router, prefix=settings.API_V1_PREFIX)

# Include webhook routes (without API prefix)
from app.api.webhooks import calendly
app.include_router(calendly.router, prefix="/webhooks", tags=["webhooks"])

# Optional: Add request logging for debugging
if settings.DEBUG:
    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        logger.debug(f"Incoming request: {request.method} {request.url.path}")
        logger.debug(f"Origin header: {request.headers.get('origin', 'None')}")
        response = await call_next(request)
        logger.debug(f"Response status: {response.status_code}")
        return response

# Install YouTube error handling middleware as last to catch uncaught errors
add_error_handling_middleware(app)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.is_development,
        log_level=settings.LOG_LEVEL.lower(),
    )