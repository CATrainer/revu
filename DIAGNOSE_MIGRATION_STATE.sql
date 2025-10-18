-- Run this in Supabase SQL Editor to diagnose migration state

-- 1. Check which migrations have run
SELECT version_num, 
       CASE 
         WHEN version_num = '20251010_insights' THEN 'Creates content_performance (no timestamps)'
         WHEN version_num = '20251010_timestamps' THEN 'Adds created_at/updated_at to content_performance'
         WHEN version_num = '20250118_0001' THEN 'Adds is_demo flags'
         ELSE 'Other migration'
       END as description
FROM alembic_version
WHERE version_num IN ('20251010_insights', '20251010_timestamps', '20250118_0001')
ORDER BY version_num;

-- 2. Check actual table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'content_performance'
ORDER BY ordinal_position;

-- 3. Expected vs Actual columns
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_performance' AND column_name = 'created_at') 
    THEN '✅ created_at exists' 
    ELSE '❌ created_at MISSING' 
  END as created_at_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_performance' AND column_name = 'updated_at') 
    THEN '✅ updated_at exists' 
    ELSE '❌ updated_at MISSING' 
  END as updated_at_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_performance' AND column_name = 'is_demo') 
    THEN '✅ is_demo exists' 
    ELSE '❌ is_demo MISSING' 
  END as is_demo_status;
