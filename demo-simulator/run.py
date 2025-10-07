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
    """Create database tables using SQLAlchemy."""
    print("🔄 Initializing database tables...")
    
    try:
        from app.core.database import init_db
        asyncio.run(init_db())
        print("✅ Database tables ready (created or already exist)")
    except Exception as e:
        print(f"⚠️  Database initialization had issues: {e}")
        print("⚠️  Continuing anyway - tables may already exist or will be created on first use")


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
