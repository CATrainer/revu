# Supabase Database Schema - Comprehensive Analysis

## Overview
- **Database Type**: PostgreSQL with Supabase
- **ORM**: SQLAlchemy with Alembic migrations
- **Total Tables**: 60+ tables across multiple domains
- **Encryption**: OAuth tokens and platform credentials are encrypted using Fernet (cryptography library)
- **Multi-tenant Architecture**: Organizations and users with hierarchical relationships

---

## Core User & Authentication Tables

### 1. **users**
Stores user account information and access control
- `id` (UUID) - Primary key
- `email` (String) - Unique email
- `full_name` (String) - User's name
- `phone` (String) - Contact phone
- `company_name` (String) - Organization/company name
- `industry` (String) - Business type
- `auth_id` (String) - Supabase Auth ID (unique)
- `hashed_password` (String) - Local auth fallback
- `last_login_at` (DateTime) - Last login timestamp
- `is_active` (Boolean) - Account active status
- `is_admin` (Boolean) - Admin user flag
- **Access Control Fields** (legacy):
  - `access_status` (String) - 'pending', 'full'
  - `user_kind` (String) - 'content' or 'business'
- **New Approval Workflow**:
  - `account_type` (Enum) - 'creator', 'agency', 'legacy'
  - `approval_status` (Enum) - 'pending', 'approved', 'rejected'
  - `application_submitted_at` (DateTime)
  - `approved_at` (DateTime)
  - `approved_by` (UUID FK) - Admin who approved
  - `rejected_at` (DateTime)
  - `rejected_by` (UUID FK)
  - `rejection_reason` (Text)
- **Waitlist & Early Access**:
  - `joined_waiting_list_at` (DateTime)
  - `early_access_granted_at` (DateTime)
- **Demo Management**:
  - `demo_requested` (Boolean)
  - `demo_requested_at` (DateTime)
  - `demo_scheduled_at` (DateTime)
  - `demo_completed` (Boolean)
  - `demo_completed_at` (DateTime)
  - `demo_mode` (Boolean) - DEPRECATED
  - `demo_mode_status` (String) - Current demo state
  - `demo_mode_enabled_at` (DateTime)
  - `demo_mode_disabled_at` (DateTime)
  - `demo_profile_id` (String) - Demo service reference
  - `demo_prep_notes` (Text)
  - `company_size` (String)
  - `current_solution` (String)
  - `follow_up_reminders` (Text)
  - `user_qualification_notes` (Text)
- **Marketing & Communications**:
  - `marketing_opt_in` (Boolean)
  - `marketing_opt_in_at` (DateTime)
  - `marketing_unsubscribed_at` (DateTime)
  - `marketing_bounced_at` (DateTime)
  - `marketing_last_event` (String)
  - `marketing_last_event_at` (DateTime)
- **Waitlist Campaign Tracking**:
  - `countdown_t14_sent_at` (DateTime)
  - `countdown_t7_sent_at` (DateTime)
  - `countdown_t1_sent_at` (DateTime)
  - `launch_sent_at` (DateTime)
- **Trial & Subscription**:
  - `trial_start_date` (DateTime)
  - `trial_end_date` (DateTime)
  - `trial_notified_7d` (Boolean)
  - `trial_notified_3d` (Boolean)
  - `trial_notified_1d` (Boolean)
  - `subscription_status` (String) - 'trial', 'active', 'cancelled', 'expired'
- `organization_id` (UUID FK) - Organization relationship
- `created_at` (DateTime)
- `updated_at` (DateTime)

### 2. **organizations**
Multi-tenant organization management
- `id` (UUID)
- `name` (String) - Organization name
- `slug` (String) - URL-friendly unique slug
- `description` (Text)
- `type` (String) - 'business', 'agency'
- `settings` (JSONB) - Flexible configuration
- `is_active` (Boolean)
- `subscription_tier` (String) - 'trial', 'pro', etc.
- `subscription_status` (String) - 'active', 'cancelled'
- `trial_ends_at` (DateTime)
- `billing_email` (String)
- `stripe_customer_id` (String) - Stripe integration
- `stripe_subscription_id` (String)
- `created_at`, `updated_at` (DateTime)

