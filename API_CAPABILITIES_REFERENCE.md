# API Capabilities Reference - YouTube & Instagram

## What Each API Actually Supports

This document defines exactly what we can and cannot do with each platform's API.

---

## YouTube Data API v3 + YouTube Analytics API

### ✅ What We CAN Do

#### Reading Data
- ✅ **Channel Info**: ID, name, description, subscriber count, view count, video count
- ✅ **Videos**: List all videos, get details (title, description, stats, tags, category)
- ✅ **Comments**: Read all comments and replies on videos
- ✅ **Statistics**: Views, likes, comments count per video
- ✅ **Playlists**: List playlists and their videos
- ✅ **Analytics** (with Analytics API):
  - Views, watch time, average view duration
  - Impressions, CTR
  - Subscribers gained/lost
  - Traffic sources (YouTube search, external, etc.)
  - Demographics (age, gender, geography)
  - Device types (mobile, desktop, TV)
  - Playback locations

#### Writing/Modifying Data
- ✅ **Reply to Comments**: Post replies to any comment
- ✅ **Delete Comments**: Delete our own comments/replies
- ✅ **Update Comment**: Edit our own comments
- ❌ **Heart Comments**: NOT supported via API (only in YouTube Studio UI)
- ❌ **Pin Comments**: NOT supported via API
- ❌ **Direct Messages**: YouTube doesn't have DMs

#### Limitations
- **Quota**: 10,000 units/day (read: 1 unit, write: 50 units)
- **Rate Limit**: ~100 requests per 100 seconds per user
- **Comment Replies**: Can only reply to top-level comments (not nested replies)
- **Analytics Delay**: 2-3 days for complete data

### Required Scopes
```python
YOUTUBE_SCOPES = [
    "https://www.googleapis.com/auth/youtube.readonly",           # Read channel, videos
    "https://www.googleapis.com/auth/youtube.force-ssl",          # Manage comments
    "https://www.googleapis.com/auth/yt-analytics.readonly",      # Analytics data
]
```

---

## Instagram Graph API (Business/Creator Accounts)

### ✅ What We CAN Do

#### Reading Data
- ✅ **Account Info**: ID, username, name, bio, profile picture, follower/following count
- ✅ **Media**: Posts, reels, albums (NOT stories without special approval)
- ✅ **Media Details**: Caption, media URL, timestamp, like/comment/save counts
- ✅ **Comments**: Read comments on media
- ✅ **Replies**: Read replies to comments
- ✅ **Insights** (Business/Creator only):
  - Profile views, reach, impressions
  - Website clicks, email/phone contacts
  - Follower demographics (age, gender, city, country)
  - Online times
  - Media insights (reach, impressions, engagement, saves)
- ✅ **Hashtag Data**: Search hashtags, get recent media
- ✅ **Mentioned Media**: Media where account is @mentioned

#### Writing/Modifying Data
- ✅ **Reply to Comments**: Reply to comments on our media
- ✅ **Delete Comments**: Delete comments on our media
- ✅ **Hide Comments**: Hide comments on our media
- ✅ **Enable/Disable Comments**: Turn comments on/off for media
- ❌ **Like Comments**: NOT supported via API
- ❌ **Direct Messages**: NOT supported via Graph API (requires Instagram Messaging API - separate approval)
- ❌ **Stories**: Cannot read/post stories (requires special approval)
- ❌ **Post Content**: Requires separate approval and Instagram Content Publishing API

#### Limitations
- **Rate Limit**: 200 requests/hour per user (default)
- **App Rate Limit**: 4,800 requests/hour per app
- **Business Account Required**: Most features require Business/Creator account
- **Facebook Page Required**: Must be connected to Facebook Page
- **Comment Depth**: Can only reply to top-level comments (not nested)
- **Insights Delay**: 24-48 hours for complete data
- **Historical Limit**: Can only get last 24 media items without pagination

