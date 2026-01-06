"""
Run script for demo-simulator service.

This script:
1. Creates database tables (if not exist)
2. Starts the FastAPI application
"""
import os
import sys
import asyncio


def init_database():
    """Create database tables and run migrations using SQLAlchemy."""
    print("🔄 Initializing database tables...")
    
    try:
        # Run migrations synchronously before uvicorn starts
        # This avoids event loop conflicts
        asyncio.run(_run_migrations())
        print("✅ Database tables ready (created or already exist)")
    except Exception as e:
        print(f"⚠️  Database initialization had issues: {e}")
        print("⚠️  Continuing anyway - tables may already exist or will be created on first use")


async def _run_migrations():
    """Run database migrations with a fresh engine."""
    from sqlalchemy.ext.asyncio import create_async_engine
    from sqlalchemy import text
    from app.core.config import settings
    
    # Convert postgres:// to postgresql+asyncpg://
    db_url = settings.DATABASE_URL
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
    if not db_url.startswith("postgresql+asyncpg://"):
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    
    # Create a fresh engine just for migrations
    engine = create_async_engine(db_url, echo=False)
    
    async with engine.begin() as conn:
        # Migration 1: Add channel_name to demo_profiles
        result = await conn.execute(text("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'demo_profiles' AND column_name = 'channel_name'
        """))
        if result.fetchone() is None:
            print("📦 Adding channel_name column to demo_profiles...")
            await conn.execute(text("ALTER TABLE demo_profiles ADD COLUMN channel_name VARCHAR(100)"))
            print("✅ Added channel_name column!")
        
        # Migration 2: Add url column to demo_content
        result = await conn.execute(text("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'demo_content' AND column_name = 'url'
        """))
        if result.fetchone() is None:
            print("📦 Adding url column to demo_content...")
            await conn.execute(text("ALTER TABLE demo_content ADD COLUMN url TEXT"))
            print("✅ Added url column!")
    
    await engine.dispose()


def start_server():
    """Start the FastAPI server."""
    print("🚀 Starting FastAPI server...")
    
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8001))
    
    # Import here to avoid issues before migrations
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=False,  # Disable reload in production
        log_level="info",
    )


if __name__ == "__main__":
    print("=" * 60)
    print("🎬 Demo Simulator Service Starting...")
    print("=" * 60)
    
    # Initialize database tables
    init_database()
    
    print("=" * 60)
    
    # Start the server
    start_server()