### 3. **locations**
Location/branch management within organizations
- `id` (UUID)
- `organization_id` (UUID FK)
- `name` (String) - Location name
- `address` (Text)
- `google_place_id` (String)
- `timezone` (String) - Default timezone
- `settings` (JSONB)
- `is_active` (Boolean)
- `brand_voice_data` (JSONB) - Brand guidelines
- `business_info` (JSONB) - Business details
- `created_at`, `updated_at` (DateTime)

### 4. **user_memberships**
User roles and permissions within organizations/locations
- `id` (UUID)
- `user_id` (UUID FK)
- `organization_id` (UUID FK)
- `role` (String) - 'owner', 'admin', 'manager', 'member'
- `location_id` (UUID FK) - NULL for org-wide roles
- `permissions` (JSONB) - Custom permissions
- `created_at`, `updated_at` (DateTime)
- Unique constraint: user_id + organization_id + location_id

---

## Platform Connection & OAuth Tables

### 5. **platform_connections**
OAuth connections to social media platforms
- `id` (UUID)
- `location_id` (UUID FK)
- `platform` (String) - 'google', 'facebook', 'tripadvisor', 'twitter', 'youtube', 'instagram', 'tiktok'
- `connection_status` (String) - 'connected', 'disconnected', 'error'
- `connection_error` (Text) - Error message if failed
- `oauth_state` (String) - OAuth state for CSRF protection
- **OAuth Tokens** (ENCRYPTED using Fernet):
  - `access_token` (Text) - **ENCRYPTED**
  - `refresh_token` (Text) - **ENCRYPTED**
  - `token_expires_at` (DateTime)
  - `last_token_refresh_at` (DateTime)
  - `next_token_refresh_at` (DateTime)
- `account_info` (JSONB) - Platform account details
- `is_active` (Boolean)
- `last_sync_at` (DateTime)
- `created_at`, `updated_at` (DateTime)

### 6. **oauth_state_tokens**
OAuth state tokens for flow protection
- `id` (UUID)
- `token` (String) - State token (unique)
- `user_id` (UUID FK)
- `created_at` (DateTime)
- `expires_at` (DateTime)
- `used` (Boolean) - Has token been used?

---

## YouTube Integration Tables

### 7. **youtube_connections**
YouTube channel connections
- `id` (UUID)
- `user_id` (UUID FK)
- `channel_id` (String)
- `channel_name` (String)
- **OAuth Tokens** (ENCRYPTED):
  - `access_token` (Text)
  - `refresh_token` (Text)
  - `token_expires_at` (DateTime)
- `connection_status` (String) - 'active', 'disconnected'
- **Channel Metrics**:
  - `subscriber_count` (Integer)
  - `total_views` (BigInteger)
  - `video_count` (Integer)
  - `average_views_per_video` (Integer)
  - `engagement_rate` (Numeric)
  - `subscriber_growth_30d` (Integer)
  - `views_growth_30d` (Integer)
  - `last_metrics_update` (DateTime)
- `last_synced_at` (DateTime)
- `created_at`, `updated_at` (DateTime)

### 8. **youtube_videos**
YouTube video metadata and analytics
- `id` (UUID)
- `channel_id` (UUID FK)
- `video_id` (String) - YouTube video ID (unique)
- `title` (Text)
- `description` (Text)
- `thumbnail_url` (Text)
- `published_at` (DateTime)
- **Engagement Metrics**:
  - `view_count` (BigInteger)
  - `like_count` (BigInteger)
  - `comment_count` (BigInteger)
  - `shares_count` (Integer)
- `duration` (String) - ISO 8601 format
- `tags` (Array of String) - 'youtube', 'shorts'|'long form'
- **YouTube Metadata**:
  - `category_id` (String)
  - `video_tags` (Array) - User-added tags
  - `default_audio_language` (String)
  - `default_language` (String)
- **Analytics Data** (YouTube Analytics API):
  - `impressions` (Integer)
  - `click_through_rate` (Numeric)
  - `average_view_duration_seconds` (Integer)
  - `average_view_percentage` (Numeric)
  - `watch_time_minutes` (Integer)
  - `subscribers_gained` (Integer)
  - `subscribers_lost` (Integer)
- **Audience Data**:
  - `traffic_sources` (JSONB) - {source: views}
  - `device_types` (JSONB) - {device: views}
  - `audience_demographics` (JSONB) - {age_gender: percentage}
- **Performance**:
  - `engagement_rate` (Numeric)
  - `performance_score` (Numeric) - 0-100
  - `percentile_rank` (Integer) - 0-100
  - `is_trending` (Boolean)
