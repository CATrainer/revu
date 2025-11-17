-- Fix missing updated_at columns in monetization tables
-- This addresses the schema mismatch causing:
-- "column generated_opportunities.updated_at does not exist"

-- Add updated_at to generated_opportunities
ALTER TABLE generated_opportunities
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL;

-- Add updated_at to plan_modifications
ALTER TABLE plan_modifications
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'generated_opportunities'
  AND column_name = 'updated_at';

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'plan_modifications'
  AND column_name = 'updated_at';
