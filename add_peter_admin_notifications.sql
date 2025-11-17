-- Add admin notification settings for peter.collier@repruv.co.uk
-- Run this in your Supabase SQL editor or psql

INSERT INTO admin_notification_settings (
    id,
    email,
    notification_types,
    is_active,
    added_at
) VALUES (
    gen_random_uuid(),
    'peter.collier@repruv.co.uk',
    '{"creator_applications": true, "agency_applications": true}'::jsonb,
    true,
    NOW()
)
ON CONFLICT (email) DO UPDATE SET
    notification_types = EXCLUDED.notification_types,
    is_active = true;