- `last_fetched_at` (DateTime)
- `created_at`, `updated_at` (DateTime)

### 9. **youtube_comments**
YouTube video comments with AI enrichment
- `id` (UUID)
- `video_id` (UUID FK)
- `comment_id` (String) - YouTube comment ID (unique)
- `author_name` (String)
- `author_channel_id` (String)
- `content` (Text) - Comment text
- `published_at` (DateTime)
- `like_count` (Integer)
- `reply_count` (Integer)
- `parent_comment_id` (String) - For threaded replies
- `is_channel_owner_comment` (Boolean)
- **Owner Engagement**:
  - `hearted_by_owner` (Boolean)
  - `liked_by_owner` (Boolean)
  - `replied_at` (DateTime)
  - `response_text` (Text) - Owner response
- **AI Enrichment**:
  - `sentiment` (String) - 'positive', 'negative', 'neutral'
  - `priority_score` (Integer) - 1-100
  - `categories` (Array) - 'question', 'collab', 'spam'
  - `detected_keywords` (Array)
  - `language` (String)
- **Management**:
  - `status` (String) - 'unread', 'read', 'answered', 'ignored'
  - `tags` (Array)
  - `assigned_to_user_id` (UUID FK)
  - `internal_notes` (Text)
- **Workflow Integration**:
  - `workflow_id` (UUID FK)
  - `workflow_action` (String)
- `created_at`, `updated_at` (DateTime)

### 10. **sync_logs**
YouTube data sync history
- `id` (UUID)
- `channel_id` (UUID FK)
- `sync_type` (String)
- `started_at` (DateTime)
- `completed_at` (DateTime)
- `status` (String) - 'pending', 'success', 'failed'
- `videos_synced` (Integer)
- `comments_synced` (Integer)
- `error_message` (Text)
- `created_at`, `updated_at` (DateTime)

---

## Instagram Integration Tables

### 11. **instagram_connections**
Instagram business account connections
- `id` (UUID)
- `user_id` (UUID FK)
- `instagram_user_id` (String) - Unique Instagram ID
- `username` (String)
- `account_type` (String) - 'PERSONAL', 'BUSINESS', 'CREATOR'
- `profile_picture_url` (Text)
- `bio` (Text)
- `follower_count` (Integer)
- `following_count` (Integer)
- `media_count` (Integer)
- **OAuth Token** (ENCRYPTED):
  - `access_token` (Text)
  - `token_expires_at` (DateTime)
- `connection_status` (String)
- `last_synced_at` (DateTime)
- `created_at`, `updated_at` (DateTime)

### 12. **instagram_media**
Instagram posts, reels, and stories
- `id` (UUID)
- `connection_id` (UUID FK)
- `media_id` (String) - Unique Instagram media ID
- `media_type` (String) - 'IMAGE', 'VIDEO', 'CAROUSEL_ALBUM', 'REEL'
- `caption` (Text)
- `media_url` (Text)
- `thumbnail_url` (Text)
- `permalink` (Text) - Instagram URL
- `timestamp` (DateTime)
- **Engagement Metrics**:
  - `like_count` (Integer)
  - `comment_count` (Integer)
  - `save_count` (Integer)
  - `share_count` (Integer)
  - `play_count` (Integer) - For videos/reels
  - `engagement_rate` (Numeric)
- **Business Metrics**:
  - `reach` (Integer) - Business accounts only
  - `impressions` (Integer)
- `hashtags` (Array) - List of hashtags used
- `is_story` (Boolean) - Is it a story?
- `story_expires_at` (DateTime)
- `last_fetched_at` (DateTime)
- `created_at`, `updated_at` (DateTime)

### 13. **instagram_comments**
Instagram comments with AI enrichment
- `id` (UUID)
- `media_id` (UUID FK)
- `comment_id` (String) - Unique Instagram comment ID
- `username` (String)
- `user_id` (String) - Commenter's Instagram ID
- `text` (Text)
- `timestamp` (DateTime)
- `like_count` (Integer)
- `parent_comment_id` (String) - For threaded replies
- `is_hidden` (Boolean)
- **AI Enrichment**:
  - `sentiment` (String)
  - `priority_score` (Integer)
  - `categories` (Array)
  - `detected_keywords` (Array)
  - `language` (String)
