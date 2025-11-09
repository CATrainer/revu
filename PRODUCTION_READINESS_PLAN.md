# Production Readiness Plan - Social Media Data Collection

## Current State Analysis

### ✅ YouTube - FULLY IMPLEMENTED
**Models**: Complete (`youtube_connections`, `youtube_videos`, `youtube_comments`)
**API Integration**: Full OAuth2 flow, token refresh, API wrapper
**Data Collection**: Videos, comments, replies, channel info, statistics
**Scopes**: Read + Write (force-ssl for comment management)

### ❌ Instagram - STUB/PLACEHOLDER ONLY
**Models**: None (no tables)
**API Integration**: Placeholder code only
**Data Collection**: None
**Status**: Needs complete implementation

---

## What Data We Need to Collect

### YouTube (Already Collecting ✅)
**Channel Data**:
- ✅ Channel ID, name
- ✅ Subscriber count (from statistics)
- ✅ Total views, video count

**Video Data**:
- ✅ Video ID, title, description
- ✅ Thumbnail URL
- ✅ Published date
- ✅ View count, like count, comment count
- ✅ Duration
- ✅ Tags (shorts vs long-form)

**Comment Data**:
- ✅ Comment ID, content
- ✅ Author name, channel ID
- ✅ Published date
- ✅ Like count, reply count
- ✅ Parent comment ID (for replies)
- ✅ Owner flags (hearted, liked)

**Missing YouTube Data** (Need to Add):
- ❌ Video categories/topics
- ❌ Video tags (actual YouTube tags)
- ❌ Subscriber growth over time
- ❌ Watch time / retention data (requires YouTube Analytics API)
- ❌ Traffic sources
- ❌ Audience demographics (requires Analytics API)

### Instagram (Need to Implement)
**Account Data**:
- Account ID, username
- Profile picture URL
- Bio
- Follower count, following count
- Media count
- Account type (business/creator/personal)

**Media Data** (Posts/Reels):
- Media ID, type (image/video/carousel/reel)
- Caption
- Media URL, thumbnail URL
- Posted date
- Like count, comment count, save count, share count
- Play count (for videos/reels)
- Reach, impressions (business accounts)
- Hashtags used

**Story Data** (24hr expiry):
- Story ID
- Media URL
- Posted date, expires date
- View count, reply count
- Reach, impressions

**Comment Data**:
- Comment ID, text
- Username, user ID
- Timestamp
- Like count
- Parent comment ID (for replies)
- Hidden status

**Insights Data** (Business/Creator accounts):
- Profile views
- Website clicks
- Email/call/direction clicks
- Follower demographics (age, gender, location)
- Top posts by engagement
- Audience online times

---

## Implementation Priority

### Phase 1: Instagram Basic Integration (Week 1)
1. Create Instagram models (connections, media, comments)
2. Implement Meta OAuth flow
3. Basic data sync (account info, recent media)
4. Store in database

### Phase 2: Instagram Advanced Features (Week 2)
5. Comment collection and management
6. Insights collection (business accounts)
7. Story tracking
8. Hashtag performance

### Phase 3: YouTube Enhancements (Week 3)
9. Add YouTube Analytics API integration
10. Collect demographics and traffic sources
11. Track subscriber growth over time
12. Video performance trends

### Phase 4: Cross-Platform Analytics (Week 4)
13. Unified analytics across platforms
14. Cross-platform fan identification
15. Content performance comparison
16. Engagement rate calculations

---

## API Requirements & Permissions

### YouTube (Current)
**Current Scopes**:
- `https://www.googleapis.com/auth/youtube.readonly` ✅
- `https://www.googleapis.com/auth/youtube.force-ssl` ✅

**Need to Add**:
- `https://www.googleapis.com/auth/yt-analytics.readonly` (for demographics, traffic, retention)

**Google Cloud Console Setup**:
1. Enable YouTube Data API v3 ✅ (already enabled)
2. Enable YouTube Analytics API ❌ (need to enable)
3. Update OAuth consent screen with new scope
4. No additional verification needed (same app)

### Instagram (New)
**Required Scopes**:
- `instagram_basic` - Basic profile info, media
- `instagram_content_publish` - Post content (future)
- `instagram_manage_comments` - Read/reply to comments
- `instagram_manage_insights` - Access insights data
- `pages_show_list` - List Facebook pages
- `pages_read_engagement` - Read page data

**Meta Developer Setup** (Step-by-step below):
1. Create Meta App
2. Add Instagram Basic Display API
3. Add Instagram Graph API (for business features)
4. Configure OAuth redirect URLs
5. Submit for App Review (required for production)
6. Get approved for permissions

---

## Database Schema Changes Needed

### New Tables for Instagram

