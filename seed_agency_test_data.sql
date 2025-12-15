-- ============================================================================
-- AGENCY DASHBOARD TEST DATA SEED
-- For: testagency@repruv.com
-- Run this in Supabase SQL Editor
-- ============================================================================

-- First, get the user ID for testagency@repruv.com
-- We'll use a variable approach with CTEs

DO $$
DECLARE
    v_agency_owner_id UUID;
    v_agency_id UUID;
    
    -- Team member user IDs (we'll create these users)
    v_team_member_1_id UUID := gen_random_uuid();
    v_team_member_2_id UUID := gen_random_uuid();
    v_team_member_3_id UUID := gen_random_uuid();
    
    -- Creator user IDs (5 with accounts, 5 invited but not signed up)
    v_creator_1_id UUID := gen_random_uuid();
    v_creator_2_id UUID := gen_random_uuid();
    v_creator_3_id UUID := gen_random_uuid();
    v_creator_4_id UUID := gen_random_uuid();
    v_creator_5_id UUID := gen_random_uuid();
    
    -- Brand IDs
    v_brand_ids UUID[] := ARRAY[
        gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
        gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid()
    ];
    
    -- Campaign IDs
    v_campaign_ids UUID[] := ARRAY[
        gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
        gen_random_uuid(), gen_random_uuid(), gen_random_uuid()
    ];
    
    -- Deal IDs
    v_deal_ids UUID[] := ARRAY[
        gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
        gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
        gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid()
    ];

BEGIN
    -- Get the agency owner's user ID
    SELECT id INTO v_agency_owner_id FROM users WHERE email = 'testagency@repruv.com';
    
    IF v_agency_owner_id IS NULL THEN
        RAISE EXCEPTION 'User testagency@repruv.com not found. Please create this account first.';
    END IF;
    
    -- Get or create the agency
    SELECT id INTO v_agency_id FROM agencies WHERE owner_id = v_agency_owner_id LIMIT 1;
    
    IF v_agency_id IS NULL THEN
        v_agency_id := gen_random_uuid();
        INSERT INTO agencies (id, name, slug, owner_id, description, is_active, settings, created_at, updated_at)
        VALUES (
            v_agency_id,
            'Stellar Talent Management',
            'stellar-talent',
            v_agency_owner_id,
            'Premier talent management agency specializing in digital creators and influencer marketing.',
            true,
            '{"default_currency": "USD", "timezone": "America/New_York"}',
            NOW() - INTERVAL '6 months',
            NOW()
        );
    END IF;

    -- ========================================================================
    -- CREATE TEAM MEMBER USERS
    -- ========================================================================
    
    INSERT INTO users (id, email, full_name, is_active, account_type, created_at, updated_at)
    VALUES 
        (v_team_member_1_id, 'sarah.chen@stellartalent.com', 'Sarah Chen', true, 'agency', NOW() - INTERVAL '5 months', NOW()),
        (v_team_member_2_id, 'marcus.johnson@stellartalent.com', 'Marcus Johnson', true, 'agency', NOW() - INTERVAL '4 months', NOW()),
        (v_team_member_3_id, 'emma.rodriguez@stellartalent.com', 'Emma Rodriguez', true, 'agency', NOW() - INTERVAL '3 months', NOW())
    ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
    RETURNING id INTO v_team_member_1_id;
    
    -- Get actual IDs if they existed
    SELECT id INTO v_team_member_1_id FROM users WHERE email = 'sarah.chen@stellartalent.com';
    SELECT id INTO v_team_member_2_id FROM users WHERE email = 'marcus.johnson@stellartalent.com';
    SELECT id INTO v_team_member_3_id FROM users WHERE email = 'emma.rodriguez@stellartalent.com';

    -- ========================================================================
    -- CREATE AGENCY MEMBERS (Team)
    -- ========================================================================
    
    -- Owner membership
    INSERT INTO agency_members (id, agency_id, user_id, role, status, joined_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_agency_id, v_agency_owner_id, 'owner', 'active', NOW() - INTERVAL '6 months', NOW() - INTERVAL '6 months', NOW())
    ON CONFLICT ON CONSTRAINT uq_agency_members_agency_user DO NOTHING;
    
    -- Team members
    INSERT INTO agency_members (id, agency_id, user_id, role, status, invited_by, invited_at, joined_at, created_at, updated_at)
    VALUES 
        (gen_random_uuid(), v_agency_id, v_team_member_1_id, 'admin', 'active', v_agency_owner_id, NOW() - INTERVAL '5 months', NOW() - INTERVAL '5 months', NOW() - INTERVAL '5 months', NOW()),
        (gen_random_uuid(), v_agency_id, v_team_member_2_id, 'member', 'active', v_agency_owner_id, NOW() - INTERVAL '4 months', NOW() - INTERVAL '4 months', NOW() - INTERVAL '4 months', NOW()),
        (gen_random_uuid(), v_agency_id, v_team_member_3_id, 'member', 'active', v_team_member_1_id, NOW() - INTERVAL '3 months', NOW() - INTERVAL '3 months', NOW() - INTERVAL '3 months', NOW())
    ON CONFLICT ON CONSTRAINT uq_agency_members_agency_user DO NOTHING;

    -- ========================================================================
    -- CREATE CREATOR USERS (5 with accounts)
    -- ========================================================================
    
    INSERT INTO users (id, email, full_name, is_active, account_type, created_at, updated_at)
    VALUES 
        (v_creator_1_id, 'alex.gaming@gmail.com', 'Alex "GameMaster" Thompson', true, 'creator', NOW() - INTERVAL '8 months', NOW()),
        (v_creator_2_id, 'jessica.beauty@outlook.com', 'Jessica Bloom', true, 'creator', NOW() - INTERVAL '7 months', NOW()),
        (v_creator_3_id, 'mike.fitness@gmail.com', 'Mike "IronMike" Patterson', true, 'creator', NOW() - INTERVAL '6 months', NOW()),
        (v_creator_4_id, 'sophia.lifestyle@gmail.com', 'Sophia Martinez', true, 'creator', NOW() - INTERVAL '5 months', NOW()),
        (v_creator_5_id, 'david.tech@outlook.com', 'David Chen', true, 'creator', NOW() - INTERVAL '4 months', NOW())
    ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name;
    
    -- Get actual creator IDs
    SELECT id INTO v_creator_1_id FROM users WHERE email = 'alex.gaming@gmail.com';
    SELECT id INTO v_creator_2_id FROM users WHERE email = 'jessica.beauty@outlook.com';
    SELECT id INTO v_creator_3_id FROM users WHERE email = 'mike.fitness@gmail.com';
    SELECT id INTO v_creator_4_id FROM users WHERE email = 'sophia.lifestyle@gmail.com';
    SELECT id INTO v_creator_5_id FROM users WHERE email = 'david.tech@outlook.com';

    -- ========================================================================
    -- CREATE AGENCY INVITATIONS (5 creators invited but not signed up)
    -- ========================================================================
    
    INSERT INTO agency_invitations (id, agency_id, email, token, invited_by, expires_at, status, created_at, updated_at)
    VALUES 
        (gen_random_uuid(), v_agency_id, 'emma.cooking@gmail.com', 'inv_' || gen_random_uuid()::text, v_agency_owner_id, NOW() + INTERVAL '7 days', 'pending', NOW() - INTERVAL '2 days', NOW()),
        (gen_random_uuid(), v_agency_id, 'ryan.travel@outlook.com', 'inv_' || gen_random_uuid()::text, v_team_member_1_id, NOW() + INTERVAL '7 days', 'pending', NOW() - INTERVAL '1 day', NOW()),
        (gen_random_uuid(), v_agency_id, 'olivia.fashion@gmail.com', 'inv_' || gen_random_uuid()::text, v_agency_owner_id, NOW() + INTERVAL '7 days', 'pending', NOW() - INTERVAL '3 days', NOW()),
        (gen_random_uuid(), v_agency_id, 'james.music@gmail.com', 'inv_' || gen_random_uuid()::text, v_team_member_2_id, NOW() + INTERVAL '7 days', 'pending', NOW() - INTERVAL '5 hours', NOW()),
        (gen_random_uuid(), v_agency_id, 'nina.comedy@outlook.com', 'inv_' || gen_random_uuid()::text, v_agency_owner_id, NOW() + INTERVAL '7 days', 'pending', NOW() - INTERVAL '12 hours', NOW())
    ON CONFLICT DO NOTHING;

    -- ========================================================================
    -- CREATE DEALS (15 deals in various stages)
    -- ========================================================================
    
    INSERT INTO agency_deals (id, agency_id, brand_name, brand_contact_name, brand_contact_email, title, value, currency, stage, status, priority, owner_id, campaign_type, tags, notes, next_action, next_action_date, target_posting_date, expected_close_date, created_at, updated_at)
    VALUES 
        -- Prospecting (3)
        (v_deal_ids[1], v_agency_id, 'Nike', 'Jennifer Adams', 'jadams@nike.com', 'Nike Running Campaign Q1', 45000.00, 'USD', 'prospecting', 'on_track', 'high', v_team_member_1_id, 'Sponsored Content', ARRAY['fitness', 'sports', 'apparel'], 'Initial outreach sent via LinkedIn', 'Follow up on initial email', NOW() + INTERVAL '2 days', NOW() + INTERVAL '45 days', NOW() + INTERVAL '14 days', NOW() - INTERVAL '3 days', NOW()),
        (v_deal_ids[2], v_agency_id, 'Spotify', 'Michael Torres', 'mtorres@spotify.com', 'Spotify Wrapped Creator Collab', 25000.00, 'USD', 'prospecting', 'on_track', 'medium', v_team_member_2_id, 'Integration', ARRAY['music', 'tech', 'lifestyle'], 'Warm intro from previous contact', 'Schedule discovery call', NOW() + INTERVAL '5 days', NOW() + INTERVAL '60 days', NOW() + INTERVAL '21 days', NOW() - INTERVAL '1 day', NOW()),
        (v_deal_ids[3], v_agency_id, 'HelloFresh', 'Amanda White', 'awhite@hellofresh.com', 'HelloFresh Recipe Series', 18000.00, 'USD', 'prospecting', 'action_needed', 'medium', v_agency_owner_id, 'Sponsored Series', ARRAY['food', 'cooking', 'lifestyle'], 'Need to prepare pitch deck', 'Create custom pitch deck', NOW() + INTERVAL '1 day', NOW() + INTERVAL '30 days', NOW() + INTERVAL '10 days', NOW() - INTERVAL '5 days', NOW()),
        
        -- Pitch Sent (3)
        (v_deal_ids[4], v_agency_id, 'Samsung', 'David Kim', 'dkim@samsung.com', 'Galaxy S25 Launch Campaign', 75000.00, 'USD', 'pitch_sent', 'on_track', 'high', v_team_member_1_id, 'Product Launch', ARRAY['tech', 'mobile', 'unboxing'], 'Pitch sent last week, awaiting response', 'Follow up if no response by Friday', NOW() + INTERVAL '3 days', NOW() + INTERVAL '30 days', NOW() + INTERVAL '7 days', NOW() - INTERVAL '7 days', NOW()),
        (v_deal_ids[5], v_agency_id, 'Audible', 'Rachel Green', 'rgreen@audible.com', 'Audible Summer Reading', 22000.00, 'USD', 'pitch_sent', 'on_track', 'medium', v_team_member_3_id, 'Affiliate', ARRAY['books', 'education', 'lifestyle'], 'Sent proposal with 3 creator options', 'Await brand feedback', NOW() + INTERVAL '4 days', NOW() + INTERVAL '45 days', NOW() + INTERVAL '14 days', NOW() - INTERVAL '4 days', NOW()),
        (v_deal_ids[6], v_agency_id, 'Adobe', 'Chris Martinez', 'cmartinez@adobe.com', 'Creative Cloud Tutorial Series', 35000.00, 'USD', 'pitch_sent', 'action_needed', 'high', v_agency_owner_id, 'Educational', ARRAY['tech', 'creative', 'tutorial'], 'Brand requested revised pricing', 'Send revised proposal', NOW(), NOW() + INTERVAL '60 days', NOW() + INTERVAL '5 days', NOW() - INTERVAL '10 days', NOW()),
        
        -- Negotiating (3)
        (v_deal_ids[7], v_agency_id, 'Gymshark', 'Tom Wilson', 'twilson@gymshark.com', 'Gymshark Athletes Program', 55000.00, 'USD', 'negotiating', 'on_track', 'high', v_team_member_1_id, 'Ambassador', ARRAY['fitness', 'apparel', 'sports'], 'Negotiating exclusivity terms', 'Review contract draft', NOW() + INTERVAL '2 days', NOW() + INTERVAL '21 days', NOW() + INTERVAL '5 days', NOW() - INTERVAL '14 days', NOW()),
        (v_deal_ids[8], v_agency_id, 'NordVPN', 'Lisa Anderson', 'landerson@nordvpn.com', 'NordVPN Tech Creator Push', 28000.00, 'USD', 'negotiating', 'on_track', 'medium', v_team_member_2_id, 'Sponsored Content', ARRAY['tech', 'security', 'gaming'], 'Discussing usage rights', 'Send counter-offer', NOW() + INTERVAL '1 day', NOW() + INTERVAL '14 days', NOW() + INTERVAL '3 days', NOW() - INTERVAL '8 days', NOW()),
        (v_deal_ids[9], v_agency_id, 'Skillshare', 'Emily Brown', 'ebrown@skillshare.com', 'Skillshare Creator Spotlight', 15000.00, 'USD', 'negotiating', 'blocked', 'medium', v_team_member_3_id, 'Integration', ARRAY['education', 'creative', 'tutorial'], 'Waiting on legal review from brand', 'Follow up with legal team', NOW() + INTERVAL '3 days', NOW() + INTERVAL '30 days', NOW() + INTERVAL '7 days', NOW() - INTERVAL '12 days', NOW()),
        
        -- Booked (2)
        (v_deal_ids[10], v_agency_id, 'Logitech', 'Steve Rogers', 'srogers@logitech.com', 'Logitech G Pro Launch', 42000.00, 'USD', 'booked', 'on_track', 'high', v_agency_owner_id, 'Product Launch', ARRAY['gaming', 'tech', 'peripherals'], 'Contract signed, campaign starting next week', 'Kick off meeting scheduled', NOW() + INTERVAL '5 days', NOW() + INTERVAL '14 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '21 days', NOW()),
        (v_deal_ids[11], v_agency_id, 'Notion', 'Amy Lee', 'alee@notion.so', 'Notion for Creators', 20000.00, 'USD', 'booked', 'on_track', 'medium', v_team_member_1_id, 'Tutorial', ARRAY['productivity', 'tech', 'tutorial'], 'Ready to start production', 'Brief creators', NOW() + INTERVAL '3 days', NOW() + INTERVAL '21 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '18 days', NOW()),
        
        -- In Progress (2)
        (v_deal_ids[12], v_agency_id, 'Razer', 'Kevin Zhang', 'kzhang@razer.com', 'Razer Streaming Setup', 38000.00, 'USD', 'in_progress', 'on_track', 'high', v_team_member_2_id, 'Sponsored Content', ARRAY['gaming', 'tech', 'streaming'], 'Content in production, 2 videos delivered', 'Review draft #3', NOW() + INTERVAL '2 days', NOW() + INTERVAL '7 days', NOW() - INTERVAL '30 days', NOW() - INTERVAL '45 days', NOW()),
        (v_deal_ids[13], v_agency_id, 'Squarespace', 'Maria Garcia', 'mgarcia@squarespace.com', 'Squarespace Creator Sites', 16000.00, 'USD', 'in_progress', 'action_needed', 'medium', v_team_member_3_id, 'Integration', ARRAY['business', 'creative', 'web'], 'Awaiting brand approval on script', 'Chase brand for approval', NOW(), NOW() + INTERVAL '5 days', NOW() - INTERVAL '25 days', NOW() - INTERVAL '35 days', NOW()),
        
        -- Completed (2)
        (v_deal_ids[14], v_agency_id, 'ExpressVPN', 'John Smith', 'jsmith@expressvpn.com', 'ExpressVPN Gaming Campaign', 32000.00, 'USD', 'completed', 'on_track', 'none', v_agency_owner_id, 'Sponsored Content', ARRAY['tech', 'gaming', 'security'], 'Campaign completed successfully, great results', NULL, NULL, NOW() - INTERVAL '30 days', NOW() - INTERVAL '90 days', NOW() - INTERVAL '60 days', NOW() - INTERVAL '30 days'),
        (v_deal_ids[15], v_agency_id, 'Canva', 'Sarah Johnson', 'sjohnson@canva.com', 'Canva Pro Tutorial Series', 24000.00, 'USD', 'completed', 'on_track', 'none', v_team_member_1_id, 'Educational', ARRAY['creative', 'design', 'tutorial'], 'All deliverables complete, invoice paid', NULL, NULL, NOW() - INTERVAL '45 days', NOW() - INTERVAL '120 days', NOW() - INTERVAL '90 days', NOW() - INTERVAL '45 days')
    ON CONFLICT DO NOTHING;

    -- ========================================================================
    -- CREATE CAMPAIGNS (6 campaigns in various stages)
    -- ========================================================================
    
    INSERT INTO agency_campaigns (id, agency_id, deal_id, brand_name, brand_contact_name, brand_contact_email, title, description, campaign_type, value, currency, status, posting_date, start_date, end_date, owner_id, tags, notes, created_at, updated_at)
    VALUES 
        -- Draft
        (v_campaign_ids[1], v_agency_id, v_deal_ids[10], 'Logitech', 'Steve Rogers', 'srogers@logitech.com', 'Logitech G Pro Launch Campaign', 'Multi-creator campaign for the new G Pro gaming peripherals line. Focus on competitive gaming and streaming setup content.', 'Product Launch', 42000.00, 'USD', 'draft', NOW() + INTERVAL '14 days', NOW() + INTERVAL '7 days', NOW() + INTERVAL '45 days', v_agency_owner_id, ARRAY['gaming', 'tech'], 'Finalizing creator assignments', NOW() - INTERVAL '5 days', NOW()),
        
        -- Scheduled
        (v_campaign_ids[2], v_agency_id, v_deal_ids[11], 'Notion', 'Amy Lee', 'alee@notion.so', 'Notion for Creators Campaign', 'Educational series showing how creators use Notion for content planning, brand deals, and productivity.', 'Tutorial', 20000.00, 'USD', 'scheduled', NOW() + INTERVAL '21 days', NOW() + INTERVAL '14 days', NOW() + INTERVAL '60 days', v_team_member_1_id, ARRAY['productivity', 'tutorial'], 'Briefs sent to all creators', NOW() - INTERVAL '10 days', NOW()),
        
        -- In Progress
        (v_campaign_ids[3], v_agency_id, v_deal_ids[12], 'Razer', 'Kevin Zhang', 'kzhang@razer.com', 'Razer Ultimate Streaming Setup', 'Showcase the complete Razer streaming ecosystem with multiple creators building their dream setups.', 'Sponsored Content', 38000.00, 'USD', 'in_progress', NOW() + INTERVAL '7 days', NOW() - INTERVAL '14 days', NOW() + INTERVAL '30 days', v_team_member_2_id, ARRAY['gaming', 'streaming'], '2 of 4 videos delivered', NOW() - INTERVAL '30 days', NOW()),
        (v_campaign_ids[4], v_agency_id, v_deal_ids[13], 'Squarespace', 'Maria Garcia', 'mgarcia@squarespace.com', 'Squarespace Creator Portfolio Sites', 'Creators build and showcase their portfolio sites using Squarespace, highlighting ease of use.', 'Integration', 16000.00, 'USD', 'in_progress', NOW() + INTERVAL '5 days', NOW() - INTERVAL '21 days', NOW() + INTERVAL '14 days', v_team_member_3_id, ARRAY['business', 'creative'], 'Waiting on brand approval for scripts', NOW() - INTERVAL '25 days', NOW()),
        
        -- Completed
        (v_campaign_ids[5], v_agency_id, v_deal_ids[14], 'ExpressVPN', 'John Smith', 'jsmith@expressvpn.com', 'ExpressVPN Gaming Security', 'Gaming-focused VPN campaign highlighting low latency and security benefits for competitive gamers.', 'Sponsored Content', 32000.00, 'USD', 'completed', NOW() - INTERVAL '30 days', NOW() - INTERVAL '60 days', NOW() - INTERVAL '15 days', v_agency_owner_id, ARRAY['gaming', 'security'], 'Campaign exceeded expectations - 2.5M views total', NOW() - INTERVAL '75 days', NOW() - INTERVAL '30 days'),
        (v_campaign_ids[6], v_agency_id, v_deal_ids[15], 'Canva', 'Sarah Johnson', 'sjohnson@canva.com', 'Canva Pro for Content Creators', 'Tutorial series showing how creators use Canva Pro for thumbnails, social graphics, and brand kits.', 'Educational', 24000.00, 'USD', 'completed', NOW() - INTERVAL '45 days', NOW() - INTERVAL '90 days', NOW() - INTERVAL '30 days', v_team_member_1_id, ARRAY['design', 'tutorial'], 'All deliverables complete, excellent engagement', NOW() - INTERVAL '100 days', NOW() - INTERVAL '45 days')
    ON CONFLICT DO NOTHING;

    -- ========================================================================
    -- CREATE CAMPAIGN CREATORS (Link creators to campaigns)
    -- ========================================================================
    
    INSERT INTO campaign_creators (id, campaign_id, creator_id, rate, currency, platform, deliverable_types, status, notes, created_at, updated_at)
    VALUES 
        -- Logitech Campaign
        (gen_random_uuid(), v_campaign_ids[1], v_creator_1_id, 15000.00, 'USD', 'youtube', ARRAY['video', 'short'], 'assigned', 'Lead creator for gaming content', NOW() - INTERVAL '3 days', NOW()),
        (gen_random_uuid(), v_campaign_ids[1], v_creator_5_id, 12000.00, 'USD', 'youtube', ARRAY['video'], 'assigned', 'Tech review angle', NOW() - INTERVAL '3 days', NOW()),
        
        -- Notion Campaign
        (gen_random_uuid(), v_campaign_ids[2], v_creator_4_id, 8000.00, 'USD', 'youtube', ARRAY['video', 'short'], 'assigned', 'Lifestyle productivity focus', NOW() - INTERVAL '8 days', NOW()),
        (gen_random_uuid(), v_campaign_ids[2], v_creator_5_id, 7000.00, 'USD', 'youtube', ARRAY['video'], 'assigned', 'Tech workflow focus', NOW() - INTERVAL '8 days', NOW()),
        
        -- Razer Campaign
        (gen_random_uuid(), v_campaign_ids[3], v_creator_1_id, 18000.00, 'USD', 'youtube', ARRAY['video', 'short'], 'in_progress', 'Main gaming setup video delivered', NOW() - INTERVAL '28 days', NOW()),
        (gen_random_uuid(), v_campaign_ids[3], v_creator_3_id, 10000.00, 'USD', 'instagram', ARRAY['reel', 'post'], 'in_progress', 'Fitness streaming angle', NOW() - INTERVAL '28 days', NOW()),
        
        -- Squarespace Campaign
        (gen_random_uuid(), v_campaign_ids[4], v_creator_2_id, 8000.00, 'USD', 'youtube', ARRAY['video'], 'in_progress', 'Beauty portfolio site', NOW() - INTERVAL '20 days', NOW()),
        (gen_random_uuid(), v_campaign_ids[4], v_creator_4_id, 8000.00, 'USD', 'instagram', ARRAY['reel', 'story'], 'in_progress', 'Lifestyle brand site', NOW() - INTERVAL '20 days', NOW()),
        
        -- ExpressVPN Campaign (Completed)
        (gen_random_uuid(), v_campaign_ids[5], v_creator_1_id, 16000.00, 'USD', 'youtube', ARRAY['video', 'short'], 'completed', 'Exceeded view targets', NOW() - INTERVAL '70 days', NOW() - INTERVAL '30 days'),
        (gen_random_uuid(), v_campaign_ids[5], v_creator_5_id, 10000.00, 'USD', 'youtube', ARRAY['video'], 'completed', 'Great engagement', NOW() - INTERVAL '70 days', NOW() - INTERVAL '30 days'),
        
        -- Canva Campaign (Completed)
        (gen_random_uuid(), v_campaign_ids[6], v_creator_2_id, 10000.00, 'USD', 'youtube', ARRAY['video', 'short'], 'completed', 'Tutorial performed well', NOW() - INTERVAL '95 days', NOW() - INTERVAL '45 days'),
        (gen_random_uuid(), v_campaign_ids[6], v_creator_4_id, 8000.00, 'USD', 'instagram', ARRAY['reel'], 'completed', 'High save rate', NOW() - INTERVAL '95 days', NOW() - INTERVAL '45 days')
    ON CONFLICT DO NOTHING;

    -- ========================================================================
    -- CREATE CAMPAIGN DELIVERABLES
    -- ========================================================================
    
    INSERT INTO campaign_deliverables (id, campaign_id, type, title, description, owner_type, owner_id, creator_id, status, due_date, completed_at, revision_count, "order", created_at, updated_at)
    VALUES 
        -- Logitech Campaign Deliverables
        (gen_random_uuid(), v_campaign_ids[1], 'brief_sent', 'Send Campaign Brief', 'Detailed brief with brand guidelines and key messaging', 'agency', v_agency_owner_id, NULL, 'completed', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', 0, 1, NOW() - INTERVAL '5 days', NOW()),
        (gen_random_uuid(), v_campaign_ids[1], 'product_shipped', 'Ship Products to Creators', 'G Pro keyboard, mouse, and headset to each creator', 'agency', v_team_member_2_id, NULL, 'in_progress', NOW() + INTERVAL '2 days', NULL, 0, 2, NOW() - INTERVAL '3 days', NOW()),
        (gen_random_uuid(), v_campaign_ids[1], 'script_draft', 'Alex - Script Draft', 'First draft of main video script', 'creator', NULL, v_creator_1_id, 'pending', NOW() + INTERVAL '7 days', NULL, 0, 3, NOW() - INTERVAL '3 days', NOW()),
        (gen_random_uuid(), v_campaign_ids[1], 'script_draft', 'David - Script Draft', 'First draft of tech review script', 'creator', NULL, v_creator_5_id, 'pending', NOW() + INTERVAL '7 days', NULL, 0, 4, NOW() - INTERVAL '3 days', NOW()),
        
        -- Razer Campaign Deliverables (In Progress)
        (gen_random_uuid(), v_campaign_ids[3], 'brief_sent', 'Campaign Brief', 'Brief with Razer brand guidelines', 'agency', v_team_member_2_id, NULL, 'completed', NOW() - INTERVAL '25 days', NOW() - INTERVAL '26 days', 0, 1, NOW() - INTERVAL '28 days', NOW() - INTERVAL '26 days'),
        (gen_random_uuid(), v_campaign_ids[3], 'product_shipped', 'Products Shipped', 'Full streaming setup to creators', 'agency', v_team_member_2_id, NULL, 'completed', NOW() - INTERVAL '20 days', NOW() - INTERVAL '21 days', 0, 2, NOW() - INTERVAL '25 days', NOW() - INTERVAL '21 days'),
        (gen_random_uuid(), v_campaign_ids[3], 'script_approved', 'Alex - Script Approved', 'Gaming setup video script', 'brand', NULL, v_creator_1_id, 'completed', NOW() - INTERVAL '14 days', NOW() - INTERVAL '15 days', 1, 3, NOW() - INTERVAL '20 days', NOW() - INTERVAL '15 days'),
        (gen_random_uuid(), v_campaign_ids[3], 'content_draft', 'Alex - Video Draft', 'First cut of main video', 'creator', NULL, v_creator_1_id, 'approved', NOW() - INTERVAL '7 days', NOW() - INTERVAL '5 days', 0, 4, NOW() - INTERVAL '14 days', NOW() - INTERVAL '5 days'),
        (gen_random_uuid(), v_campaign_ids[3], 'final_content', 'Alex - Final Video', 'Final approved video ready for posting', 'creator', NULL, v_creator_1_id, 'in_progress', NOW() + INTERVAL '3 days', NULL, 0, 5, NOW() - INTERVAL '5 days', NOW()),
        (gen_random_uuid(), v_campaign_ids[3], 'script_draft', 'Mike - Script Draft', 'Fitness streaming script', 'creator', NULL, v_creator_3_id, 'revision_requested', NOW() - INTERVAL '5 days', NULL, 2, 6, NOW() - INTERVAL '18 days', NOW()),
        
        -- Squarespace Campaign Deliverables
        (gen_random_uuid(), v_campaign_ids[4], 'brief_sent', 'Campaign Brief', 'Squarespace creator sites brief', 'agency', v_team_member_3_id, NULL, 'completed', NOW() - INTERVAL '20 days', NOW() - INTERVAL '21 days', 0, 1, NOW() - INTERVAL '23 days', NOW() - INTERVAL '21 days'),
        (gen_random_uuid(), v_campaign_ids[4], 'script_draft', 'Jessica - Script', 'Beauty portfolio walkthrough', 'creator', NULL, v_creator_2_id, 'submitted', NOW() - INTERVAL '10 days', NULL, 0, 2, NOW() - INTERVAL '18 days', NOW() - INTERVAL '8 days'),
        (gen_random_uuid(), v_campaign_ids[4], 'brand_approval', 'Brand Script Approval', 'Awaiting Squarespace approval', 'brand', NULL, NULL, 'pending', NOW() - INTERVAL '3 days', NULL, 0, 3, NOW() - INTERVAL '8 days', NOW()),
        
        -- Completed Campaign Deliverables (ExpressVPN)
        (gen_random_uuid(), v_campaign_ids[5], 'brief_sent', 'Campaign Brief', 'ExpressVPN gaming brief', 'agency', v_agency_owner_id, NULL, 'completed', NOW() - INTERVAL '65 days', NOW() - INTERVAL '66 days', 0, 1, NOW() - INTERVAL '70 days', NOW() - INTERVAL '66 days'),
        (gen_random_uuid(), v_campaign_ids[5], 'content_posted', 'Alex - Video Posted', 'Main gaming VPN video', 'creator', NULL, v_creator_1_id, 'completed', NOW() - INTERVAL '35 days', NOW() - INTERVAL '35 days', 0, 2, NOW() - INTERVAL '50 days', NOW() - INTERVAL '35 days'),
        (gen_random_uuid(), v_campaign_ids[5], 'performance_report', 'Campaign Report', 'Final performance metrics', 'agency', v_agency_owner_id, NULL, 'completed', NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days', 0, 3, NOW() - INTERVAL '30 days', NOW() - INTERVAL '25 days')
    ON CONFLICT DO NOTHING;

    -- ========================================================================
    -- CREATE TASKS (20 tasks)
    -- ========================================================================
    
    INSERT INTO agency_tasks (id, agency_id, title, description, priority, status, assignee_id, created_by, due_date, completed_at, related_type, related_id, is_auto_generated, source, notes, created_at, updated_at)
    VALUES 
        -- Urgent/High Priority
        (gen_random_uuid(), v_agency_id, 'Review Razer final video cut', 'Alex submitted final cut - needs review before brand submission', 'urgent', 'todo', v_team_member_2_id, v_agency_owner_id, NOW() + INTERVAL '1 day', NULL, 'campaign', v_campaign_ids[3], false, NULL, 'Brand deadline is tight', NOW() - INTERVAL '1 day', NOW()),
        (gen_random_uuid(), v_agency_id, 'Chase Squarespace for script approval', 'Script submitted 5 days ago, no response', 'high', 'in_progress', v_team_member_3_id, v_team_member_1_id, NOW(), NULL, 'campaign', v_campaign_ids[4], false, NULL, 'Blocking content production', NOW() - INTERVAL '2 days', NOW()),
        (gen_random_uuid(), v_agency_id, 'Send revised Adobe proposal', 'Brand requested pricing adjustment', 'high', 'todo', v_agency_owner_id, v_agency_owner_id, NOW() + INTERVAL '1 day', NULL, 'deal', v_deal_ids[6], false, NULL, 'Reduce by 15% as discussed', NOW() - INTERVAL '1 day', NOW()),
        (gen_random_uuid(), v_agency_id, 'Ship Logitech products to creators', 'Products arrived at office, need to ship out', 'high', 'in_progress', v_team_member_2_id, v_agency_owner_id, NOW() + INTERVAL '2 days', NULL, 'campaign', v_campaign_ids[1], false, NULL, 'Use overnight shipping', NOW() - INTERVAL '3 days', NOW()),
        
        -- Normal Priority
        (gen_random_uuid(), v_agency_id, 'Schedule Notion campaign kickoff', 'Set up call with all creators and brand', 'normal', 'todo', v_team_member_1_id, v_agency_owner_id, NOW() + INTERVAL '5 days', NULL, 'campaign', v_campaign_ids[2], false, NULL, NULL, NOW() - INTERVAL '2 days', NOW()),
        (gen_random_uuid(), v_agency_id, 'Follow up with Nike contact', 'Check on initial outreach response', 'normal', 'todo', v_team_member_1_id, v_team_member_1_id, NOW() + INTERVAL '2 days', NULL, 'deal', v_deal_ids[1], false, NULL, 'LinkedIn message sent last week', NOW() - INTERVAL '3 days', NOW()),
        (gen_random_uuid(), v_agency_id, 'Prepare Samsung pitch deck', 'Customize deck for Galaxy S25 campaign', 'normal', 'in_progress', v_team_member_1_id, v_agency_owner_id, NOW() + INTERVAL '3 days', NULL, 'deal', v_deal_ids[4], false, NULL, 'Include case studies', NOW() - INTERVAL '5 days', NOW()),
        (gen_random_uuid(), v_agency_id, 'Review Gymshark contract', 'Legal review of exclusivity terms', 'normal', 'todo', v_agency_owner_id, v_team_member_1_id, NOW() + INTERVAL '2 days', NULL, 'deal', v_deal_ids[7], false, NULL, 'Focus on usage rights section', NOW() - INTERVAL '1 day', NOW()),
        (gen_random_uuid(), v_agency_id, 'Send NordVPN counter-offer', 'Prepare revised rate proposal', 'normal', 'todo', v_team_member_2_id, v_team_member_2_id, NOW() + INTERVAL '1 day', NULL, 'deal', v_deal_ids[8], false, NULL, 'Increase by 10%', NOW() - INTERVAL '2 days', NOW()),
        (gen_random_uuid(), v_agency_id, 'Brief creators on Notion campaign', 'Send detailed briefs to Sophia and David', 'normal', 'todo', v_team_member_1_id, v_team_member_1_id, NOW() + INTERVAL '3 days', NULL, 'campaign', v_campaign_ids[2], false, NULL, NULL, NOW() - INTERVAL '1 day', NOW()),
        (gen_random_uuid(), v_agency_id, 'Update creator rate cards', 'Quarterly rate review for all creators', 'normal', 'todo', v_team_member_3_id, v_agency_owner_id, NOW() + INTERVAL '7 days', NULL, NULL, NULL, false, NULL, 'Check industry benchmarks', NOW() - INTERVAL '5 days', NOW()),
        (gen_random_uuid(), v_agency_id, 'Schedule Spotify discovery call', 'Set up intro call with Michael Torres', 'normal', 'todo', v_team_member_2_id, v_team_member_2_id, NOW() + INTERVAL '5 days', NULL, 'deal', v_deal_ids[2], false, NULL, NULL, NOW() - INTERVAL '1 day', NOW()),
        
        -- Low Priority
        (gen_random_uuid(), v_agency_id, 'Update agency website portfolio', 'Add recent campaign case studies', 'low', 'todo', v_team_member_3_id, v_agency_owner_id, NOW() + INTERVAL '14 days', NULL, NULL, NULL, false, NULL, 'Include ExpressVPN and Canva', NOW() - INTERVAL '7 days', NOW()),
        (gen_random_uuid(), v_agency_id, 'Research HelloFresh competitors', 'Competitive analysis for pitch', 'low', 'todo', v_team_member_3_id, v_agency_owner_id, NOW() + INTERVAL '7 days', NULL, 'deal', v_deal_ids[3], false, NULL, NULL, NOW() - INTERVAL '3 days', NOW()),
        (gen_random_uuid(), v_agency_id, 'Organize Q4 campaign assets', 'Archive completed campaign files', 'low', 'todo', v_team_member_2_id, v_team_member_1_id, NOW() + INTERVAL '21 days', NULL, NULL, NULL, false, NULL, NULL, NOW() - INTERVAL '10 days', NOW()),
        
        -- Completed Tasks
        (gen_random_uuid(), v_agency_id, 'Send Logitech campaign brief', 'Detailed brief with all requirements', 'high', 'completed', v_agency_owner_id, v_agency_owner_id, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', 'campaign', v_campaign_ids[1], false, NULL, 'Sent to both creators', NOW() - INTERVAL '5 days', NOW() - INTERVAL '2 days'),
        (gen_random_uuid(), v_agency_id, 'Finalize Razer creator contracts', 'Get signatures from Alex and Mike', 'high', 'completed', v_team_member_2_id, v_agency_owner_id, NOW() - INTERVAL '20 days', NOW() - INTERVAL '21 days', 'campaign', v_campaign_ids[3], false, NULL, 'All signed', NOW() - INTERVAL '28 days', NOW() - INTERVAL '21 days'),
        (gen_random_uuid(), v_agency_id, 'Submit ExpressVPN final report', 'Campaign performance summary', 'normal', 'completed', v_agency_owner_id, v_agency_owner_id, NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days', 'campaign', v_campaign_ids[5], false, NULL, 'Brand very happy with results', NOW() - INTERVAL '30 days', NOW() - INTERVAL '25 days'),
        (gen_random_uuid(), v_agency_id, 'Onboard Emma as team member', 'Set up accounts and permissions', 'normal', 'completed', v_team_member_1_id, v_agency_owner_id, NOW() - INTERVAL '3 months', NOW() - INTERVAL '3 months', NULL, NULL, false, NULL, NULL, NOW() - INTERVAL '3 months', NOW() - INTERVAL '3 months'),
        (gen_random_uuid(), v_agency_id, 'Review Canva campaign metrics', 'Compile final performance data', 'normal', 'completed', v_team_member_1_id, v_team_member_1_id, NOW() - INTERVAL '40 days', NOW() - INTERVAL '42 days', 'campaign', v_campaign_ids[6], false, NULL, 'Exceeded all KPIs', NOW() - INTERVAL '50 days', NOW() - INTERVAL '42 days')
    ON CONFLICT DO NOTHING;

    -- ========================================================================
    -- CREATE RECENT ACTIVITIES
    -- ========================================================================
    
    INSERT INTO agency_activities (id, agency_id, actor_id, actor_name, actor_type, action, entity_type, entity_id, entity_name, description, created_at, updated_at)
    VALUES 
        (gen_random_uuid(), v_agency_id, v_creator_1_id, 'Alex Thompson', 'user', 'submitted', 'deliverable', NULL, 'Final Video Cut', 'Alex submitted final video for Razer campaign', NOW() - INTERVAL '2 hours', NOW()),
        (gen_random_uuid(), v_agency_id, v_team_member_2_id, 'Marcus Johnson', 'user', 'approved', 'deliverable', NULL, 'Video Draft', 'Approved Alex''s video draft for Razer', NOW() - INTERVAL '5 hours', NOW()),
        (gen_random_uuid(), v_agency_id, v_team_member_1_id, 'Sarah Chen', 'user', 'moved', 'deal', v_deal_ids[7], 'Gymshark Athletes Program', 'Moved deal to Negotiating stage', NOW() - INTERVAL '1 day', NOW()),
        (gen_random_uuid(), v_agency_id, v_agency_owner_id, 'Test Agency', 'user', 'created', 'campaign', v_campaign_ids[1], 'Logitech G Pro Launch', 'Created new campaign from booked deal', NOW() - INTERVAL '2 days', NOW()),
        (gen_random_uuid(), v_agency_id, v_team_member_3_id, 'Emma Rodriguez', 'user', 'sent', 'deliverable', NULL, 'Campaign Brief', 'Sent brief to Squarespace creators', NOW() - INTERVAL '3 days', NOW()),
        (gen_random_uuid(), v_agency_id, v_team_member_1_id, 'Sarah Chen', 'user', 'created', 'deal', v_deal_ids[1], 'Nike Running Campaign', 'Added new prospecting deal', NOW() - INTERVAL '3 days', NOW()),
        (gen_random_uuid(), v_agency_id, v_team_member_2_id, 'Marcus Johnson', 'user', 'updated', 'task', NULL, 'Ship Logitech products', 'Started working on product shipment', NOW() - INTERVAL '4 days', NOW()),
        (gen_random_uuid(), v_agency_id, v_agency_owner_id, 'Test Agency', 'user', 'signed', 'deal', v_deal_ids[10], 'Logitech G Pro Launch', 'Deal signed and moved to Booked', NOW() - INTERVAL '5 days', NOW())
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Successfully seeded agency test data for testagency@repruv.com';
    RAISE NOTICE 'Agency ID: %', v_agency_id;
    RAISE NOTICE 'Created: 3 team members, 5 creators with accounts, 5 pending invitations';
    RAISE NOTICE 'Created: 15 deals, 6 campaigns, 20 tasks';

END $$;

-- ============================================================================
-- VERIFICATION QUERIES (Run these to verify the data)
-- ============================================================================

-- Check agency
-- SELECT * FROM agencies WHERE slug = 'stellar-talent';

-- Check team members
-- SELECT am.role, am.status, u.email, u.full_name 
-- FROM agency_members am 
-- JOIN users u ON am.user_id = u.id 
-- WHERE am.agency_id = (SELECT id FROM agencies WHERE slug = 'stellar-talent');

-- Check deals by stage
-- SELECT stage, COUNT(*), SUM(value) as total_value 
-- FROM agency_deals 
-- WHERE agency_id = (SELECT id FROM agencies WHERE slug = 'stellar-talent')
-- GROUP BY stage ORDER BY stage;

-- Check campaigns
-- SELECT status, COUNT(*) 
-- FROM agency_campaigns 
-- WHERE agency_id = (SELECT id FROM agencies WHERE slug = 'stellar-talent')
-- GROUP BY status;

-- Check tasks
-- SELECT status, priority, COUNT(*) 
-- FROM agency_tasks 
-- WHERE agency_id = (SELECT id FROM agencies WHERE slug = 'stellar-talent')
-- GROUP BY status, priority ORDER BY status, priority;
