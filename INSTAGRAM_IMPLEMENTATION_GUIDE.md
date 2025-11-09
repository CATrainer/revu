# Instagram Integration - Complete Implementation Guide

## Overview

This guide provides **everything you need** to add full Instagram integration to Repruv, including:
1. Database models and migration
2. Meta/Instagram API setup instructions
3. OAuth flow implementation
4. Data sync service
5. API endpoints
6. Frontend integration
7. Testing checklist

---

## Part 1: Database Setup

### Step 1: Create Migration

```bash
cd backend
alembic revision -m "add_instagram_integration"
```

### Step 2: Migration Content

File: `backend/alembic/versions/YYYYMMDD_HHMM_add_instagram_integration.py`

```python
"""add instagram integration

Revision ID: <generated>
Revises: 20251108_2046
Create Date: <generated>
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '<generated>'
down_revision = '20251108_2046'  # Update to your latest
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Instagram connections
    op.create_table(
        'instagram_connections',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('instagram_user_id', sa.String(), nullable=False),
        sa.Column('username', sa.String(), nullable=False),
        sa.Column('account_type', sa.String(), nullable=True),
        sa.Column('profile_picture_url', sa.Text(), nullable=True),
        sa.Column('bio', sa.Text(), nullable=True),
        sa.Column('follower_count', sa.Integer(), nullable=True),
        sa.Column('following_count', sa.Integer(), nullable=True),
        sa.Column('media_count', sa.Integer(), nullable=True),
        sa.Column('access_token', sa.Text(), nullable=True),
        sa.Column('token_expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('connection_status', sa.String(), nullable=False, server_default='active'),
        sa.Column('last_synced_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('instagram_user_id', name='uq_instagram_connections_instagram_user_id')
    )
    op.create_index('ix_instagram_connections_user_id', 'instagram_connections', ['user_id'])

    # Instagram media
    op.create_table(
        'instagram_media',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('connection_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('media_id', sa.String(), nullable=False),
        sa.Column('media_type', sa.String(), nullable=False),
        sa.Column('caption', sa.Text(), nullable=True),
        sa.Column('media_url', sa.Text(), nullable=True),
        sa.Column('thumbnail_url', sa.Text(), nullable=True),
        sa.Column('permalink', sa.Text(), nullable=True),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=True),
        sa.Column('like_count', sa.Integer(), nullable=True),
        sa.Column('comment_count', sa.Integer(), nullable=True),
        sa.Column('save_count', sa.Integer(), nullable=True),
        sa.Column('share_count', sa.Integer(), nullable=True),
        sa.Column('play_count', sa.Integer(), nullable=True),
        sa.Column('reach', sa.Integer(), nullable=True),
        sa.Column('impressions', sa.Integer(), nullable=True),
        sa.Column('engagement_rate', sa.Numeric(5, 2), nullable=True),
        sa.Column('hashtags', postgresql.ARRAY(sa.String()), nullable=False, server_default='{}'),
        sa.Column('is_story', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('story_expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_fetched_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['connection_id'], ['instagram_connections.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('media_id', name='uq_instagram_media_media_id')
    )
    op.create_index('ix_instagram_media_connection_id', 'instagram_media', ['connection_id'])
    op.create_index('ix_instagram_media_timestamp', 'instagram_media', ['timestamp'])

    # Instagram comments
    op.create_table(
        'instagram_comments',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('media_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('comment_id', sa.String(), nullable=False),
        sa.Column('username', sa.String(), nullable=True),
        sa.Column('user_id', sa.String(), nullable=True),
        sa.Column('text', sa.Text(), nullable=True),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=True),
        sa.Column('like_count', sa.Integer(), nullable=True),
        sa.Column('parent_comment_id', sa.String(), nullable=True),
        sa.Column('is_hidden', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['media_id'], ['instagram_media.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('comment_id', name='uq_instagram_comments_comment_id')
    )
    op.create_index('ix_instagram_comments_media_id', 'instagram_comments', ['media_id'])

    # Instagram insights
    op.create_table(
        'instagram_insights',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('connection_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('profile_views', sa.Integer(), nullable=True),
        sa.Column('reach', sa.Integer(), nullable=True),
        sa.Column('impressions', sa.Integer(), nullable=True),
        sa.Column('website_clicks', sa.Integer(), nullable=True),
        sa.Column('email_contacts', sa.Integer(), nullable=True),
        sa.Column('phone_call_clicks', sa.Integer(), nullable=True),
        sa.Column('follower_count', sa.Integer(), nullable=True),
        sa.Column('follower_demographics', postgresql.JSONB(), nullable=True),
        sa.Column('audience_online_times', postgresql.JSONB(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['connection_id'], ['instagram_connections.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('connection_id', 'date', name='uq_instagram_insights_connection_date')
    )
    op.create_index('ix_instagram_insights_connection_id', 'instagram_insights', ['connection_id'])
    op.create_index('ix_instagram_insights_date', 'instagram_insights', ['date'])


def downgrade() -> None:
    op.drop_table('instagram_insights')
    op.drop_table('instagram_comments')
    op.drop_table('instagram_media')
    op.drop_table('instagram_connections')
```

