-- Migration: Add channel_name column to demo_profiles table
-- Date: 2025-01-29
-- Purpose: Support AI Assistant integration with channel metadata

-- Add channel_name column
ALTER TABLE demo_profiles 
ADD COLUMN IF NOT EXISTS channel_name VARCHAR(100);

-- Add helpful comment
COMMENT ON COLUMN demo_profiles.channel_name IS 'Creator channel name for AI Assistant context';

-- Optional: Backfill existing profiles with generated names
-- UPDATE demo_profiles SET channel_name = 'TechReview Pro' WHERE niche = 'tech_reviews' AND channel_name IS NULL;
-- UPDATE demo_profiles SET channel_name = 'ProGamerHQ' WHERE niche = 'gaming' AND channel_name IS NULL;
-- UPDATE demo_profiles SET channel_name = 'GlamourGuide' WHERE niche = 'beauty' AND channel_name IS NULL;
-- UPDATE demo_profiles SET channel_name = 'FitLife Coach' WHERE niche = 'fitness' AND channel_name IS NULL;
-- UPDATE demo_profiles SET channel_name = 'Chef''s Table' WHERE niche = 'cooking' AND channel_name IS NULL;
-- UPDATE demo_profiles SET channel_name = 'Demo Creator' WHERE channel_name IS NULL;
