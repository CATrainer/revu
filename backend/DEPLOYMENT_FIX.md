# Railway Migration Timeout Fix

## Problem
Connection timeout to Supabase during Alembic migrations on Railway deployment.

## Root Cause
Network connectivity issue between Railway and Supabase pooler endpoint.

## Solutions Applied

### 1. Added Connection Timeouts (✅ Done)
- Modified `alembic/env.py` to add 10s connection timeout
- Added 30s statement timeout for long-running migrations

### 2. Added Retry Logic (✅ Done)
- Modified `run.py` to retry migrations 3 times with 5s delays
- Added 60s timeout per attempt

### 3. Railway Configuration (⚠️ Action Required)

#### Option A: Use Direct Connection (Recommended)
In Railway environment variables, change DATABASE_URL from:
```
postgresql://...@aws-0-eu-north-1.pooler.supabase.com:5432/postgres
```

To direct connection (get from Supabase Dashboard → Settings → Database → Connection String → Direct):
```
postgresql://...@db.[project-ref].supabase.co:5432/postgres
```

#### Option B: Use Transaction Mode Pooler
If using pooler, ensure it's in **Transaction mode**, not Session mode:
```
postgresql://...@aws-0-eu-north-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```
Note: Port 6543 for transaction mode, 5432 for session mode

#### Option C: Disable IPv6
Add to DATABASE_URL:
```
postgresql://...?options=-c%20client_encoding=UTF8&sslmode=require
```

### 4. Supabase Configuration (⚠️ Action Required)

1. Go to Supabase Dashboard → Settings → Database
2. Verify **Connection Pooling** is enabled
3. Check **Network Restrictions** - ensure Railway IPs aren't blocked
4. Consider enabling **IPv4 Add-on** if using IPv6

### 5. Railway Region Optimization

Current setup:
- Supabase: `eu-north-1` (Stockholm)
- Railway: Check current region

**Action**: Deploy Railway service to closest region to reduce latency.

## Testing

After applying fixes, monitor Railway logs for:
```
Migration attempt 1/3...
✅ Migrations completed successfully
```

## Fallback: Skip Migrations on Deploy

If issues persist, you can skip migrations during deploy and run them manually:

1. Comment out migration call in `run.py`:
```python
if __name__ == "__main__":
    # run_migrations()  # Skip for now
    import uvicorn
    ...
```

2. Run migrations manually via Railway CLI:
```bash
railway run alembic upgrade head
```

## Monitoring

Check Railway logs for:
- Connection timeout errors
- Retry attempts
- Migration success/failure

Check Supabase logs for:
- Connection attempts from Railway IPs
- Authentication failures
- Query timeouts
