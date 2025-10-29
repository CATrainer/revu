# Demo Service API Requirements

This document specifies the API contract required for the demo service to work with the AI Assistant integration.

## Overview

The demo service manages creator profiles for demo mode, providing realistic channel metadata and coordinating with the backend to generate demo content, interactions, and fan data.

## Required Endpoints

### 1. Create Profile - `POST /profiles`

Creates or updates a demo profile for a user.

**Request Body:**
```json
{
    "user_id": "uuid-string",
    "profile_type": "auto",
    "channel_name": "TechReview Pro",
    "niche": "tech_reviews",
    "personality": "friendly_professional",
    "yt_subscribers": 100000,
    "yt_avg_views": 50000,
    "yt_upload_frequency": "daily",
    "ig_followers": 50000,
    "ig_post_frequency": "daily",
    "tt_followers": 200000,
    "tt_post_frequency": "daily",
    "comment_volume": "medium",
    "dm_frequency": "medium"
}
```

**Response (200 OK):**
```json
{
    "id": "profile-uuid",
    "user_id": "user-uuid",
    "channel_name": "TechReview Pro",
    "status": "active",
    "created_at": "2025-01-15T10:00:00Z"
}
```

**Error Cases:**
- `400` - Profile already exists (include message "already has an active")
- `500` - Server error

**Behavior:**
- If profile exists for user_id, return 400 with clear message
- Store all profile metadata for later retrieval
- Generate realistic channel name if not provided
- Return profile ID for tracking

---

### 2. Get Profile - `GET /profiles/{user_id}`

Retrieves the demo profile for a user. **This is the critical endpoint for AI Assistant integration.**

**Response (200 OK):**
```json
{
    "id": "profile-uuid",
    "user_id": "user-uuid",
    "channel_name": "TechReview Pro",
    "niche": "tech_reviews",
    "personality": "friendly_professional",
    "platforms": {
        "youtube": {
            "subscribers": 100000,
            "avg_views": 50000,
            "upload_frequency": "daily"
        },
        "instagram": {
            "followers": 50000,
            "post_frequency": "daily"
        },
        "tiktok": {
            "followers": 200000,
            "post_frequency": "daily"
        }
    },
    "comment_volume": "medium",
    "dm_frequency": "medium",
    "is_active": true,
    "created_at": "2025-01-15T10:00:00Z",
    "last_activity_at": "2025-01-20T15:30:00Z"
}
```

**Response (404 Not Found):**
```json
{
    "error": "Profile not found",
    "user_id": "user-uuid"
}
```

**Critical Fields for AI Assistant:**
- `channel_name` - Used in AI context ("Channel: TechReview Pro")
- `niche` - Formatted and displayed to AI
- `platforms.youtube.subscribers` - Shown in stats
- `platforms.youtube.avg_views` - Shown in stats
- `platforms.instagram.followers` - Shown in stats
- `platforms.tiktok.followers` - Shown in stats

---

### 3. Delete Profile - `DELETE /profiles/{user_id}`

Deactivates a demo profile.

**Response (200 OK):**
```json
{
    "success": true,
    "user_id": "user-uuid",
    "deactivated_at": "2025-01-20T10:00:00Z"
}
```

**Response (404 Not Found):**
```json
{
    "error": "Profile not found",
    "user_id": "user-uuid"
}
```

**Behavior:**
- Mark profile as inactive rather than hard delete
- Stop generating demo activities
- Can be idempotent (multiple deletes don't error)

---

## Data Flow

### Demo Mode Enable Flow
```
1. User clicks "Enable Demo Mode" in frontend
2. Backend creates background job, sets user.demo_mode_status = 'enabling'
3. Celery task calls demo service: POST /profiles
4. Demo service creates profile, returns profile_id
5. Backend stores demo_profile_id, sets demo_mode_status = 'enabled'
6. Demo service begins generating content/interactions in background
7. Demo service calls backend webhook: POST /api/v1/demo-webhooks/content
8. Backend stores demo data with is_demo=true flag
```

### AI Assistant Query Flow
```
1. User sends message to AI Assistant
2. Backend checks if demo_mode_status = 'enabled'
3. If enabled, calls: GET /profiles/{user_id}
4. Parses channel_name, niche, platform stats
5. Queries database for demo content/interactions/fans (is_demo=true)
6. Injects all context into system prompt
7. AI responds with data-driven insights about demo channel
```

### Demo Mode Disable Flow
```
1. User clicks "Disable Demo Mode"
2. Backend sets demo_mode_status = 'disabling'
3. Celery task calls: DELETE /profiles/{user_id}
4. Backend deletes all is_demo=true records from database
5. Backend sets demo_mode_status = 'disabled'
```

---

## Implementation Notes

### Channel Name Generation
Consider generating realistic channel names based on niche:
- **tech_reviews**: "TechReview Pro", "GadgetGuru", "TechBytes"
- **gaming**: "ProGamerHQ", "GamersUnite", "LevelUp Gaming"
- **beauty**: "GlamourGuide", "Beauty Insider", "MakeupMaven"
- **fitness**: "FitLife Coach", "Muscle Motion", "Wellness Warriors"
- **cooking**: "Chef's Table", "TastyBites", "Culinary Corner"

### Profile Storage
- Use database or in-memory store with persistence
- Index by user_id for fast lookups
- Track last_activity_at for monitoring
- Consider profile expiration (auto-disable after N days inactive)

### Platform Stats Validation
- Ensure subscribers/followers are realistic for niche
- YouTube avg_views typically 5-20% of subscribers
- Instagram engagement typically higher than YouTube
- TikTok can have higher reach than follower count

### Error Handling
- Graceful degradation if service unavailable
- Backend has fallback profile data in chat.py
- Timeout: 3-5 seconds for profile fetches
- Retry logic for transient failures

---

## Testing Checklist

- [ ] Create profile with all fields
- [ ] Create profile returns unique ID
- [ ] Get profile returns correct structure
- [ ] Get profile includes all platform stats
- [ ] Delete profile marks as inactive
- [ ] Delete non-existent profile returns 404
- [ ] Creating duplicate profile returns 400
- [ ] AI Assistant receives correct channel metadata
- [ ] AI Assistant shows platform stats in context
- [ ] Demo mode works without demo service (fallback)

---

## Environment Variables

**Backend** (`backend/.env`):
```bash
DEMO_SERVICE_URL=http://localhost:8001  # or production URL
DEMO_WEBHOOK_SECRET=your-secret-key     # for webhook authentication
```

**Demo Service** (if separate):
```bash
BACKEND_URL=http://localhost:8000
WEBHOOK_SECRET=your-secret-key
```

---

## Future Enhancements

1. **Custom Profiles** - Allow users to configure their demo profile
2. **Multiple Niches** - Support multi-niche creators
3. **Audience Demographics** - Age, location, interests data
4. **Competitor Data** - Simulated benchmark comparisons
5. **Revenue Metrics** - Monetization data for creator economy insights
6. **Growth Trends** - Historical growth patterns
7. **Engagement Analytics** - Time-of-day, content-type breakdowns
