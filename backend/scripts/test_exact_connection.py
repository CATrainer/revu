"""Test exact connection string."""

import asyncio
import asyncpg
from urllib.parse import urlparse

# IMPORTANT: Copy your EXACT connection string from Supabase dashboard here
# Go to Settings -> Database -> Connection string -> Session mode
# Copy the entire string and paste it below
CONNECTION_STRING = "postgresql://postgres.vbbtlcwxapbtmqdkexcq:ohsdgonlkadlgslsg@aws-0-eu-north-1.pooler.supabase.com:5432/postgres"


async def test_connection():
    """Test the connection string directly."""
    
    print("🔌 Testing Supabase connection...\n")
    
    # Parse the connection string
    parsed = urlparse(CONNECTION_STRING)
    
    print(f"Host: {parsed.hostname}")
    print(f"Port: {parsed.port}")
    print(f"User: {parsed.username}")
    print(f"Database: {parsed.path.lstrip('/')}\n")
    
    try:
        # Connect with SSL required
        conn = await asyncpg.connect(
            host=parsed.hostname,
            port=parsed.port or 5432,
            user=parsed.username,
            password=parsed.password,
            database=parsed.path.lstrip('/'),
            ssl='require'
        )
        
        # Test query
        result = await conn.fetchval('SELECT current_database()')
        print(f"✅ Connected successfully!")
        print(f"   Database: {result}")
        
        # Get version
        version = await conn.fetchval('SELECT version()')
        print(f"   PostgreSQL: {version.split(',')[0]}")
        
        await conn.close()
        
        print(f"\n✅ Connection string works! Use this in your .env:")
        print(f"   DATABASE_URL={CONNECTION_STRING.replace('postgresql://', 'postgresql+asyncpg://')}")
        
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        print(f"\nTroubleshooting:")
        print(f"1. Make sure you copied the EXACT string from Supabase dashboard")
        print(f"2. Try both 'Session mode' and 'Transaction mode' connection strings")
        print(f"3. Ensure your password doesn't have special characters that need encoding")


if __name__ == "__main__":
    # Instructions
    print("📋 Instructions:")
    print("1. Go to https://app.supabase.com/project/vbbtlcwxapbtmqdkexcq/settings/database")
    print("2. Find 'Connection pooling' section")
    print("3. Copy the connection string (try Session mode first)")
    print("4. Paste it in this script where it says CONNECTION_STRING")
    print("5. Run this script again\n")
    
    if "[YOUR-PROJECT-REF]" in CONNECTION_STRING:
        print("⚠️  Please update CONNECTION_STRING with your actual connection string first!")
    else:
        asyncio.run(test_connection())