- **Management**:
  - `status` (String) - 'unread', 'read', 'answered', 'ignored'
  - `tags` (Array)
  - `assigned_to_user_id` (UUID FK)
  - `internal_notes` (Text)
- **Workflow**:
  - `workflow_id` (UUID FK)
  - `workflow_action` (String)
  - `replied_at` (DateTime)
  - `response_text` (Text)
- `created_at`, `updated_at` (DateTime)

### 14. **instagram_insights**
Instagram daily insights and demographics
- `id` (UUID)
- `connection_id` (UUID FK)
- `date` (Date)
- **Engagement Metrics**:
  - `profile_views` (Integer)
  - `reach` (Integer)
  - `impressions` (Integer)
  - `website_clicks` (Integer)
  - `email_contacts` (Integer)
  - `phone_call_clicks` (Integer)
- **Audience Data**:
  - `follower_count` (Integer)
  - `follower_demographics` (JSONB) - {age_ranges, genders, cities, countries}
  - `audience_online_times` (JSONB) - {hour: count}
- `created_at`, `updated_at` (DateTime)

---

## Content & Performance Tables

### 15. **content_pieces**
Individual content across platforms
- `id` (UUID)
- `user_id` (UUID FK)
- `organization_id` (UUID FK)
- `platform` (String) - 'youtube', 'instagram', 'tiktok'
- `platform_id` (String) - External platform ID (unique)
- `content_type` (String) - 'video', 'short', 'reel', 'post', 'story'
- **Content Info**:
  - `title` (Text)
  - `description` (Text)
  - `url` (Text)
  - `thumbnail_url` (Text)
  - `duration_seconds` (Integer) - Video duration
  - `hashtags` (Array)
  - `mentions` (Array)
  - `caption` (Text)
- **Publishing Info**:
  - `published_at` (DateTime)
  - `timezone` (String)
  - `day_of_week` (Integer) - 0-6
  - `hour_of_day` (Integer) - 0-23
  - `follower_count_at_post` (Integer)
- **AI Metadata**:
  - `theme` (String) - 'Tutorial', 'Behind the Scenes', etc.
  - `summary` (Text) - AI-generated summary
  - `detected_topics` (Array)
- **Status**:
  - `is_deleted` (Boolean)
  - `is_demo` (Boolean) - **CRITICAL for data separation**
  - `last_synced_at` (DateTime)
- `created_at`, `updated_at` (DateTime)

### 16. **content_performance**
Performance metrics for content pieces
- `id` (UUID)
- `content_id` (UUID FK) - Unique per content
- **Core Metrics**:
  - `views` (Integer)
  - `impressions` (Integer)
  - `likes` (Integer)
  - `comments_count` (Integer)
  - `shares` (Integer)
  - `saves` (Integer)
- **Video Metrics**:
  - `watch_time_minutes` (Integer)
  - `average_view_duration_seconds` (Integer)
  - `retention_rate` (Numeric) - Percentage
- **Engagement**:
  - `engagement_rate` (Numeric)
  - `click_through_rate` (Numeric)
- **Growth**:
  - `followers_gained` (Integer)
  - `profile_visits` (Integer)
- **Monetization**:
  - `revenue` (Numeric)
- **Performance Scoring**:
  - `performance_score` (Numeric) - 0-100 relative score
  - `percentile_rank` (Integer) - 0-100
  - `performance_category` (String) - 'overperforming', 'normal', 'underperforming'
  - `views_last_24h` (Integer)
  - `engagement_last_24h` (Integer)
- **Platform Specific**:
  - `platform_specific_metrics` (JSONB)
- `calculated_at`, `last_updated`, `created_at`, `updated_at` (DateTime)

### 17. **content_insights**
AI-generated insights about content
- `id` (UUID)
- `content_id` (UUID FK)
- `insight_type` (String) - 'success_factor', 'failure_factor', 'pattern', 'recommendation'
- `category` (String) - 'timing', 'topic', 'format', 'engagement'
- `title` (String)
- `description` (Text)
- `impact_level` (String) - 'high', 'medium', 'low'
- `supporting_data` (JSONB)
- `confidence_score` (Numeric) - 0-1
- `is_positive` (Boolean)
- `is_actionable` (Boolean)
- `generated_at`, `created_at`, `updated_at` (DateTime)