```sql
-- Instagram connections
CREATE TABLE instagram_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    instagram_user_id VARCHAR NOT NULL,
    username VARCHAR NOT NULL,
    account_type VARCHAR, -- 'PERSONAL', 'BUSINESS', 'CREATOR'
    profile_picture_url TEXT,
    bio TEXT,
    follower_count INTEGER,
    following_count INTEGER,
    media_count INTEGER,
    access_token TEXT,
    token_expires_at TIMESTAMPTZ,
    connection_status VARCHAR DEFAULT 'active',
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(instagram_user_id)
);

-- Instagram media (posts/reels)
CREATE TABLE instagram_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID NOT NULL REFERENCES instagram_connections(id) ON DELETE CASCADE,
    media_id VARCHAR NOT NULL UNIQUE,
    media_type VARCHAR NOT NULL, -- 'IMAGE', 'VIDEO', 'CAROUSEL_ALBUM', 'REEL'
    caption TEXT,
    media_url TEXT,
    thumbnail_url TEXT,
    permalink TEXT,
    timestamp TIMESTAMPTZ,
    like_count INTEGER,
    comment_count INTEGER,
    save_count INTEGER,
    share_count INTEGER,
    play_count INTEGER, -- for videos/reels
    reach INTEGER, -- business accounts
    impressions INTEGER, -- business accounts
    engagement_rate DECIMAL(5,2),
    hashtags TEXT[], -- array of hashtags
    is_story BOOLEAN DEFAULT FALSE,
    story_expires_at TIMESTAMPTZ,
    last_fetched_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Instagram comments
CREATE TABLE instagram_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_id UUID NOT NULL REFERENCES instagram_media(id) ON DELETE CASCADE,
    comment_id VARCHAR NOT NULL UNIQUE,
    username VARCHAR,
    user_id VARCHAR,
    text TEXT,
    timestamp TIMESTAMPTZ,
    like_count INTEGER,
    parent_comment_id VARCHAR, -- for replies
    is_hidden BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Instagram insights (daily snapshots)
CREATE TABLE instagram_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID NOT NULL REFERENCES instagram_connections(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    profile_views INTEGER,
    reach INTEGER,
    impressions INTEGER,
    website_clicks INTEGER,
    email_contacts INTEGER,
    phone_call_clicks INTEGER,
    follower_count INTEGER,
    follower_demographics JSONB, -- {age_ranges, genders, cities, countries}
    audience_online_times JSONB, -- {hour: count}
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(connection_id, date)
);
```

### Enhanced YouTube Tables

```sql
-- Add to youtube_connections
ALTER TABLE youtube_connections ADD COLUMN IF NOT EXISTS subscriber_count INTEGER;
ALTER TABLE youtube_connections ADD COLUMN IF NOT EXISTS total_views BIGINT;
ALTER TABLE youtube_connections ADD COLUMN IF NOT EXISTS video_count INTEGER;

-- Add to youtube_videos
ALTER TABLE youtube_videos ADD COLUMN IF NOT EXISTS category_id VARCHAR;
ALTER TABLE youtube_videos ADD COLUMN IF NOT EXISTS video_tags TEXT[];
ALTER TABLE youtube_videos ADD COLUMN IF NOT EXISTS average_view_duration INTEGER; -- seconds
ALTER TABLE youtube_videos ADD COLUMN IF NOT EXISTS average_view_percentage DECIMAL(5,2);

-- New table for YouTube Analytics
CREATE TABLE youtube_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID NOT NULL REFERENCES youtube_connections(id) ON DELETE CASCADE,
    video_id UUID REFERENCES youtube_videos(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    views INTEGER,
    watch_time_minutes INTEGER,
    average_view_duration INTEGER,
    average_view_percentage DECIMAL(5,2),
    likes INTEGER,
    dislikes INTEGER,
    comments INTEGER,
    shares INTEGER,
    subscribers_gained INTEGER,
    subscribers_lost INTEGER,
    traffic_source_data JSONB, -- {source: views}
    device_type_data JSONB, -- {device: views}
    audience_demographics JSONB, -- {age_gender: percentage}
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(connection_id, video_id, date)
);
```

---

## UX Improvements

### Connection Flow
1. **Clear permissions explanation** before OAuth
2. **Progress indicators** during sync
3. **Success confirmation** with data preview
4. **Reconnection prompts** when tokens expire
5. **Granular sync controls** (what to sync, how often)

### Data Sync
1. **Background sync** with Celery (don't block UI)
2. **Incremental sync** (only new/updated data)
3. **Sync status indicators** (syncing, last synced, errors)
4. **Manual refresh button** for immediate sync
5. **Sync history log** (what was synced when)

### Error Handling
1. **Rate limit warnings** before hitting limits
2. **Quota usage display** (YouTube API quota)
3. **Token expiry notifications** (7 days before)
4. **Graceful degradation** (show cached data if API fails)
5. **Retry mechanisms** with exponential backoff

### Data Display
1. **Real-time updates** (WebSocket for new comments)
2. **Filtering & search** (by date, engagement, keywords)
3. **Sorting options** (newest, most engaged, unanswered)
4. **Bulk actions** (mark as read, archive, reply to multiple)
5. **Export functionality** (CSV, JSON)

---

## Next Steps

1. **Review this plan** - Confirm priorities
2. **Create Instagram models** - Database schema
3. **Implement Meta OAuth** - Connection flow
4. **Build sync service** - Data collection
5. **Add YouTube Analytics** - Enhanced data
6. **Update frontend** - Display new data
7. **Test thoroughly** - Real accounts
8. **Deploy to production** - Staged rollout

**Estimated Timeline**: 3-4 weeks for full implementation
**Priority**: Instagram basic (Week 1) → Instagram advanced (Week 2) → YouTube Analytics (Week 3)