### Required Permissions
```python
INSTAGRAM_PERMISSIONS = [
    "instagram_basic",                    # Basic profile, media (auto-approved)
    "instagram_manage_comments",          # Read/reply/delete comments (requires review)
    "instagram_manage_insights",          # Access insights (requires review)
    "pages_show_list",                    # List Facebook pages (requires review)
    "pages_read_engagement",              # Read page engagement (requires review)
]
```

### Instagram Basic Display API (Personal Accounts)

#### ✅ What We CAN Do
- ✅ **Basic Profile**: Username, account type, media count
- ✅ **Media**: Last 25 media items only
- ✅ **Media Details**: Caption, media URL, timestamp, permalink

#### ❌ What We CANNOT Do
- ❌ **Comments**: Cannot read comments
- ❌ **Insights**: No analytics
- ❌ **Messaging**: No replies or DMs
- ❌ **Hashtags**: No hashtag data
- ❌ **Stories**: No story access

**Recommendation**: Only use for personal accounts, encourage users to switch to Business/Creator.

---

## Instagram Messaging API (Separate Product)

### What It Provides
- ✅ **Read DMs**: Read Instagram Direct messages
- ✅ **Send DMs**: Send messages to users who messaged you first
- ✅ **Attachments**: Send images, videos, links
- ✅ **Quick Replies**: Send structured quick reply buttons
- ✅ **Ice Breakers**: Set up conversation starters

### Requirements
- ❌ **Separate App Review**: Requires additional approval process
- ❌ **Strict Use Case**: Must demonstrate customer support use case
- ❌ **24-Hour Window**: Can only message users within 24 hours of their last message
- ❌ **No Broadcast**: Cannot send unsolicited messages

**Status**: NOT implementing in initial version (too restrictive, separate approval)

---

## What We're Implementing

### YouTube (Full Support)
```
✅ Read channel info + analytics
✅ Read videos + analytics (views, watch time, retention, CTR, demographics)
✅ Read comments + replies
✅ Reply to comments
✅ Delete our comments
✅ Enrich comments (sentiment, priority, categories)
✅ Map to Interaction model
✅ Map to ContentPiece + ContentPerformance
✅ Map authors to Fan model
```

### Instagram (Business/Creator Accounts)
```
✅ Read account info
✅ Read media (posts, reels)
✅ Read comments + replies
✅ Read insights (profile + media)
✅ Reply to comments
✅ Delete comments
✅ Hide comments
✅ Enrich comments (sentiment, priority, categories)
✅ Map to Interaction model
✅ Map to ContentPiece + ContentPerformance
✅ Map authors to Fan model
❌ DMs (not implementing - requires separate approval)
❌ Stories (not implementing - requires special approval)
```

### Instagram (Personal Accounts - Limited)
```
✅ Read basic profile
✅ Read last 25 media items
⚠️ Limited functionality (no comments, no insights)
⚠️ Encourage upgrade to Business/Creator
```

---

## Data Collection Matrix

| Feature | YouTube | Instagram Business | Instagram Personal |
|---------|---------|-------------------|-------------------|
| **Profile Data** | ✅ Full | ✅ Full | ✅ Basic |
| **Content List** | ✅ All videos | ✅ All media | ⚠️ Last 25 only |
| **Content Details** | ✅ Full | ✅ Full | ✅ Basic |
| **Comments** | ✅ All | ✅ All | ❌ None |
| **Comment Replies** | ✅ Yes | ✅ Yes | ❌ No |
| **Analytics** | ✅ Full | ✅ Full | ❌ None |
| **Demographics** | ✅ Yes | ✅ Yes | ❌ No |
| **Traffic Sources** | ✅ Yes | ❌ No | ❌ No |
| **Engagement Metrics** | ✅ Full | ✅ Full | ⚠️ Basic |
| **Reply to Comments** | ✅ Yes | ✅ Yes | ❌ No |
| **Delete Comments** | ✅ Own only | ✅ On our media | ❌ No |
| **Direct Messages** | ❌ N/A | ❌ No* | ❌ No |