### 18. **content_themes**
Content themes/categories with aggregate performance
- `id` (UUID)
- `user_id` (UUID FK)
- `name` (String)
- `description` (Text)
- `color` (String) - Hex color
- **Aggregate Metrics**:
  - `content_count` (Integer)
  - `total_views` (Integer)
  - `avg_engagement_rate` (Numeric)
  - `avg_performance_score` (Numeric)
- `last_calculated_at` (DateTime)
- `created_at`, `updated_at` (DateTime)

---

## AI Chat & Collaboration Tables

### 19. **ai_chat_sessions**
AI chat session management
- `id` (UUID)
- `user_id` (UUID FK)
- `title` (String)
- `context_tags` (JSONB) - Context tags
- `system_prompt` (Text) - Custom system prompt
- `mode` (String) - 'general', 'content_analysis', 'strategy'
- `status` (String) - 'active', 'archived'
- `last_message_at` (DateTime)
- **Branching Support**:
  - `parent_session_id` (UUID FK)
  - `branch_point_message_id` (UUID)
  - `context_inheritance` (JSONB)
  - `branch_name` (String)
  - `depth_level` (Integer)
- **Enhancements**:
  - `starred` (Boolean)
  - `archived` (Boolean)
- `created_at`, `updated_at` (DateTime)

### 20. **ai_chat_messages**
Individual chat messages with embeddings
- `id` (UUID)
- `session_id` (UUID FK)
- `user_id` (UUID FK)
- `role` (String) - 'user' or 'assistant'
- `content` (Text) - Message content
- **AI Metadata**:
  - `metadata` (JSONB)
  - `tokens` (Integer) - Token count
  - `model` (String) - Model used
- **Status**:
  - `status` (String) - 'completed', 'pending', 'error'
  - `error` (Text)
  - `retry_count` (Integer)
- **Vector Embedding** (RAG):
  - `embedding` (Vector 1536) - pgvector
- `created_at` (DateTime)

### 21. **tags**
User-created tags for organization
- `id` (UUID)
- `user_id` (UUID FK)
- `name` (String) - Tag name
- `color` (String) - Hex color
- `created_at`, `updated_at` (DateTime)

### 22. **session_tags** (Junction table)
Many-to-many relationship between sessions and tags

---

## Application & Approval Workflow Tables

### 23. **applications**
Creator/agency signup applications
- `id` (UUID)
- `user_id` (UUID FK)
- `account_type` (Enum) - 'creator', 'agency', 'legacy'
- `application_data` (JSONB) - All form data
- `submitted_at` (DateTime)
- `reviewed_at` (DateTime)
- `reviewed_by` (UUID FK) - Admin who reviewed
- `status` (Enum) - 'pending', 'approved', 'rejected'
- `admin_notes` (Text)
- `created_at`, `updated_at` (DateTime)

### 24. **admin_notification_settings**
Admin notification preferences
- `id` (UUID)
- `email` (String) - Email to notify (unique)
- `notification_types` (JSONB) - {creator_applications, agency_applications}
- `is_active` (Boolean)
- `added_by` (UUID FK) - Admin who added setting
- `added_at` (DateTime)

---

## Credit & Billing Tables

### 25. **user_credit_balances**
Cached credit balance per user
- `id` (UUID)
- `user_id` (UUID FK) - Unique
- **Balance Tracking**:
  - `current_balance` (Float) - Available credits
  - `total_earned` (Float) - Total ever earned
  - `total_consumed` (Float) - Total ever consumed
- **Monthly Tracking**:
  - `monthly_allowance` (Float) - Credits per month
  - `month_start_balance` (Float)
  - `current_month_consumed` (Float)
- **Reset Tracking**:
  - `last_reset_at` (DateTime)
  - `next_reset_at` (DateTime)
- **Limits**:
  - `is_unlimited` (Boolean) - Admin/special accounts
  - `low_balance_notified` (Boolean)
- `created_at`, `updated_at` (DateTime)
- **Note**: 1 credit = $0.10 of actual cost

### 26. **credit_usage_events**
Individual credit usage events (audit trail)
- `id` (UUID)
- `user_id` (UUID FK)
- `action_type` (Enum String) - See list below
- `description` (String)
- **Cost Breakdown**:
  - `credits_charged` (Float)
  - `base_cost` (Float) - Dollars
  - `api_cost` (Float) - Dollars
  - `compute_cost` (Float) - Dollars
- **AI Operations Data**:
  - `input_tokens` (Integer)
  - `output_tokens` (Integer)
  - `model_used` (String)
