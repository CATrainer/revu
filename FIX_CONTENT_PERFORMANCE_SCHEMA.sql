-- Fix content_performance schema mismatch
-- Run this in Supabase SQL Editor AFTER diagnosing the issue

-- Add missing timestamp columns to content_performance
ALTER TABLE content_performance 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW();

ALTER TABLE content_performance 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();

-- Add missing timestamp columns to content_insights (in case they're also missing)
ALTER TABLE content_insights 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW();

ALTER TABLE content_insights 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();

-- Verify the fix
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name IN ('content_performance', 'content_insights')
  AND column_name IN ('created_at', 'updated_at')
ORDER BY table_name, column_name;

-- Mark the migration as complete (if it's not already)
INSERT INTO alembic_version (version_num) 
VALUES ('20251010_timestamps')
ON CONFLICT (version_num) DO NOTHING;

-- Verify alembic_version
SELECT * FROM alembic_version 
WHERE version_num IN ('20251010_insights', '20251010_timestamps', '20250118_0001')
ORDER BY version_num;
