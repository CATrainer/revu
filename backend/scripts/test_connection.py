"""Simple connection test."""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from app.core.config import settings


def test_config():
    """Test configuration values."""
    print("🔍 Configuration values:")
    print(f"SUPABASE_URL: {settings.SUPABASE_URL[:30]}...")
    print(f"DATABASE_URL: {settings.DATABASE_URL.split('@')[0]}@...")  # Hide password
    print(f"FRONTEND_URL: {settings.FRONTEND_URL}")
    print()


async def test_direct_connection():
    """Test direct database connection."""
    import asyncpg
    
    print("🔌 Testing direct database connection...")
    
    try:
        # Parse the database URL to extract components
        from urllib.parse import urlparse
        
        parsed = urlparse(settings.DATABASE_URL.replace('postgresql+asyncpg://', 'postgresql://'))
        
        # Connect directly with asyncpg
        conn = await asyncpg.connect(
            host=parsed.hostname,
            port=parsed.port or 5432,
            user=parsed.username,
            password=parsed.password,
            database=parsed.path.lstrip('/'),
            ssl='require'  # Supabase requires SSL
        )
        
        # Test query
        result = await conn.fetchval('SELECT 1')
        print(f"✅ Direct connection successful! Test query returned: {result}")
        
        await conn.close()
        
    except Exception as e:
        print(f"❌ Direct connection failed: {e}")
        print(f"   Error type: {type(e).__name__}")


async def main():
    """Run all tests."""
    test_config()
    await test_direct_connection()


if __name__ == "__main__":
    asyncio.run(main())