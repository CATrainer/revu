-- Migration: Add url column to demo_content table
-- This column was added to the model but not to the database

-- Add the url column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'demo_content' AND column_name = 'url'
    ) THEN
        ALTER TABLE demo_content ADD COLUMN url TEXT;
    END IF;
END $$;