### Step 3: Run Migration

```bash
alembic upgrade head
```

---

## Part 2: Meta/Instagram API Setup

### Prerequisites
- Facebook Developer Account
- Business/Creator Instagram account (for full features)
- Valid domain for OAuth redirect

### Step-by-Step Setup

#### 1. Create Meta App

1. Go to https://developers.facebook.com/apps
2. Click "Create App"
3. Select "Consumer" or "Business" type
4. Fill in app details:
   - **App Name**: Repruv
   - **App Contact Email**: your-email@domain.com
5. Click "Create App"

#### 2. Add Instagram Products

1. In your app dashboard, click "Add Product"
2. Add **Instagram Basic Display**:
   - Click "Set Up"
   - Configure OAuth redirect URI: `https://your-domain.com/api/v1/instagram/callback`
   - Save changes

3. Add **Instagram Graph API** (for business features):
   - Click "Set Up"
   - This requires a Facebook Page connected to Instagram Business account

#### 3. Configure OAuth Settings

1. Go to **Settings** → **Basic**
2. Note your **App ID** and **App Secret**
3. Add **App Domains**: `your-domain.com`
4. Add **Privacy Policy URL**: `https://your-domain.com/privacy`
5. Add **Terms of Service URL**: `https://your-domain.com/terms`

6. Go to **Instagram Basic Display** → **Basic Display**
7. Add **Valid OAuth Redirect URIs**:
   ```
   https://your-domain.com/api/v1/instagram/callback
   http://localhost:8000/api/v1/instagram/callback  (for development)
   ```

8. Add **Deauthorize Callback URL**:
   ```
   https://your-domain.com/api/v1/instagram/deauthorize
   ```

9. Add **Data Deletion Request URL**:
   ```
   https://your-domain.com/api/v1/instagram/data-deletion
   ```

#### 4. Get Long-Lived Tokens

Instagram tokens expire after 60 days. You need to implement token refresh:

**Short-lived token** (1 hour):
- Obtained from OAuth flow
- Exchange immediately for long-lived token

**Long-lived token** (60 days):
```
GET https://graph.instagram.com/access_token
  ?grant_type=ig_exchange_token
  &client_secret={app-secret}
  &access_token={short-lived-token}
```

**Refresh long-lived token** (before expiry):
```
GET https://graph.instagram.com/refresh_access_token
  ?grant_type=ig_refresh_token
  &access_token={long-lived-token}
```

#### 5. App Review (Required for Production)

For production use, you need Meta to review your app:

1. Go to **App Review** → **Permissions and Features**
2. Request these permissions:
   - `instagram_basic` - Auto-approved
   - `instagram_manage_comments` - Requires review
   - `instagram_manage_insights` - Requires review
   - `pages_show_list` - Requires review
   - `pages_read_engagement` - Requires review

3. Prepare for review:
   - **Screencast**: Show how your app uses each permission
   - **Step-by-step instructions**: How to test your app
   - **Test user credentials**: Provide test Instagram account
   - **Use case description**: Explain why you need each permission

4. Submit for review (typically 3-7 days)

#### 6. Environment Variables

Add to your `.env`:

```bash
# Instagram/Meta API
META_APP_ID=your_app_id_here
META_APP_SECRET=your_app_secret_here
INSTAGRAM_REDIRECT_URI=https://your-domain.com/api/v1/instagram/callback

# For development
# INSTAGRAM_REDIRECT_URI=http://localhost:8000/api/v1/instagram/callback
```

---

## Part 3: Required Permissions Breakdown

### Instagram Basic Display API
**What it provides**:
- Basic profile info (username, account type)
- Media (posts, but NOT stories)
- Limited to 25 recent media items

