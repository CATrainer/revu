# Database Schema Design for Production Architecture

## Current State Problems

### User Table Issues

**Redundant/Conflicting Fields:**
```python
# user.py
class User(Base):
    # BOTH old and new approval fields
    access_status = Column(String(20), default="pending")  # Legacy
    approval_status = Column(PG_ENUM(...), default='pending')  # New
    
    # Demo mode stored as simple boolean
    demo_mode = Column(Boolean, default=False)  # Not enough!
    demo_mode_enabled_at = Column(DateTime)
    
    # Marketing noise
    countdown_t14_sent_at = Column(DateTime)
    countdown_t7_sent_at = Column(DateTime)
    # ... etc
```

**Problems:**
1. Two approval systems (`access_status` and `approval_status`)
2. No state tracking for async operations (demo enabling, OAuth connecting)
3. Marketing campaign fields pollute user model
4. No proper state machine for user lifecycle

### Missing State Tracking

**Demo Mode Needs:**
- Current status: disabled, enabling, enabled, disabling, failed
- Error messages if failed
- Link to demo profile ID
- Timestamps for each state transition

**Platform Connections Need:**
- Connection status: disconnected, connecting, connected, refreshing, failed
- OAuth state tracking
- Token refresh status
- Last sync timestamp

**User Operations Need:**
- Background job IDs
- Operation status tracking
- Failure reasons

---

## Proposed Schema Changes

### 1. User Table Cleanup

```sql
-- Remove redundant fields, keep only what's needed
ALTER TABLE users DROP COLUMN IF EXISTS access_status;  -- Use approval_status
ALTER TABLE users DROP COLUMN IF EXISTS user_kind;  -- Use account_type
ALTER TABLE users DROP COLUMN IF EXISTS countdown_t14_sent_at;  -- Move to marketing table
ALTER TABLE users DROP COLUMN IF EXISTS countdown_t7_sent_at;
ALTER TABLE users DROP COLUMN IF EXISTS countdown_t1_sent_at;
ALTER TABLE users DROP COLUMN IF EXISTS launch_sent_at;
ALTER TABLE users DROP COLUMN IF EXISTS marketing_opt_in;  -- Move to marketing table
ALTER TABLE users DROP COLUMN IF EXISTS marketing_opt_in_at;
ALTER TABLE users DROP COLUMN IF EXISTS marketing_unsubscribed_at;
ALTER TABLE users DROP COLUMN IF EXISTS marketing_bounced_at;
ALTER TABLE users DROP COLUMN IF EXISTS marketing_last_event;
ALTER TABLE users DROP COLUMN IF EXISTS marketing_last_event_at;

-- Replace simple demo_mode boolean with proper state tracking
ALTER TABLE users DROP COLUMN IF EXISTS demo_mode;
ALTER TABLE users ADD COLUMN demo_mode_status VARCHAR(20) DEFAULT 'disabled' NOT NULL;
ALTER TABLE users ADD COLUMN demo_mode_error TEXT;
ALTER TABLE users ADD COLUMN demo_profile_id UUID;
ALTER TABLE users ADD COLUMN demo_mode_disabled_at TIMESTAMP WITH TIME ZONE;

-- Add constraints
ALTER TABLE users ADD CONSTRAINT demo_mode_status_check 
  CHECK (demo_mode_status IN ('disabled', 'enabling', 'enabled', 'disabling', 'failed'));
```

**Updated User Fields:**
```python
class User(Base):
    # Core identity
    id = Column(UUID, primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    full_name = Column(String(255))
    hashed_password = Column(String(255))
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    
    # Account lifecycle (simplified)
    account_type = Column(ENUM('creator', 'agency', 'legacy'))
    approval_status = Column(ENUM('pending', 'approved', 'rejected'), default='pending')
    application_submitted_at = Column(DateTime(timezone=True))
    approved_at = Column(DateTime(timezone=True))
    approved_by = Column(UUID, ForeignKey('users.id'))
    rejected_at = Column(DateTime(timezone=True))
    rejected_by = Column(UUID, ForeignKey('users.id'))
    rejection_reason = Column(Text)
    
    # Demo mode with proper state tracking
    demo_mode_status = Column(String(20), default='disabled', nullable=False)
    demo_mode_enabled_at = Column(DateTime(timezone=True))
    demo_mode_disabled_at = Column(DateTime(timezone=True))
    demo_mode_error = Column(Text)
    demo_profile_id = Column(UUID)  # Link to demo service profile
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), onupdate=datetime.utcnow)
    last_login_at = Column(DateTime(timezone=True))
    
    # Organization relationship
    organization_id = Column(UUID, ForeignKey('organizations.id'))
```

### 2. Platform Connection State Machine

```sql
-- Add state tracking to platform_connections
ALTER TABLE platform_connections ADD COLUMN connection_status VARCHAR(20) DEFAULT 'disconnected' NOT NULL;
ALTER TABLE platform_connections ADD COLUMN connection_error TEXT;
ALTER TABLE platform_connections ADD COLUMN oauth_state VARCHAR(255);  -- For OAuth flow
ALTER TABLE platform_connections ADD COLUMN last_token_refresh_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE platform_connections ADD COLUMN next_token_refresh_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE platform_connections ADD CONSTRAINT connection_status_check 
  CHECK (connection_status IN ('disconnected', 'connecting', 'connected', 'refreshing', 'failed'));
```

