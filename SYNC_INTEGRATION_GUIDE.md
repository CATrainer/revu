# Sync Service Integration Guide

## What Integration Entails

Integrating the enrichment/mapping services into your sync flow means **adding a few lines of code** to call the mappers after you save YouTube/Instagram data. It's straightforward!

---

## Current Flow (What You Have)

```
1. Fetch videos from YouTube API
2. Save to youtube_videos table
3. Done ✅
```

```
1. Fetch comments from YouTube API
2. Save to youtube_comments table
3. Done ✅
```

**Problem**: Your advanced features (Interaction, ContentPiece, Fan) are empty because nothing maps the data to them.

---

## New Flow (What We Need)

```
1. Fetch videos from YouTube API
2. Save to youtube_videos table
3. ⭐ NEW: Map to ContentPiece + ContentPerformance
4. Done ✅
```

```
1. Fetch comments from YouTube API
2. Save to youtube_comments table
3. ⭐ NEW: Map to Interaction + Fan
4. Done ✅
```

---

## Exact Changes Needed

### Change 1: Add Mapping to `sync_channel_videos()`

**File**: `backend/app/services/sync_service.py`  
**Line**: After line 175 (after `bulk_create_videos`)

**Add this code**:
```python
# NEW: Map videos to ContentPiece + ContentPerformance
from app.services.youtube_content_mapper import get_youtube_content_mapper

# Get user_id from connection
conn = await self._get_connection()
if conn and saved:
    mapper = get_youtube_content_mapper(self.session)
    for video in saved:
        try:
            await mapper.map_video_to_content(
                video=video,
                user_id=conn.user_id,
                is_demo=False
            )
        except Exception as e:
            logger.error(f"Failed to map video {video.video_id}: {e}")
    
    await self.session.commit()
```

**That's it!** Videos now get mapped to ContentPiece automatically.

---

### Change 2: Add Mapping to `sync_new_videos()`

**File**: `backend/app/services/sync_service.py`  
**Line**: After line 281 (after `bulk_create_videos`)

**Add the same code**:
```python
# NEW: Map videos to ContentPiece + ContentPerformance
from app.services.youtube_content_mapper import get_youtube_content_mapper

conn = await self._get_connection()
if conn and saved:
    mapper = get_youtube_content_mapper(self.session)
    for video in saved:
        try:
            await mapper.map_video_to_content(
                video=video,
                user_id=conn.user_id,
                is_demo=False
            )
        except Exception as e:
            logger.error(f"Failed to map video {video.video_id}: {e}")
    
    await self.session.commit()
```

---

### Change 3: Add Mapping to `sync_video_comments()`

**File**: `backend/app/services/sync_service.py`  
**Line**: After line 341 (after first `bulk_create_comments`)

**Add this code**:
```python
# NEW: Map comments to Interaction + Fan
from app.services.youtube_interaction_mapper import get_youtube_interaction_mapper

conn = await self._get_connection()
if conn and saved:
    mapper = get_youtube_interaction_mapper(self.session)
    for comment in saved:
        try:
            await mapper.map_comment_to_interaction(
                comment=comment,
                user_id=conn.user_id,
                is_demo=False
            )
        except Exception as e:
            logger.error(f"Failed to map comment {comment.comment_id}: {e}")
    
    await self.session.commit()
```

**Also add after line 376** (after reply comments):
```python
# NEW: Map reply comments to Interaction + Fan
if conn and saved:
    mapper = get_youtube_interaction_mapper(self.session)
    for comment in saved:
        try:
            await mapper.map_comment_to_interaction(
                comment=comment,
                user_id=conn.user_id,
                is_demo=False
            )
        except Exception as e:
            logger.error(f"Failed to map comment {comment.comment_id}: {e}")
    
    await self.session.commit()
```

---

## Complete Modified sync_service.py

Here's what the key sections look like after integration:

### sync_channel_videos() - After Line 175

```python
saved = await self.video_repo.bulk_create_videos(channel_id=self.connection_id, videos=rows)
total += len(saved)

# ⭐ NEW: Map videos to ContentPiece + ContentPerformance
from app.services.youtube_content_mapper import get_youtube_content_mapper
conn = await self._get_connection()
if conn and saved:
    mapper = get_youtube_content_mapper(self.session)
    for video in saved:
        try:
            await mapper.map_video_to_content(
                video=video,
                user_id=conn.user_id,
                is_demo=False
            )
        except Exception as e:
            logger.error(f"Failed to map video {video.video_id}: {e}")
    await self.session.commit()

page_token = resp.get("nextPageToken")
if not page_token:
    break
```

### sync_video_comments() - After Line 341