- **Context**:
  - `resource_id` (String) - Related resource ID
  - `resource_type` (String)
  - `event_metadata` (JSON)
- `created_at` (DateTime)

**Action Types Enumeration**:
- AI Operations: `ai_chat_message`, `ai_comment_response`, `ai_sentiment_analysis`, `ai_content_suggestion`
- Automation: `workflow_execution`, `scheduled_task`, `bulk_operation`
- Platform Features: `youtube_sync`, `comment_fetch`, `video_analysis`, `analytics_generation`
- API Calls: `external_api_call`

### 27. **credit_action_costs**
Configuration for action costs
- `id` (UUID)
- `action_type` (Enum) - Action type key
- `base_cost_dollars` (Float)
- `compute_cost_dollars` (Float)
- `description` (String)
- `is_active` (Boolean)
- `created_at`, `updated_at` (DateTime)

---

## Monetization & Opportunity Tables

### 28. **creator_profiles**
Creator profile for monetization matching
- `id` (UUID)
- `user_id` (UUID FK) - Unique
- `primary_platform` (String) - 'youtube', 'instagram', 'tiktok', 'twitch'
- **Required Fields**:
  - `follower_count` (Integer)
  - `engagement_rate` (Numeric)
  - `niche` (String) - 'fashion', 'gaming', 'wellness', 'tech'
- **Optional Fields**:
  - `platform_url` (String)
  - `avg_content_views` (Integer)
  - `content_frequency` (Integer) - Posts per week
  - `audience_demographics` (JSONB)
  - `community_signals` (JSONB)
  - `creator_personality` (String)
  - `time_available_hours_per_week` (Integer)
- `created_at`, `updated_at` (DateTime)

### 29. **active_projects**
Active monetization projects
- `id` (UUID)
- `user_id` (UUID FK)
- `opportunity_id` (String) - Default: 'premium-community'
- `opportunity_title` (String)
- `opportunity_category` (String)
- **Progress Tracking** (0-100):
  - `status` (String) - 'active', 'completed', 'abandoned'
  - `current_phase_index` (Integer)
  - `overall_progress` (Integer)
  - `planning_progress` (Integer)
  - `execution_progress` (Integer)
  - `timeline_progress` (Integer)
- **Timeline**:
  - `started_at` (DateTime)
  - `target_launch_date` (Date)
  - `last_activity_at` (DateTime)
  - `completed_at` (DateTime)
- `customized_plan` (JSONB) - Implementation plan
- `created_at`, `updated_at` (DateTime)

### 30. **project_chat_messages**
Chat within monetization projects
- `id` (UUID)
- `project_id` (UUID FK)
- `role` (String) - 'user', 'assistant'
- `content` (Text)
- `detected_actions` (JSONB)
- `input_tokens`, `output_tokens` (Integer)
- `created_at`, `updated_at` (DateTime)

### 31. **project_task_completions**
Completed tasks within projects
- `id` (UUID)
- `project_id` (UUID FK)
- `task_id` (String) - e.g., '1.2'
- `task_title` (String)
- `completed_at` (DateTime)
- `completed_via` (String) - 'manual', 'ai_auto', 'ai_confirmed'
- `notes` (Text)

### 32. **project_decisions**
Key decisions made during project planning
- `id` (UUID)
- `project_id` (UUID FK)
- `decision_category` (String) - 'pricing', 'platform', 'structure', 'timeline', 'content'
- `decision_value` (Text) - The choice made
- `rationale` (Text)
- `confidence` (String) - 'high', 'medium', 'low'
- `related_message_id` (UUID FK)
- `decided_at` (DateTime)
- `superseded_by` (UUID FK) - If decision changed
- `is_current` (Boolean)

### 33. **content_analysis**
Cached analysis of creator content and audience
- `id` (UUID)
- `user_id` (UUID FK) - Unique
- `top_topics` (JSONB)
- `content_type_performance` (JSONB)
- **Audience Signals**:
  - `audience_questions` (JSONB)
  - `question_volume_per_week` (Integer)
  - `repeat_engagers_count` (Integer)
  - `dm_volume_estimate` (String) - 'low', 'medium', 'high'
- `growth_trajectory` (JSONB)
- `key_strengths` (JSONB)
- **Cache Metadata**:
  - `analyzed_at` (DateTime)
  - `expires_at` (DateTime)

