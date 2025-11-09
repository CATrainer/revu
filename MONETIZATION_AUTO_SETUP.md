# Monetization Engine - Intelligent Auto-Setup

## Overview

The monetization engine now features **intelligent auto-setup** that eliminates manual form entry by detecting and using existing user data.

## How It Works

### 1. **Auto-Detection on Page Load**

When a user visits `/monetization/setup`, the system:

1. Calls `/api/v1/monetization/profile/auto-detect`
2. Checks user's demo mode status
3. Searches for connected platforms (YouTube, Instagram)
4. Builds profile data from available sources

### 2. **Data Source Priority**

```
Demo Mode (if enabled)
  ↓
YouTube Connection (if exists)
  ↓
Instagram Connection (if exists)
  ↓
Manual Entry (fallback)
```

### 3. **Smart Form Rendering**

- **All data available**: Auto-creates profile immediately, redirects to `/monetization`
- **Partial data**: Shows only missing required fields
- **No data**: Shows full form

## Data Sources

### Demo Mode
When user has demo mode enabled:
```json
{
  "primary_platform": "youtube",
  "follower_count": 100000,
  "engagement_rate": 6.5,
  "niche": "Tech Reviews",
  "platform_url": "https://youtube.com/@democreator",
  "avg_content_views": 50000,
  "content_frequency": 3,
  "time_available_hours_per_week": 10
}
```

### YouTube Connection
From `youtube_connections` table:
- `primary_platform`: "youtube"
- `follower_count`: `subscriber_count`
- `engagement_rate`: `engagement_rate`
- `platform_url`: Constructed from `channel_id`
- `avg_content_views`: `average_views_per_video`

### Instagram Connection
From `instagram_connections` table:
- `primary_platform`: "instagram"
- `follower_count`: `follower_count`
- `platform_url`: Constructed from `username`

## Required Fields

The system requires these 4 fields minimum:
1. `primary_platform`
2. `follower_count`
3. `engagement_rate`
4. `niche`

**Note**: `niche` is always requested as it cannot be reliably auto-detected.

## Demo Mode Integration

### When Demo Mode is Disabled

The system automatically:
1. Calls `/api/v1/monetization/profile/reset`
2. Deletes `CreatorProfile` record
3. Deletes `ActiveProject` record (cascades to messages, tasks, decisions)
4. User must re-setup when visiting monetization next time

This ensures demo data doesn't pollute real monetization planning.

## API Endpoints

### GET `/api/v1/monetization/profile/auto-detect`

**Response:**
```json
{
  "data_source": "demo" | "youtube" | "instagram" | null,
  "is_demo": boolean,
  "profile_data": {
    "primary_platform": string | null,
    "follower_count": number | null,
    "engagement_rate": number | null,
    "niche": string | null,
    "platform_url": string | null,
    "avg_content_views": number | null,
    "content_frequency": number | null,
    "time_available_hours_per_week": number | null
  },
  "missing_fields": string[],
  "can_auto_create": boolean
}
```

### DELETE `/api/v1/monetization/profile/reset`

Deletes all monetization data for the user.

**Response:**
```json
{
  "success": true,
  "message": "Monetization setup has been reset"
}
```

## User Experience

### Scenario 1: Demo Mode User
1. User visits `/monetization/setup`
2. Page shows "Detecting your profile data..."
3. Auto-detects demo data (all fields populated)
4. Shows "Profile Created! Using data from demo..."
5. Redirects to `/monetization` immediately

**User sees no form** ✨

### Scenario 2: YouTube Connected
1. User visits `/monetization/setup`
2. Auto-detects YouTube data
3. Shows alert: "Auto-filled from your youtube connection"
4. Only shows "Niche" field (missing)
5. User enters niche, clicks "Complete Setup & Continue"

**User fills 1 field instead of 8** ✨

### Scenario 3: No Data
1. User visits `/monetization/setup`
2. No data detected
3. Shows full form
4. User fills all required fields

**Standard experience**

### Scenario 4: Demo Mode Disabled
1. User disables demo mode in settings
2. System resets monetization profile
3. Next visit to `/monetization` shows "Get Started" button
4. Clicking redirects to `/monetization/setup`
5. If they have real platform connected, auto-fills from that
6. Otherwise, shows full form

## Benefits

1. **Faster onboarding**: Demo users get instant setup
2. **Less friction**: Real users only fill missing data
3. **Data accuracy**: Uses actual platform metrics
4. **Clean transitions**: Demo → Real data handled automatically
5. **No duplicate work**: Reuses existing connections

## Technical Implementation

### Backend
- `app/api/v1/endpoints/monetization.py`: Auto-detect and reset endpoints
- Models: `YouTubeConnection`, `InstagramConnection`, `CreatorProfile`

### Frontend
- `app/(dashboard)/monetization/setup/page.tsx`: Intelligent form
- `lib/monetization-api.ts`: API client functions
- `app/(dashboard)/settings/demo-mode/page.tsx`: Reset integration

## Future Enhancements

1. **TikTok/Twitch support**: Add more platform connections
2. **Niche detection**: Use AI to suggest niche from content
3. **Engagement calculation**: Auto-calculate from recent posts
4. **Multi-platform**: Combine data from multiple platforms
5. **Profile refresh**: Re-sync data periodically
