-- ============================================
-- Create Test Agency Account in Supabase
-- ============================================
-- This script creates:
-- 1. A test user account (agency owner)
-- 2. A test agency
-- 3. Links the user as the agency owner
--
-- Login Credentials:
-- Email: testagency@repruv.com
-- Password: TestAgency123!
-- ============================================

-- Step 1: Create the agency owner user
INSERT INTO users (
    id,
    email,
    full_name,
    hashed_password,
    is_active,
    is_admin,
    has_account,
    access_status,
    user_kind,
    account_type,
    approval_status,
    application_submitted_at,
    approved_at,
    demo_requested,
    demo_completed,
    marketing_opt_in,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'testagency@repruv.com',
    'Test Agency Owner',
    '$2b$12$p4Q80FpxXiWSaJ4l92mMNOYf/T/q4AT2Xf8.tuijJzznJO2KBJTnG', -- Password: TestAgency123!
    true,                    -- is_active
    false,                   -- is_admin
    true,                    -- has_account
    'full',                  -- access_status
    'content',               -- user_kind
    'agency',                -- account_type
    'approved',              -- approval_status
    NOW(),                   -- application_submitted_at
    NOW(),                   -- approved_at
    false,                   -- demo_requested
    false,                   -- demo_completed
    true,                    -- marketing_opt_in
    NOW(),                   -- created_at
    NOW()                    -- updated_at
)
ON CONFLICT (email) DO UPDATE SET
    hashed_password = EXCLUDED.hashed_password,
    updated_at = NOW()
RETURNING id;

-- Step 2: Create the agency
WITH user_data AS (
    SELECT id FROM users WHERE email = 'testagency@repruv.com'
)
INSERT INTO agencies (
    id,
    name,
    slug,
    owner_id,
    website,
    description,
    settings,
    is_active,
    created_at,
    updated_at
)
SELECT
    gen_random_uuid(),
    'Test Agency',
    'test-agency',
    user_data.id,
    'https://testagency.com',
    'This is a test agency account for development and testing purposes.',
    '{}',
    true,
    NOW(),
    NOW()
FROM user_data
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    website = EXCLUDED.website,
    description = EXCLUDED.description,
    updated_at = NOW()
RETURNING id;

-- Step 3: Create agency membership (link user as owner)
WITH user_data AS (
    SELECT id FROM users WHERE email = 'testagency@repruv.com'
),
agency_data AS (
    SELECT id FROM agencies WHERE slug = 'test-agency'
)
INSERT INTO agency_members (
    id,
    agency_id,
    user_id,
    role,
    status,
    joined_at,
    created_at,
    updated_at
)
SELECT
    gen_random_uuid(),
    agency_data.id,
    user_data.id,
    'owner',
    'active',
    NOW(),
    NOW(),
    NOW()
FROM user_data, agency_data
ON CONFLICT ON CONSTRAINT uq_agency_members_agency_user DO NOTHING;

-- ============================================
-- Verification Queries
-- ============================================

-- Verify the user was created
SELECT 
    id,
    email,
    full_name,
    account_type,
    approval_status,
    is_active,
    hashed_password IS NOT NULL as has_password
FROM users 
WHERE email = 'testagency@repruv.com';

-- Verify the agency was created
SELECT 
    a.id,
    a.name,
    a.slug,
    a.owner_id,
    u.email as owner_email,
    a.is_active
FROM agencies a
JOIN users u ON a.owner_id = u.id
WHERE a.slug = 'test-agency';

-- Verify the agency membership
SELECT 
    am.id,
    am.role,
    am.status,
    u.email as member_email,
    a.name as agency_name
FROM agency_members am
JOIN users u ON am.user_id = u.id
JOIN agencies a ON am.agency_id = a.id
WHERE u.email = 'testagency@repruv.com';

-- ============================================
-- Notes
-- ============================================
-- 1. Run this script in Supabase SQL Editor
-- 2. The password hash is generated using bcrypt
-- 3. If you need to regenerate the hash, run:
--    python scripts/generate_password_hash.py
-- 4. The script uses ON CONFLICT to allow re-running safely