*Requires separate Instagram Messaging API approval

---

## Messaging Capabilities Summary

### YouTube
- ✅ **Reply to comments**: Full support
- ✅ **Delete our replies**: Full support
- ❌ **Heart comments**: Not supported by API
- ❌ **Pin comments**: Not supported by API
- ❌ **DMs**: YouTube has no DM system

### Instagram Business/Creator
- ✅ **Reply to comments**: Full support
- ✅ **Delete comments**: On our media only
- ✅ **Hide comments**: On our media only
- ❌ **Like comments**: Not supported by API
- ❌ **DMs**: Requires separate Messaging API (not implementing)

### Instagram Personal
- ❌ **No messaging capabilities**: Must upgrade to Business/Creator

---

## Implementation Strategy

### Phase 1: Core Data Collection (Week 1)
1. YouTube: Videos, comments, channel metrics
2. Instagram: Media, comments, profile info
3. Basic enrichment (sentiment, categories)
4. Map to Interaction/ContentPiece models

### Phase 2: Analytics Integration (Week 2)
1. YouTube Analytics API integration
2. Instagram Insights collection
3. ContentPerformance population
4. Demographics and traffic data

### Phase 3: Messaging Features (Week 2)
1. YouTube comment replies
2. Instagram comment replies
3. Comment management (delete, hide)
4. Workflow integration

### Phase 4: Advanced Features (Week 3)
1. Fan identification and scoring
2. Theme detection
3. Performance scoring
4. Cross-platform analytics

---

## API Quotas & Rate Limits

### YouTube
- **Daily Quota**: 10,000 units
- **Read Operations**: 1-5 units each
- **Write Operations**: 50 units each
- **Typical Usage**: ~200-500 units/day per user
- **Cost**: Free

### Instagram
- **Per User**: 200 requests/hour
- **Per App**: 4,800 requests/hour
- **Typical Usage**: ~50-100 requests/hour per user
- **Cost**: Free

### Best Practices
1. **Cache aggressively**: Profile data, media lists
2. **Batch requests**: Get multiple videos/media at once
3. **Incremental sync**: Only fetch new/updated data
4. **Rate limit handling**: Exponential backoff
5. **Quota monitoring**: Track usage, alert on high usage

---

## Error Handling

### YouTube Errors
- `403 quotaExceeded`: Daily quota hit (10,000 units)
- `403 commentsDisabled`: Comments disabled on video
- `401 invalidCredentials`: Token expired/invalid
- `404 videoNotFound`: Video deleted or private

### Instagram Errors
- `190`: Access token expired
- `4`: App rate limit exceeded
- `100`: Invalid parameter
- `200`: Permission denied (need app review)
- `368`: Temporarily blocked (rate limit)

### Handling Strategy
1. **Token errors**: Auto-refresh tokens
2. **Rate limits**: Exponential backoff, queue requests
3. **Quota errors**: Pause sync, resume next day
4. **Permission errors**: Show user upgrade prompt

---

## Security & Privacy

### Data Storage
- ✅ **Encrypted tokens**: Store access/refresh tokens encrypted
- ✅ **Token rotation**: Refresh before expiry
- ✅ **Secure deletion**: Delete all data on disconnect
- ✅ **User consent**: Clear permission explanations

### Compliance
- ✅ **GDPR**: Data export, deletion on request
- ✅ **Platform ToS**: Follow YouTube/Instagram terms
- ✅ **Rate limits**: Respect API limits
- ✅ **Data retention**: Don't store more than needed

---

## Next Steps

1. ✅ Review this document
2. ✅ Implement enhanced YouTube models
3. ✅ Implement Instagram models
4. ✅ Create database migration
5. ✅ Build API clients
6. ✅ Build enrichment services
7. ✅ Build mapping services
8. ✅ Test with real accounts
9. ✅ Deploy to production

**Estimated Timeline**: 2-3 weeks for complete implementation
