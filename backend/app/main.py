"""
Main FastAPI application module.

This module creates and configures the FastAPI application instance,
including middleware, routers, and event handlers.
"""

import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request, status

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
    try:
        await create_db_and_tables()
        logger.info("✅ Database initialization completed")
        
        # Verify critical tables and columns exist
        from app.core.database import get_async_session
        from sqlalchemy import text
        
        async for session in get_async_session():
            # Check if the users table has the new columns
            result = await session.execute(
                text("SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name IN ('access_status', 'demo_requested')")
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
        "message": "Welcome to Revu API",
        "docs": f"{settings.API_V1_PREFIX}/docs" if not settings.is_production else "Disabled in production",
        "health": "/health",
    }

# Configure CORS
origins = settings.BACKEND_CORS_ORIGINS

# Railway deployment safety: ensure CORS is configured even if env vars are missing
railway_env = os.getenv("RAILWAY_ENVIRONMENT_NAME")
if railway_env:
    logger.info(f"Running in Railway environment: {railway_env}")
    # For Railway, ensure we always include the production URLs
    required_origins = [
        "https://revu-one.vercel.app",
        "https://revu.vercel.app", 
        "http://localhost:3000"
    ]
    origins_str = [str(o).rstrip('/') for o in origins] if origins else []
    for required in required_origins:
        if required not in origins_str:
            origins.append(required)
            logger.info(f"Added required origin for Railway: {required}")

# If CORS origins are not properly set, use a default that includes your Vercel app
if not origins or origins == [""]:
    logger.warning("CORS origins not properly configured, using defaults")
    origins = [
        "http://localhost:3000",
        "http://localhost:3001", 
        "https://revu-one.vercel.app",
        "https://revu.vercel.app",
    ]

# Always ensure the Vercel app is included (for Railway deployment safety)
vercel_urls = ["https://revu-one.vercel.app", "https://revu-one.vercel.app/"]
for url in vercel_urls:
    if url not in [str(o).rstrip('/') for o in origins]:
        origins.append(url)

logger.info(f"CORS configured for origins: {origins}")
logger.info(f"Origins type: {type(origins)}, First origin type: {type(origins[0]) if origins else 'None'}")

@app.middleware("http")
async def manual_cors_middleware(request: Request, call_next):
    # Handle preflight requests
    if request.method == "OPTIONS":
        headers = {
            "Access-Control-Allow-Origin": request.headers.get("origin", "*"),
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Max-Age": "3600",
        }
        return JSONResponse(content={"message": "OK"}, headers=headers)
    
    # Process the request
    response = await call_next(request)
    
    # Add CORS headers to all responses
    origin = request.headers.get("origin")
    
    # More permissive CORS for debugging - allow all Vercel and localhost origins
    if origin and (
        origin.startswith("https://revu-one.vercel.app") or
        origin.startswith("https://revu.vercel.app") or
        origin.startswith("http://localhost") or
        origin.startswith("https://localhost")
    ):
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
    
    # Fallback: check configured origins
    elif origin:
        origin_without_slash = origin.rstrip('/')
        # Convert origins to strings and remove trailing slashes for comparison
        origins_without_slash = [str(o).rstrip('/') for o in origins]
        if origin_without_slash in origins_without_slash:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
    
    return response

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


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.is_development,
        log_level=settings.LOG_LEVEL.lower(),
    )