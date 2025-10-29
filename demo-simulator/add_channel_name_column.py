"""
Migration script to add channel_name column to demo_profiles table.

Run this once after deploying the updated code:
    python add_channel_name_column.py
"""
import asyncio
from sqlalchemy import text
from app.core.database import engine

async def add_channel_name_column():
    """Add channel_name column if it doesn't exist."""
    
    print("🔧 Checking if channel_name column exists...")
    
    async with engine.begin() as conn:
        # Check if column already exists
        check_query = text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'demo_profiles' 
            AND column_name = 'channel_name'
        """)
        
        result = await conn.execute(check_query)
        exists = result.fetchone() is not None
        
        if exists:
            print("✅ Column 'channel_name' already exists. Nothing to do!")
            return
        
        print("➕ Adding 'channel_name' column to demo_profiles table...")
        
        # Add the column
        alter_query = text("""
            ALTER TABLE demo_profiles 
            ADD COLUMN channel_name VARCHAR(100)
        """)
        
        await conn.execute(alter_query)
        
        print("✅ Successfully added 'channel_name' column!")
        print("💡 New profiles will now save their channel names.")

if __name__ == "__main__":
    print("=" * 60)
    print("Demo Service Database Migration")
    print("Adding channel_name column for AI Assistant integration")
    print("=" * 60)
    print()
    
    asyncio.run(add_channel_name_column())
    
    print()
    print("=" * 60)
    print("Migration complete! You can now restart the demo service.")
    print("=" * 60)