### 34. **opportunity_templates**
Template library for monetization opportunities
- `id` (String) - Primary key, e.g., 'premium-community-discord'
- `category` (String)
- `title` (String)
- `description` (Text)
- `ideal_for` (JSONB) - Matching criteria
- `revenue_model` (JSONB)
- `implementation_template` (JSONB)
- `success_patterns` (JSONB)

### 35. **generated_opportunities**
History of AI-generated opportunities
- `id` (UUID)
- `user_id` (UUID FK)
- `generation_context` (JSONB)
- `opportunities` (JSONB) - Generated opportunities
- `selected_opportunity_id` (String)
- `generated_at` (DateTime)

### 36. **plan_modifications**
History of plan adaptations during execution
- `id` (UUID)
- `project_id` (UUID FK)
- `modification_type` (String) - 'add_task', 'remove_task', 'add_phase', 'reorder', 'adjust_timeline'
- `trigger_type` (String) - 'user_request', 'progress_signal', 'market_feedback'
- `trigger_content` (Text)
- `changes` (JSONB)
- `ai_rationale` (Text)
- `modified_at` (DateTime)

### 37. **ai_usage_logs**
AI API usage for cost tracking
- `id` (UUID)
- `user_id` (UUID FK)
- `project_id` (UUID FK)
- `model` (String)
- `input_tokens`, `output_tokens` (Integer)
- `estimated_cost` (Numeric) - USD
- `endpoint` (String) - 'chat', 'welcome'
- `created_at` (DateTime)

---

## Analytics & Interaction Tables

### 38. **analytics_snapshots**
Daily analytics snapshots
- `id` (UUID)
- `location_id` (UUID FK)
- `date` (Date)
- `metrics` (JSONB) - Flexible metrics storage
- `created_at` (DateTime)

### 39. **interaction_analytics**
Interaction metrics by day/hour
- `id` (UUID)
- `user_id` (UUID FK)
- `view_id` (UUID FK)
- `date` (Date)
- `hour` (Integer) - NULL for daily metrics
- **Counts**:
  - `total_interactions`, `total_replied`, `total_archived`, `total_spam` (Integer)
  - `comments_count`, `dms_count`, `mentions_count` (Integer)
  - `urgent_count`, `important_count` (Integer)
- **Sentiment**:
  - `positive_count`, `negative_count`, `neutral_count` (Integer)
- **Performance**:
  - `avg_response_time_minutes` (Integer)
  - `response_rate` (Numeric)
- **Revenue**:
  - `sales_count`, `collab_opportunities` (Integer)
  - `revenue` (Numeric)

---

## Workflow & Automation Tables

### 40. **workflows**
Automation workflows
- `id` (UUID)
- `user_id` (UUID FK)
- `name` (String)
- `description` (Text)
- `trigger_type` (String)
- `trigger_config` (JSONB)
- `action_type` (String)
- `action_config` (JSONB)
- `is_active` (Boolean)
- `created_at`, `updated_at` (DateTime)

### 41. **response_templates**
Response templates for comments/messages
- `id` (UUID)
- `location_id` (UUID FK)
- `name` (String)
- `category` (String)
- `template_text` (Text)
- `placeholders` (Array)
- `usage_count` (Integer)
- `created_by_id` (UUID FK)
- `created_at`, `updated_at` (DateTime)

---

## Audit & Tracking Tables

### 42. **audit_logs**
System audit trail
- `id` (UUID)
- `user_id` (UUID FK)
- `organization_id` (UUID FK)
- `action` (String)
- `resource_type` (String)
- `resource_id` (String)
- `changes` (JSONB)
- `ip_address` (String)
- `user_agent` (String)
- `created_at` (DateTime)

### 43. **background_jobs**
Background job tracking
- `id` (UUID)
- `user_id` (UUID FK)
- `job_type` (String)
- `status` (String) - 'pending', 'running', 'completed', 'failed'
- `payload` (JSONB)
- `result` (JSONB)
- `error_message` (Text)
- `started_at`, `completed_at` (DateTime)
- `created_at`, `updated_at` (DateTime)

### 44. **ai_training_data**
AI training and fine-tuning data
- `id` (UUID)
- `user_id` (UUID FK)
- `data_type` (String)
- `content` (Text)
- `metadata` (JSONB)
- `created_at` (DateTime)

---

## Additional Data Tables

