"""
Run script for demo-simulator service.

This script:
1. Runs database migrations
2. Starts the FastAPI application
"""
import os
import sys
import subprocess
import asyncio
from pathlib import Path

def run_migrations():
    """Run Alembic migrations."""
    print("🔄 Running database migrations...")
    
    try:
        # Run alembic upgrade
        result = subprocess.run(
            ["alembic", "upgrade", "head"],
            check=True,
            capture_output=True,
            text=True
        )
        print("✅ Migrations completed successfully")
        if result.stdout:
            print(result.stdout)
    except subprocess.CalledProcessError as e:
        print(f"❌ Migration failed: {e}")
        if e.stderr:
            print(e.stderr)
        # Try to create tables directly if migrations fail
        print("⚠️  Attempting to create tables directly...")
        try:
            from app.core.database import init_db
            asyncio.run(init_db())
            print("✅ Tables created successfully")
        except Exception as init_error:
            print(f"❌ Direct table creation failed: {init_error}")
            print("⚠️  Continuing anyway - tables may already exist")


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
    
    # Run migrations first
    run_migrations()
    
    print("=" * 60)
    
    # Start the server
    start_server()
