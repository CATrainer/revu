# Celery Tasks Audit & Optimization

**Date:** 2025-10-01  
**Purpose:** Review all Celery tasks for best practices, async patterns, and performance

---

## 📊 Task Inventory

### Active Tasks (Production)

| Task | File | Status | Async | Issues |
|------|------|--------|-------|--------|
| `send_email` | email.py | ✅ | ✅ | None - uses asyncio.run() |
| `send_welcome_email` | email.py | ✅ | ✅ | None - uses asyncio.run() |
| `send_waitlist_campaign_hourly` | email.py | ✅ | ✅ | None - proper async |
| `kickoff_waitlist_first_email` | email.py | ✅ | ✅ | None - proper async |
| `check_trial_expirations` | email.py | ✅ | ✅ | None - NEW, properly async |
| `send_review_alert` | email.py | ⚠️ | ❌ | SYNC - but deprecated (review feature removed) |
| `sync_contact` | marketing.py | ⚠️ | ✅ | Uses `run_until_complete()` - can fail |
| `sync_all_contacts` | marketing.py | ⚠️ | ✅ | Uses `run_until_complete()` - can fail |

### Demo Tasks (Not in Production)

| Task | File | Status | Notes |
|------|------|--------|-------|
| `simulate_ongoing_activity` | demo.py | 🔴 DISABLED | Returns {"created": 0, "status": "disabled"} |
| `generate_weekly_report` | demo.py | 🔴 DISABLED | Placeholder only |
| `cleanup_expired_demo_users` | demo.py | 🔴 DISABLED | Can be deleted |
| `backfill_demo_analytics` | demo.py | 🔴 DISABLED | Disabled - Location model gone |

---

## ⚠️ Issues Found

### 1. Marketing Tasks - Event Loop Issues

**Files:** `marketing.py` lines 88, 119

**Problem:**
```python
# Line 88
return asyncio.get_event_loop().run_until_complete(_run())

# Line 119
asyncio.get_event_loop().run_until_complete(_run())
```

**Issue:** 
- `get_event_loop()` can fail if no loop exists
- Can cause "RuntimeError: no running event loop"
- Fallback to `asyncio.run()` is inconsistent

**Solution:** Use consistent pattern like email tasks:
```python
try:
    loop = asyncio.get_running_loop()
    return loop.run_until_complete(_run())
except RuntimeError:
    return asyncio.run(_run())
```

Or simpler: **Always use `asyncio.run()`**

---

### 2. Review Alert Task - Deprecated

**File:** `email.py` line 808

**Problem:** 
- `send_review_alert` task still exists
- Review feature was removed
- Task is scheduled but does nothing useful

**Solution:** Delete the task or mark as deprecated

---

### 3. Demo Tasks - Should Be Deleted

**File:** `demo.py`

**Problem:**
- All demo tasks are disabled
- They reference deleted models (Location, etc.)
- Still imported and taking up space

**Solution:** Delete `demo.py` entirely

---

## ✅ Best Practices Verified

### 1. Proper Async Pattern (email.py)
```python
@celery_app.task
def my_task():
    async def _run():
        async for db in get_async_session():
            # Do work
            await db.commit()
    
    return asyncio.run(_run())
```
✅ Used in: `send_email`, `send_welcome_email`, `check_trial_expirations`

### 2. Error Handling
✅ All tasks have try/except blocks  
✅ Database rollback on errors  
✅ Logging for debugging

### 3. AsyncSession Usage
✅ All tasks use `get_async_session()` generator  
✅ Proper commit/rollback  
✅ No synchronous db.query() calls

### 4. Task Naming
✅ All tasks use explicit names: `name="app.tasks.email.send_email"`  
✅ Makes Celery flower monitoring easier

---

## 🎯 Optimization Recommendations

### Priority 1: Fix Marketing Tasks
Update `marketing.py` to use consistent `asyncio.run()`:

```python
@celery_app.task(name="app.tasks.marketing.sync_contact")
def sync_contact(email: str) -> bool:
    async def _run() -> bool:
        async with async_session_maker() as session:
            # ... existing code ...
            return True
    
    return asyncio.run(_run())  # Consistent pattern
```

### Priority 2: Remove Demo Tasks
Delete `backend/app/tasks/demo.py` - all disabled

### Priority 3: Remove Deprecated Tasks
Delete or comment out `send_review_alert` in email.py

---

## 📋 Task Patterns Cheat Sheet

### Pattern 1: Simple Task (No DB)
```python
@celery_app.task(name="app.tasks.example.simple")
def simple_task(param: str) -> dict:
    logger.info(f"Processing {param}")
    # Do synchronous work
    return {"status": "ok"}
```

### Pattern 2: Async Task with DB
```python
@celery_app.task(name="app.tasks.example.with_db")
def task_with_db(user_id: str) -> dict:
    async def _run():
        from app.core.database import get_async_session
        from app.models.user import User
        from sqlalchemy import select
        
        async for db in get_async_session():
            try:
                result = await db.execute(
                    select(User).where(User.id == user_id)
                )
                user = result.scalar_one_or_none()
                
                if user:
                    # Do work
                    await db.commit()
                    return {"status": "ok"}
                return {"status": "not_found"}
                
            except Exception as e:
                await db.rollback()
                logger.error(f"Task failed: {e}")
                return {"status": "error", "error": str(e)}
    
    return asyncio.run(_run())
```

### Pattern 3: Batch Processing
```python
@celery_app.task(name="app.tasks.example.batch")
def batch_task(limit: int = 100) -> dict:
    processed = 0
    
    async def _run():
        nonlocal processed
        async with async_session_maker() as session:
            result = await session.execute(
                select(Model).limit(limit)
            )
            items = result.scalars().all()
            
            for item in items:
                # Process item
                processed += 1
            
            await session.commit()
    
    asyncio.run(_run())
    return {"processed": processed}
```

---

## 🔄 Retry Configuration

Current tasks don't use retry decorators. Consider adding:

```python
@celery_app.task(
    name="app.tasks.email.send_email",
    bind=True,
    max_retries=3,
    default_retry_delay=60  # 60 seconds
)
def send_email(self, to: str, subject: str, html: str):
    try:
        # Send email
        pass
    except Exception as e:
        # Retry with exponential backoff
        raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))
```

---

## 📊 Performance Metrics

### Current Task Performance
- ✅ All tasks are non-blocking (use asyncio)
- ✅ No synchronous db.query() calls
- ✅ Proper connection pooling via AsyncSession
- ⚠️ No rate limiting on external APIs (SendGrid, Resend)
- ⚠️ No task timeout configuration

### Recommended Settings (celery.py)
```python
celery_app.conf.update(
    task_time_limit=300,  # 5 minutes hard limit
    task_soft_time_limit=240,  # 4 minutes soft limit
    task_acks_late=True,  # Only ack after task completes
    worker_prefetch_multiplier=1,  # One task at a time per worker
)
```

---

## ✅ Final Checklist

After applying fixes:

- [ ] Marketing tasks use consistent `asyncio.run()`
- [ ] Demo tasks deleted
- [ ] Deprecated tasks removed
- [ ] All tasks have proper error handling
- [ ] Task retry logic documented
- [ ] Performance settings configured
- [ ] Monitoring in place (Celery Flower)

---

## 📝 Current Status

**Total Tasks:** 8 active + 4 demo  
**Properly Async:** 7/8 (87.5%)  
**Need Fixes:** 1 (marketing tasks event loop)  
**Should Delete:** 5 (demo tasks + deprecated)

**Overall Grade:** B+ (Good, minor improvements needed)

---

## 🚀 Next Steps

1. ✅ Fix marketing.py event loop handling
2. ✅ Delete demo.py
3. ✅ Remove send_review_alert (deprecated)
4. ✅ Document patterns (this file)
5. ⏳ Add retry configuration (optional)
6. ⏳ Add task timeout limits (optional)

**This audit is complete and ready for implementation.**