**Limitations**:
- No comments
- No insights
- No stories
- No hashtag data
- Personal accounts only

### Instagram Graph API (Business/Creator)
**What it provides**:
- Full media access (posts, reels, stories)
- Comments and replies
- Insights and analytics
- Hashtag performance
- Audience demographics
- Story metrics

**Requirements**:
- Instagram Business or Creator account
- Connected to Facebook Page
- App Review approval

### Recommended Approach
1. **Phase 1**: Launch with Basic Display (no review needed)
2. **Phase 2**: Add Graph API after app review approval
3. **Fallback**: If user has personal account, use Basic Display; if business, use Graph API

---

## Part 4: YouTube API Updates

### Add YouTube Analytics API

#### 1. Enable in Google Cloud Console

1. Go to https://console.cloud.google.com
2. Select your project
3. Go to **APIs & Services** → **Library**
4. Search for "YouTube Analytics API"
5. Click "Enable"

#### 2. Update OAuth Scopes

In your YouTube OAuth flow, add this scope:
```
https://www.googleapis.com/auth/yt-analytics.readonly
```

**Full scopes list**:
```python
YOUTUBE_SCOPES = [
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/youtube.force-ssl",
    "https://www.googleapis.com/auth/yt-analytics.readonly",  # NEW
]
```

#### 3. No Additional Review Needed

YouTube Analytics API doesn't require additional verification if you're already approved for YouTube Data API.

---

## Part 5: Implementation Checklist

### Backend
- [ ] Create Instagram models (`backend/app/models/instagram.py`)
- [ ] Create Alembic migration
- [ ] Run migration (`alembic upgrade head`)
- [ ] Create Instagram API client (`backend/app/services/instagram_client.py`)
- [ ] Create Instagram sync service (`backend/app/services/instagram_sync.py`)
- [ ] Create Instagram OAuth endpoints (`backend/app/api/v1/endpoints/instagram.py`)
- [ ] Add Instagram to platform actions
- [ ] Create Celery tasks for Instagram sync
- [ ] Add Instagram to monitoring coordinator

### Frontend
- [ ] Add Instagram connection button
- [ ] Create Instagram OAuth flow UI
- [ ] Add Instagram media display
- [ ] Add Instagram comment management
- [ ] Add Instagram insights dashboard
- [ ] Add Instagram to unified analytics

### Testing
- [ ] Test OAuth flow (development)
- [ ] Test media sync
- [ ] Test comment sync
- [ ] Test insights collection
- [ ] Test token refresh
- [ ] Test error handling
- [ ] Test with real Instagram account

### Deployment
- [ ] Set environment variables
- [ ] Deploy backend changes
- [ ] Deploy frontend changes
- [ ] Test in production
- [ ] Submit for Meta app review
- [ ] Monitor for errors

---

## Part 6: API Rate Limits

### Instagram Basic Display
- **200 requests per hour** per user
- **Rate limit**: 1 request per second

### Instagram Graph API
- **200 requests per hour** per user (default)
- **4800 requests per hour** per app (can be increased)
- **Rate limit**: Varies by endpoint

### Best Practices
1. **Batch requests** where possible
2. **Cache aggressively** (especially profile data)
3. **Implement exponential backoff** on rate limit errors
4. **Use webhooks** for real-time updates (reduces polling)
5. **Sync incrementally** (only new/updated data)

---

## Part 7: Data Sync Strategy

### Initial Sync
1. **Profile data**: Username, bio, counts
2. **Recent media**: Last 25-50 posts
3. **Comments**: For each media item
4. **Insights**: Last 30 days (business accounts)

### Incremental Sync
1. **Every 15 minutes**: New comments
2. **Every hour**: Media metrics (likes, comments, views)
3. **Every 6 hours**: New media posts
4. **Daily**: Insights and demographics

### Webhook Integration (Advanced)
Instagram supports webhooks for:
- New comments
- Comment replies
- Mentions
- Story mentions

**Setup**: Requires app review approval

---

## Next Steps

1. **Review this guide** - Understand the full scope
2. **Set up Meta app** - Follow Part 2 instructions
3. **Run database migration** - Part 1
4. **Implement OAuth flow** - I'll provide code next
5. **Build sync service** - I'll provide code next
6. **Test with your account** - Before production
7. **Submit for app review** - 1 week before launch

**Estimated time**: 1-2 weeks for full implementation

Would you like me to continue with the actual code implementation (OAuth flow, sync service, API endpoints)?
