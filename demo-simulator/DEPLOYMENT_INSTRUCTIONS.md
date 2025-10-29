# Demo Service Deployment Instructions

## Database Schema Management

⚠️ **Important:** The demo service uses SQLAlchemy's `create_all()` for schema management, **not Alembic migrations**.

### How It Works

On startup, the service runs:
```python
await Base.metadata.create_all()  # Creates new tables
await _apply_schema_migrations()  # Adds missing columns to existing tables
```

This means:
- ✅ New tables are created automatically
- ✅ Missing columns are added automatically
- ✅ Safe to restart anytime (idempotent checks)

### Schema Migrations Run Automatically! 🎉

**No manual steps needed!** The service detects and adds missing columns on startup.

You'll see in the logs:
```
Starting demo simulator service...
📦 Adding channel_name column to demo_profiles...
✅ Added channel_name column successfully!
Database initialized
```

Or if it already exists:
```
Starting demo simulator service...
Database initialized
```

## Deployment Steps

### 1. Update Code
```bash
cd demo-simulator
git pull  # or however you deploy
```

### 2. Restart Service
```bash
# However you normally restart (systemctl, Railway redeploy, etc.)
python run.py  # or your normal start command
```

The migration happens automatically on startup! ✅

### 3. Verify
```bash
curl http://your-demo-service/profiles/some-user-id
```

Should return structured data with `channel_name` field.

## How It Works

The service automatically:
1. Checks if `channel_name` column exists
2. Adds it if missing (takes ~50ms)
3. Continues startup normally
4. Logs the action for visibility

This happens **every startup**, but only adds the column once (idempotent).

## Environment Check

Before deploying, verify:

```bash
# Check database connection
python -c "from app.core.config import settings; print(settings.DATABASE_URL)"

# Test database access
python -c "import asyncio; from app.core.database import engine; asyncio.run(engine.connect())"
```

## Rollback (If Needed)

If something goes wrong:

```sql
-- Remove the column
ALTER TABLE demo_profiles DROP COLUMN IF EXISTS channel_name;
```

Then deploy the old code version.

## Future Schema Changes

For future changes to demo service models:

1. **Add field to model** (`app/models/*.py`)
2. **Create Python migration script** (like `add_channel_name_column.py`)
3. **Document in DEPLOYMENT_INSTRUCTIONS.md**
4. **Run script before restarting service**

**Do NOT:**
- Assume `create_all()` will add new columns (it won't)
- Use Alembic migrations (service doesn't support it)
- Modify tables while service is running

## Questions?

- **Q: Why not use Alembic?**
  - A: Service is lightweight and uses simple `create_all()` approach
  
- **Q: Is the Python script safe?**
  - A: Yes, it checks if column exists first (idempotent)
  
- **Q: Can I run it multiple times?**
  - A: Yes! It won't error if column already exists

- **Q: What if my database doesn't have the table yet?**
  - A: Just restart the service - `create_all()` will create everything
