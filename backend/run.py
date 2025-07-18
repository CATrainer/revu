#!/usr/bin/env python
"""
Runner script for Railway deployment.
This script reads the PORT environment variable that Railway sets.
"""

import os
import uvicorn

if __name__ == "__main__":
    # Get port from Railway's PORT environment variable
    # If PORT is not set (local development), default to 8000
    port = int(os.environ.get("PORT", 8000))
    
    # Print for debugging - you'll see this in Railway logs
    print(f"Starting Revu API on port {port}")
    print(f"PORT environment variable: {os.environ.get('PORT', 'Not set - using default 8000')}")
    
    # Run the FastAPI app
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        log_level="info"
    )