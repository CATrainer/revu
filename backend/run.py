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
    
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting Repruve API on port {port}")
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        log_level="info"
    )