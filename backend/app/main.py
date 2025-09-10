"""
Main FastAPI application module.

This module creates and configures the FastAPI application instance,
including middleware, routers, and event handlers.
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator
import asyncio

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

    # Initialize database with retry (resilient startup on cold DB / migrations pending)
    max_attempts = 5
    delay = 1.0
    for attempt in range(1, max_attempts + 1):
        try:
            await create_db_and_tables()
            logger.info("✅ Database initialization (attempt {}/{}).", attempt, max_attempts)
            break
        except Exception as e:
            logger.warning("DB init attempt {}/{} failed: {}", attempt, max_attempts, e)
            if attempt == max_attempts:
                logger.error("❌ All database init attempts failed; continuing with degraded state")
            else:
                await asyncio.sleep(delay)
                delay = min(delay * 2, 15)
    # Lightweight / best-effort schema verifications (wrapped to avoid startup crash)
    try:
        from app.core.database import get_async_session
        from sqlalchemy import text
        async for session in get_async_session():
            try:
                # Verify users table columns (non-fatal)
                result = await session.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name IN ('access_status', 'demo_requested', 'user_kind')"))
                cols = {r[0] for r in result.fetchall()}
                missing = { 'access_status', 'demo_requested'} - cols
                if missing:
                    logger.warning("User table missing columns: {} (migrations may be pending)", missing)
                # Probe rule_response_metrics existence (non-fatal)
                try:
                    await session.execute(text("SELECT 1 FROM rule_response_metrics LIMIT 1"))
                except Exception as e:  # table/column may not exist yet
                    await session.rollback()
                    logger.warning("rule_response_metrics not ready at startup (non-fatal): {}", e)
            finally:
                # Ensure we don't hold the session beyond first iteration
                break
    except Exception as e:
        logger.debug("Startup schema probe skipped due to error: {}", e)

    # Initialize other services here (Redis, etc.)

    # Start background polling task (delayed + resilient)
    from app.background_tasks import run_polling_cycle
    stop_event = asyncio.Event()
    async def _delayed_polling_wrapper():
        await asyncio.sleep(30)  # allow database & migrations to settle
        try:
            await run_polling_cycle(interval_seconds=60, stop_event=stop_event)
        except Exception:
            logger.exception("Polling loop terminated unexpectedly")
    polling_task = asyncio.create_task(_delayed_polling_wrapper())
    app.state._polling_stop_event = stop_event
    app.state._polling_task = polling_task

    yield

    # Shutdown
    logger.info("Shutting down application")

    # Cleanup tasks here
    try:
        stop_event = getattr(app.state, "_polling_stop_event", None)
        task = getattr(app.state, "_polling_task", None)
        if stop_event is not None:
            stop_event.set()
        if task is not None:
            await task
    except Exception as e:
        logger.warning(f"Error stopping polling task: {e}")


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
        allowed_hosts=[
            "*.repruv.ai",
            "repruv.ai",
            "*.railway.app",
            "*.vercel.app",
            "repruv.co.uk",
            "www.repruv.co.uk",
        ],
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