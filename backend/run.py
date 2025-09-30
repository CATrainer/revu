#!/usr/bin/env python
"""
Runner script for Railway deployment.
"""

import os
import subprocess
import sys

def run_migrations():
    """Run database migrations before starting the app."""
    print("Running database migrations...")
    try:
        # Run alembic upgrade
        result = subprocess.run(
            ["alembic", "upgrade", "head"],
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            print("✅ Migrations completed successfully")
            print(result.stdout)
        else:
            print("❌ Migration failed:")
            print(result.stderr)
            sys.exit(1)
    except Exception as e:
        print(f"❌ Failed to run migrations: {e}")
        sys.exit(1)

if __name__ == "__main__":
    # Run migrations first
    run_migrations()
    
    # Then start the app
    import uvicorn
    from loguru import logger

    port = int(os.environ.get("PORT", 8000))
    print(f"Starting Repruve API on port {port}")

    # --- Early diagnostics: validate required env vars before uvicorn loads app ---
    # Redis made optional for basic API startup (features that need it will log warnings later)
    REQUIRED_VARS = [
        "SECRET_KEY", "DATABASE_URL", "SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY",
        "OPENAI_API_KEY", "CALENDLY_ACCESS_TOKEN", "RESEND_API_KEY", "EMAIL_FROM_ADDRESS"
    ]
    missing = [v for v in REQUIRED_VARS if not os.environ.get(v)]
    if missing:
        logger.error(f"❌ Missing required environment variables: {', '.join(missing)}")
        logger.error("Application will exit before starting Uvicorn.")
        sys.exit(1)

    # Inject Redis fallbacks if absent (non-fatal)
    if not os.environ.get("REDIS_URL"):
        os.environ["REDIS_URL"] = "redis://localhost:6379/0"
        logger.warning("REDIS_URL not set; using local fallback redis://localhost:6379/0 (features needing Redis may degrade)")
    if not os.environ.get("REDIS_CACHE_URL"):
        os.environ["REDIS_CACHE_URL"] = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
        logger.warning("REDIS_CACHE_URL not set; mirroring REDIS_URL fallback")

    # Test importing config & main components explicitly to surface validation errors clearly
    try:
        from app.core.config import settings  # noqa: F401
        logger.info("Settings imported successfully (environment validation passed)")
    except Exception as e:  # noqa: BLE001
        logger.exception("Failed importing settings (pydantic validation likely). Exiting.")
        sys.exit(1)

    # Granular import check for api router to isolate failing module
    try:
        from app.api.v1 import api  # noqa: F401
        logger.info("API router module imported successfully")
    except Exception as e:  # noqa: BLE001
        logger.exception("Import error inside app.api.v1.api; check referenced endpoint modules.")
        sys.exit(1)

    # Optionally enqueue a one-time kickoff of the first waitlist email on deploy.
    # Guarded by env var and by a DB check to avoid duplicate sends across redeploys.
    try:
        flag = os.environ.get("WAITLIST_FIRST_EMAIL_KICKOFF_ON_DEPLOY", "").strip().lower()
        if flag in ("1", "true", "yes"):  # explicitly enabled
            from sqlalchemy import select, func
            from app.core.database import async_session_maker
            from app.models.user import User

            async def _should_kickoff() -> bool:
                async with async_session_maker() as session:
                    # Kick off only if there exist waiting-list users without the first email marker
                    from sqlalchemy import or_, and_
                    res = await session.execute(
                        select(func.count()).where(
                            User.access_status.in_(["waiting", "waiting_list"]),
                            User.countdown_t14_sent_at.is_(None),
                        )
                    )
                    missing = int(res.scalar() or 0) > 0
                    return missing

            import asyncio
            do_kickoff = False
            try:
                do_kickoff = asyncio.get_event_loop().run_until_complete(_should_kickoff())
            except RuntimeError:
                do_kickoff = asyncio.run(_should_kickoff())

            if do_kickoff:
                from app.tasks.email import kickoff_waitlist_first_email
                kickoff_waitlist_first_email.delay()
                logger.info("Enqueued kickoff_waitlist_first_email due to WAITLIST_FIRST_EMAIL_KICKOFF_ON_DEPLOY=1")
            else:
                logger.info("Kickoff skipped: first email already sent previously (marker found)")
    except Exception:
        logger.exception("Failed to evaluate/enqueue kickoff_waitlist_first_email")

    try:
        uvicorn.run(
            "app.main:app",
            host="0.0.0.0",
            port=port,
            log_level="info",
            ws="websockets",
            ws_ping_interval=20,
            ws_ping_timeout=20
        )
    except Exception:
        logger.exception("Uvicorn failed to start")
        sys.exit(1)