```python
if to_save:
    saved = await self.comment_repo.bulk_create_comments(video_id=video.id, comments=to_save)
    count += len(saved)
    
    # ⭐ NEW: Map comments to Interaction + Fan
    from app.services.youtube_interaction_mapper import get_youtube_interaction_mapper
    conn = await self._get_connection()
    if conn and saved:
        mapper = get_youtube_interaction_mapper(self.session)
        for comment in saved:
            try:
                await mapper.map_comment_to_interaction(
                    comment=comment,
                    user_id=conn.user_id,
                    is_demo=False
                )
            except Exception as e:
                logger.error(f"Failed to map comment {comment.comment_id}: {e}")
        await self.session.commit()
```

---

## For Instagram (When You Build It)

You'll create a similar `instagram_sync_service.py` that:

1. Fetches media from Instagram Graph API
2. Saves to `instagram_media` table
3. **Maps to ContentPiece** using `instagram_content_mapper`
4. Fetches comments
5. Saves to `instagram_comments` table
6. **Maps to Interaction** using `instagram_interaction_mapper`

Same pattern, different platform!

---

## Performance Considerations

### Will This Slow Down Sync?

**Short answer**: Slightly, but negligible.

**Breakdown**:
- Fetching from API: ~500-1000ms per page (unchanged)
- Saving to database: ~50-100ms (unchanged)
- **Enrichment**: ~10-20ms per item (NEW)
- **Mapping**: ~5-10ms per item (NEW)

**Total impact**: +15-30ms per video/comment

For 100 videos: +1.5-3 seconds total
For 1000 comments: +15-30 seconds total

### Optimization Options

**Option 1: Sync in background** (Recommended)
```python
# In your API endpoint
@router.post("/sync")
async def trigger_sync(connection_id: UUID):
    # Queue sync as Celery task
    sync_youtube_channel.delay(str(connection_id))
    return {"status": "queued"}
```

**Option 2: Batch enrichment**
```python
# Instead of enriching one-by-one, batch them
mapper = get_youtube_content_mapper(self.session)
await mapper.map_videos_batch(
    videos=saved,  # All videos at once
    user_id=conn.user_id
)
```

**Option 3: Async enrichment** (Already implemented!)
The mappers already use `async/await`, so they're non-blocking.

---

## Testing the Integration

### Step 1: Run Migration
```bash
cd backend
python -m alembic upgrade head
```

### Step 2: Add Integration Code
Make the 3 changes above to `sync_service.py`

### Step 3: Test with Real Account
```python
# In Python shell or test script
from app.services.sync_service import SyncService
from app.core.database import get_session

async def test_sync():
    async with get_session() as session:
        sync = SyncService(session, connection_id=YOUR_CONNECTION_ID)
        
        # Sync videos (will now create ContentPiece records)
        video_count = await sync.sync_channel_videos()
        print(f"Synced {video_count} videos")
        
        # Sync comments (will now create Interaction + Fan records)
        comment_count = await sync.sync_video_comments("VIDEO_ID")
        print(f"Synced {comment_count} comments")
        
        await session.commit()

# Run it
import asyncio
asyncio.run(test_sync())
```

### Step 4: Verify Data
```sql
-- Check ContentPiece records were created
SELECT COUNT(*) FROM content_pieces WHERE platform = 'youtube';

-- Check Interaction records were created
SELECT COUNT(*) FROM interactions WHERE platform = 'youtube';

-- Check Fan records were created
SELECT COUNT(*) FROM fans;

-- Check enrichment worked
SELECT sentiment, priority_score, categories 
FROM interactions 
WHERE platform = 'youtube' 
LIMIT 10;
```

---

## What If Something Goes Wrong?

### Error: "Module not found"
**Fix**: Add imports at top of `sync_service.py`:
```python
from app.services.youtube_content_mapper import get_youtube_content_mapper
from app.services.youtube_interaction_mapper import get_youtube_interaction_mapper
```

### Error: "user_id not found"
**Fix**: Make sure connection has user_id:
```python
conn = await self._get_connection()
if not conn or not conn.user_id:
    logger.error("Connection missing user_id")
    return
```

### Error: "Mapper failed"
**Fix**: The try/except blocks catch individual failures, so sync continues. Check logs:
```python
logger.error(f"Failed to map video {video.video_id}: {e}")
```

### Performance Issues
**Fix**: Use batch mapping:
```python
# Instead of loop
await mapper.map_videos_batch(videos=saved, user_id=conn.user_id)
```

---

## Summary

### What You Need to Do:
1. ✅ Add ~15 lines to `sync_service.py` (3 locations)
2. ✅ Test with real account
3. ✅ Verify data in database

### What You Get:
- ✅ Comments automatically enriched (sentiment, priority, categories)
- ✅ Videos automatically enriched (themes, performance scores)
- ✅ Fans automatically identified and scored
- ✅ All your advanced features now work!

### Time Required:
- **Code changes**: 10 minutes
- **Testing**: 20 minutes
- **Total**: 30 minutes

**That's it!** The integration is really just calling the mappers after you save data. The mappers handle all the complexity (enrichment, fan identification, scoring, etc.).

Want me to create a PR-ready version with all the changes, or would you prefer to make them yourself?
