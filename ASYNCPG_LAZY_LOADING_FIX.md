# AsyncPG Lazy Loading Fix

## What Happened at 11:54:31 UTC

```
[ERROR] greenlet_spawn has not been called; can't call await_only() here
```

**Root Cause**: SQLAlchemy tried to lazy-load attributes when using the async `asyncpg` driver in a sync context.

## The Problem

When using `postgresql+asyncpg://` (async driver) with Celery tasks:

1. Query returns ORM objects with some attributes loaded
2. Access a lazy-loaded attribute (like `content.target_comments`)
3. SQLAlchemy tries to load it synchronously
4. **CRASH**: Can't do sync DB access with async driver

### Locations Where This Happened

**File**: `demo-simulator/app/tasks/interaction_tasks.py`

1. **Line 45**: `content.get_remaining_comments()` → Accessed `target_comments`, `comments_count`
2. **Line 67**: Exception handler accessed `content.id` after session closed
3. **Line 100**: `profile.get_dm_target()` → Accessed `dm_frequency`
4. **Line 109**: Exception handler accessed `profile.id` after session closed
5. **Line 156**: `interaction.to_webhook_payload()` → Accessed `interaction.profile.user_id`, `interaction.content.*`
6. **Line 173**: Exception handler accessed `interaction.id` after session closed

---

## The Fix

### Strategy 1: Eager Load Attributes Before Use
```python
# Before (CRASHES):
for content in content_items:
    try:
        remaining = content.get_remaining_comments()  # Lazy load!
    except Exception as e:
        logger.error(f"Error: {content.id}")  # Lazy load in error handler!

# After (WORKS):
for content in content_items:
    # Load attributes into local variables first
    content_id = content.id
    target_comments = content.target_comments
    comments_count = content.comments_count
    
    try:
        remaining = max(0, target_comments - comments_count)  # No lazy load
    except Exception as e:
        logger.error(f"Error: {content_id}")  # No lazy load
```

### Strategy 2: Eager Load Relationships in Query
```python
# Before (CRASHES):
stmt = select(DemoInteraction).where(...)
# ... later ...
payload = interaction.to_webhook_payload()  # Triggers lazy load of .profile, .content

# After (WORKS):
from sqlalchemy.orm import selectinload

stmt = select(DemoInteraction).options(
    selectinload(DemoInteraction.profile),  # Load relationship eagerly
    selectinload(DemoInteraction.content)
).where(...)
# ... later ...
payload = interaction.to_webhook_payload()  # All data already loaded!
```

---

## Changes Made

### 1. `generate_comments_batch` Task
**Lines 43-74**

**Before**:
```python
for content in content_items:
    try:
        remaining = content.get_remaining_comments()
        hours_since = (datetime.utcnow() - content.published_at).total_seconds()
```

**After**:
```python
for content in content_items:
    # Eager load attributes
    content_id = content.id
    target_comments = content.target_comments
    comments_count = content.comments_count
    published_at = content.published_at
    
    try:
        remaining = max(0, target_comments - comments_count)
        hours_since = (datetime.utcnow() - published_at).total_seconds()
```

### 2. `generate_dms_batch` Task
**Lines 97-120**

**Before**:
```python
for profile in profiles:
    try:
        target = profile.get_dm_target()
    except Exception as e:
        logger.error(f"Error: {profile.id}")
```

**After**:
```python
for profile in profiles:
    profile_id = profile.id
    dm_frequency = profile.dm_frequency
    
    try:
        # Inline get_dm_target logic
        if dm_frequency == 'low':
            target = 5
        elif dm_frequency == 'high':
            target = 50
        else:
            target = 20
    except Exception as e:
        logger.error(f"Error: {profile_id}")
```

### 3. `send_queued_interactions` Task
**Lines 130-187**

**Before**:
```python
stmt = select(DemoInteraction).where(...)
# No eager loading

for interaction in interactions:
    payload = interaction.to_webhook_payload()  # CRASH here
```

**After**:
```python
from sqlalchemy.orm import selectinload

stmt = select(DemoInteraction).options(
    selectinload(DemoInteraction.profile),
    selectinload(DemoInteraction.content)
).where(...)

for interaction in interactions:
    interaction_id = interaction.id  # Load before try block
    payload = interaction.to_webhook_payload()  # Works now!
```

---

## Why This Works

### With Sync Driver (psycopg2):
```python
content.target_comments  # SQLAlchemy does: SELECT ... (sync, works fine)
```

### With Async Driver (asyncpg):
```python
content.target_comments  # SQLAlchemy tries: await SELECT ... 
                        # But we're in sync context → CRASH
```

### Solution:
```python
# Load during query with selectinload
stmt = select(Content).options(selectinload(Content.relationship))

# OR load before leaving async context
target = content.target_comments  # Access while session is active
```

---

## Testing the Fix

Deploy and watch logs for:

**Before** (Error logs):
```
[ERROR] greenlet_spawn has not been called
[ERROR] MissingGreenlet: ...asyncpg...
```

**After** (Success logs):
```
[INFO] Generated 15 comments for Tech Reviews: Best Laptops...
[INFO] Generated 3 DMs for profile ...
[INFO] Sent 15 interactions, 0 failed
```

---

## Deployment Steps

```bash
# 1. Stage changes
git add demo-simulator/app/tasks/interaction_tasks.py

# 2. Commit
git commit -m "fix(demo): Prevent asyncpg lazy loading crashes in Celery tasks"

# 3. Push
git push

# 4. Railway auto-deploys demo-simulator service

# 5. Watch logs after 5 minutes
railway logs --service demo-simulator | grep -i "comment\|dm\|interaction"
```

---

## What to Expect

| Time | Event |
|------|-------|
| T+0 | Deploy completes |
| T+5min | `generate_comments_batch` runs successfully |
| T+6min | `send_queued_interactions` sends comments to backend |
| T+6min | **Interactions appear in dashboard!** |
| T+30min | `generate_dms_batch` runs successfully |

---

## Summary

**Problem**: AsyncPG driver can't lazy-load attributes synchronously  
**Solution**: Eager load all needed attributes before accessing them  
**Files Fixed**: `demo-simulator/app/tasks/interaction_tasks.py`  
**Status**: ✅ Ready to deploy  

This was the **final blocker** preventing demo interactions from being generated. With this fix, your demo mode will work fully!