### 45. **user_sessions**
User login sessions
- `id` (UUID)
- `user_id` (UUID FK)
- `session_token` (String)
- `ip_address` (String)
- `user_agent` (String)
- `expires_at` (DateTime)
- `created_at` (DateTime)

### 46. **user_feedback**
User feedback collection
- `id` (UUID)
- `user_id` (UUID FK)
- `feedback_type` (String)
- `message` (Text)
- `rating` (Integer)
- `created_at` (DateTime)

### 47. **interaction_views**
Saved views for interactions
- `id` (UUID)
- `user_id` (UUID FK)
- `name` (String)
- `filters` (JSONB)
- `created_at`, `updated_at` (DateTime)

### 48. **ai_context**
AI context for content analysis
- `id` (UUID)
- `user_id` (UUID FK)
- `context_type` (String)
- `content` (Text)
- `metadata` (JSONB)
- `created_at`, `updated_at` (DateTime)

---

## Data Security & Encryption

### Token Storage - ENCRYPTED using Fernet
Files: `/backend/app/utils/crypto_utils.py` and `/backend/app/services/token_manager.py`

**Encryption Method**: Fernet (symmetric encryption from cryptography library)
- **Key Storage**: `ENCRYPTION_KEY` environment variable
- **Algorithm**: AES-128 in CBC mode with HMAC
- **Timestamp**: Tokens include timestamp to prevent replay attacks

**Encrypted Fields**:
1. `platform_connections.access_token`
2. `platform_connections.refresh_token`
3. `youtube_connections.access_token`
4. `youtube_connections.refresh_token`
5. `instagram_connections.access_token`

**Token Refresh Flow**:
- Encrypted tokens are automatically decrypted when needed
- Refresh tokens decrypt → use to get new access token → encrypt both → store
- Legacy plaintext tokens are supported for backward compatibility

### Other Sensitive Data
- `users.hashed_password` - Hashed (not encrypted)
- `users.auth_id` - Supabase managed
- Database credentials - Environment variables
- Stripe IDs - Stored as plaintext (standard practice)
- OAuth state tokens - Stored and marked as used after consumption

---

## Key Features & Patterns

### 1. **Multi-tenancy**
- Organizations own locations
- Users have memberships with roles and permissions
- Demo mode for testing (marked with `is_demo` flag)

### 2. **Platform Integrations**
- YouTube (full sync: channels, videos, comments)
- Instagram (posts, reels, stories, comments)
- Support for: Google, Facebook, TripAdvisor, Twitter, TikTok (framework in place)

### 3. **AI/ML Features**
- Vector embeddings for chat messages (pgvector)
- Sentiment analysis (comments, posts)
- Content performance prediction
- Theme detection and categorization
- Audience analysis

### 4. **Credit System**
- Per-user monthly allowance (100 credits default)
- Fine-grained action tracking
- Token-based cost calculation for AI operations
- Monthly reset tracking

### 5. **Application Workflow**
- Creator/Agency signup applications
- Approval workflow with admin review
- Application data stored as JSONB for flexibility

### 6. **Content & Performance**
- Cross-platform content aggregation
- Performance scoring and percentile ranking
- Hourly/daily analytics aggregation
- Engagement metrics and audience insights

### 7. **Automation**
- Workflow system with triggers and actions
- Background job processing
- Sync logs for data consistency

### 8. **Audit & Compliance**
- Audit logs for all actions
- Session tracking
- Marketing preference tracking
- GDPR-friendly deletion cascades

---

## Total Data Volume Estimates
- **User accounts**: User-proportional storage
- **Content pieces**: Scales with platform syncs (100s-1000s per user)
- **Chat messages**: Proportional to user activity
- **Analytics**: Daily snapshots, retained for analysis
- **Tokens**: Encrypted, relatively small storage
- **Audit logs**: Continuous growth for compliance

---

## Important Notes

1. **Demo Mode**: The `is_demo` flag in `content_pieces` and `users.demo_mode_status` separate demo/testing data from real production data
2. **Token Security**: All OAuth tokens are Fernet-encrypted before storage
3. **JSONB Fields**: Used extensively for flexible data storage (account_info, settings, metrics, etc.)
4. **Cascade Deletes**: Foreign keys use ON DELETE CASCADE for proper cleanup
5. **Unique Constraints**: Multi-column unique constraints prevent duplicate connections per location/platform
6. **Pagination Indexes**: Strategic indexes on common query patterns (user_id, created_at, status)