**Updated Model:**
```python
class PlatformConnection(Base):
    id = Column(UUID, primary_key=True)
    location_id = Column(UUID, ForeignKey('locations.id'))
    platform = Column(String(50), nullable=False)
    
    # Connection state machine
    connection_status = Column(String(20), default='disconnected', nullable=False)
    connection_error = Column(Text)
    
    # OAuth data
    oauth_state = Column(String(255))  # CSRF protection
    access_token = Column(Text)
    refresh_token = Column(Text)
    token_expires_at = Column(DateTime(timezone=True))
    last_token_refresh_at = Column(DateTime(timezone=True))
    next_token_refresh_at = Column(DateTime(timezone=True))
    
    # Platform account info
    account_info = Column(JSONB, default=dict)
    is_active = Column(Boolean, default=True)
    last_sync_at = Column(DateTime(timezone=True))
    
    # Timestamps
    created_at = Column(DateTime(timezone=True))
    updated_at = Column(DateTime(timezone=True))
```

### 3. Background Jobs Table (NEW)

```sql
CREATE TABLE background_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type VARCHAR(50) NOT NULL,  -- 'demo_enable', 'demo_disable', 'oauth_connect', etc.
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    error_details JSONB,
    result_data JSONB,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    CONSTRAINT job_status_check CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled'))
);

CREATE INDEX idx_background_jobs_user_id ON background_jobs(user_id);
CREATE INDEX idx_background_jobs_status ON background_jobs(status);
CREATE INDEX idx_background_jobs_created_at ON background_jobs(created_at);
```

**Model:**
```python
class BackgroundJob(Base):
    __tablename__ = "background_jobs"
    
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    job_type = Column(String(50), nullable=False)
    user_id = Column(UUID, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    
    status = Column(String(20), default='pending', nullable=False)
    
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    failed_at = Column(DateTime(timezone=True))
    
    error_message = Column(Text)
    error_details = Column(JSONB)
    result_data = Column(JSONB)
    
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    
    user = relationship("User", back_populates="background_jobs")
```

### 4. Marketing Campaigns Table (NEW)

Move marketing fields out of users table:

```sql
CREATE TABLE marketing_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Opt-in status
    opted_in BOOLEAN DEFAULT TRUE,
    opted_in_at TIMESTAMP WITH TIME ZONE,
    unsubscribed_at TIMESTAMP WITH TIME ZONE,
    
    -- Deliverability tracking
    bounced_at TIMESTAMP WITH TIME ZONE,
    last_event VARCHAR(32),
    last_event_at TIMESTAMP WITH TIME ZONE,
    
    -- Campaign sends
    countdown_t14_sent_at TIMESTAMP WITH TIME ZONE,
    countdown_t7_sent_at TIMESTAMP WITH TIME ZONE,
    countdown_t1_sent_at TIMESTAMP WITH TIME ZONE,
    launch_sent_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_marketing_campaigns_user_id ON marketing_campaigns(user_id);
```

### 5. Session Storage Table (NEW)

For proper session management instead of localStorage:

```sql
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    refresh_token VARCHAR(255) NOT NULL UNIQUE,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_accessed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    ip_address INET,
    user_agent TEXT,
    
    is_valid BOOLEAN DEFAULT TRUE,
    revoked_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_session_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
```

---

## Migration Strategy

### Phase 1: Add New Fields (Non-Breaking)
```sql
-- Add new fields without dropping old ones
ALTER TABLE users ADD COLUMN IF NOT EXISTS demo_mode_status VARCHAR(20) DEFAULT 'disabled';
ALTER TABLE users ADD COLUMN IF NOT EXISTS demo_mode_error TEXT;

-- Migrate existing data
UPDATE users 
SET demo_mode_status = CASE 
    WHEN demo_mode = TRUE THEN 'enabled'
    ELSE 'disabled'
END;
```

### Phase 2: Create New Tables
```sql
-- Create background_jobs table
CREATE TABLE background_jobs (...);

-- Create marketing_campaigns table and migrate data
CREATE TABLE marketing_campaigns (...);

INSERT INTO marketing_campaigns (user_id, opted_in, opted_in_at, ...)
SELECT id, marketing_opt_in, marketing_opt_in_at, ...
FROM users;
```

### Phase 3: Update Application Code
- Update models to use new fields
- Update API endpoints to check new status fields
- Add background job creation/polling

### Phase 4: Remove Old Fields (Breaking)
```sql
-- After confirming everything works
ALTER TABLE users DROP COLUMN demo_mode;
ALTER TABLE users DROP COLUMN marketing_opt_in;
-- etc.
```

---

## State Machine Definitions

### Demo Mode States

```
disabled → enabling → enabled
                ↓
              failed
                ↓
             disabled

enabled → disabling → disabled
              ↓
            failed
              ↓
           enabled
```

**Transitions:**
- `disabled → enabling`: User clicks "Enable Demo", job created
- `enabling → enabled`: Demo service completes, webhooks success
- `enabling → failed`: Demo service errors, timeout, or webhook fails
- `failed → disabled`: User acknowledges error, clears state
- `enabled → disabling`: User clicks "Disable Demo", cleanup job created
- `disabling → disabled`: Cleanup completes successfully
- `disabling → failed`: Cleanup errors
- `failed → enabled`: Retry succeeds (or user forces back to enabled)

### Platform Connection States

```
disconnected → connecting → connected
                   ↓
                 failed
                   ↓
              disconnected

connected → refreshing → connected
               ↓
             failed
               ↓
          disconnected
```

### Background Job States

```
pending → running → completed
            ↓
          failed
            ↓
       pending (retry)
            ↓
       failed (max retries)
```

