# Phase 0: Database Audit & Cleanup Report
## Repruv Application-Based Signup Flow - Pre-Implementation Analysis

**Date:** October 24, 2025  
**Status:** PENDING APPROVAL  
**Priority:** CRITICAL - Blocking new signup flow implementation

---

## Executive Summary

The current user management system has undergone multiple iterations, resulting in accumulated technical debt and inconsistent naming. Before implementing the application-based signup flow, we need to clean up the schema to:

1. **Remove redundant/unused fields** from multiple refactorings
2. **Establish clear naming conventions** for the new workflow
3. **Add proper indexes** for performance
4. **Create new tables** for application management
5. **Ensure existing users aren't broken** during migration

**Migration Risk:** MEDIUM - We have existing users that must not be broken. Careful migration planning required.

---

## Current State Analysis

### 1. Users Table - Current Schema

**Location:** `backend/app/models/user.py`

#### Fields Overview (149 lines)

**Core Identity Fields** ✅ (Keep as-is)
- `id` (UUID, PK)
- `email` (String, unique, indexed)
- `full_name` (String)
- `phone` (String, nullable)
- `company_name` (String, nullable)
- `industry` (String, nullable)
- `hashed_password` (String)
- `auth_id` (String, unique) - Supabase Auth ID
- `is_active` (Boolean)
- `is_admin` (Boolean)
- `last_login_at` (DateTime)
- `created_at` (DateTime) - From Base
- `updated_at` (DateTime) - From Base

**Access Control Fields** ⚠️ (Needs Rationalization)
- `has_account` (Boolean) - Flag for waitlist vs full account
- `access_status` (String: "waiting" | "full") - Current access level
- `user_kind` (String: "content" | "business") - User category
- `joined_waiting_list_at` (DateTime)
- `early_access_granted_at` (DateTime)

**Demo Tracking Fields** ⚠️ (Conflates multiple features)
- `demo_requested` (Boolean)
- `demo_requested_at` (DateTime)
- `demo_scheduled_at` (DateTime)
- `demo_completed` (Boolean)
- `demo_completed_at` (DateTime)
- `demo_prep_notes` (Text) - Admin notes
- `follow_up_reminders` (Text) - Admin notes
- `user_qualification_notes` (Text) - Admin notes
- `company_size` (String) - Demo-specific
- `current_solution` (String) - Demo-specific

**Marketing Campaign Fields** ⚠️ (Legacy waitlist campaign tracking)
- `marketing_opt_in` (Boolean)
- `marketing_opt_in_at` (DateTime)
- `marketing_unsubscribed_at` (DateTime)
- `marketing_bounced_at` (DateTime)
- `marketing_last_event` (String)
- `marketing_last_event_at` (DateTime)
- `countdown_t14_sent_at` (DateTime) - Waitlist campaign email
- `countdown_t7_sent_at` (DateTime) - Waitlist campaign email
- `countdown_t1_sent_at` (DateTime) - Waitlist campaign email
- `launch_sent_at` (DateTime) - Waitlist campaign email

**Trial/Subscription Fields** ⚠️ (Feature planned but not fully implemented)
- `trial_start_date` (DateTime)
- `trial_end_date` (DateTime)
- `trial_notified_7d` (Boolean)
- `trial_notified_3d` (Boolean)
- `trial_notified_1d` (Boolean)
- `subscription_status` (String: "trial" | "active" | "cancelled" | "expired")

**Demo Mode Fields** ⚠️ (For demo simulator, separate concern)
- `demo_mode` (Boolean) - Using simulator vs real platforms
- `demo_mode_enabled_at` (DateTime)

**Relationships** ✅ (Generally clean)
- `organization_id` (FK to organizations)
- Multiple relationships to other tables (audit_logs, templates, automation_rules, etc.)

### 2. Related Tables

#### Organization Table ✅
**Location:** `backend/app/models/organization.py`  
**Status:** Clean, well-structured  
**Relationships:** Properly bidirectional with AuditLog fixed (per memory)

#### AuditLog Table ✅
**Location:** `backend/app/models/audit.py`  
**Status:** Clean, relationships fixed (per memory)

### 3. Current Authentication Flow

**Signup Flow** (`backend/app/api/v1/endpoints/auth.py`):
1. User signs up → Creates account OR upgrades waitlist user
2. **IMMEDIATELY** granted `access_status = "full"` (line 82, 117)
3. Set `user_kind = "content"` by default
4. Redirected to dashboard (frontend assumes full access)

**Problem:** Users get dashboard access but can't use the product (not test users in OAuth apps).

**Login Flow** (`backend/app/api/v1/endpoints/auth.py`):
1. User logs in → JWT tokens issued
2. No routing based on approval status
3. Frontend assumes all authenticated users can access dashboard

### 4. Admin Dashboard

**Current Implementation:**
- **Location:** `frontend/app/admin/`
- **Features:**
  - User list with search/filters
  - Manual `access_status` updates (waiting/full)
  - Manual `user_kind` updates (content/business)
  - Basic metrics view
- **Backend:** `backend/app/api/v1/endpoints/admin.py`
  - GET `/admin/users` - All users
  - GET `/admin/waiting-list` - Waiting list users
  - POST `/admin/users/{user_id}/access` - Update access

**Assessment:** Simple but functional. Needs expansion for application review workflow.

### 5. Existing Migrations

**Total Migrations:** 73 files in `backend/alembic/versions/`

**Relevant Recent Migrations:**
- `20250826_1200-revamp_user_access_and_kind.py` - Refactored access status
- `20250924_162800_add_marketing_fields_to_users.py` - Added marketing fields
- `20250926_191046_add_waitlist_campaign_flags.py` - Added countdown email flags
- `20251001_2100_add_trial_tracking.py` - Added trial/subscription fields
- `20251024_120500_add_user_application_workflow.py` - **EMPTY STUB** (Created today, not implemented)

**Migration System:** Alembic, properly configured

---

## Issues Identified

### Critical Issues ❌

1. **No Approval Workflow**
   - Users get instant access on signup
   - No application/review process
   - Can't manually add as OAuth test users before approval

2. **Inconsistent Naming**
   - `access_status` uses "waiting"/"full" but old code references "waiting_list"/"full_access"
   - `user_kind` vs `account_type` (spec requires `account_type`)
   - Mixed terminology: "early access" vs "full access"

3. **Mixed Concerns in Users Table**
   - Demo call tracking mixed with signup workflow
   - Marketing campaign tracking mixed with user management
   - Trial/subscription mixed with access control

### Major Issues ⚠️

4. **Redundant/Legacy Fields**
   - `early_access_granted_at` - Legacy from multi-tier access
   - Countdown email flags (`countdown_t14_sent_at`, etc.) - Specific to old campaign
   - `has_account` - Confusing flag, overlaps with `access_status`

5. **Missing Fields for New Workflow**
   - No `account_type` ENUM (creator/agency)
   - No `approval_status` ENUM (pending/approved/rejected)
   - No `application_submitted_at`
   - No `approved_at`, `approved_by`, `rejected_at`, `rejected_by`
   - No `rejection_reason`

6. **Missing Tables**
   - No `applications` table for application data (JSONB storage)
   - No `admin_notification_settings` table

7. **Missing Indexes**
   - No index on `access_status` (will be queried frequently)
   - No index on `user_kind` (will be filtered)
   - No index on `is_admin` (admin checks)
   - No index on `approval_status` (will need this)

### Minor Issues 📝

8. **Admin Notes Scattered**
   - `demo_prep_notes`, `follow_up_reminders`, `user_qualification_notes` in users table
   - Should be in separate admin_notes or in application record

9. **Trial/Subscription Premature**
   - Fields added but feature not implemented
   - May conflict with credit system

10. **Relationships Not Fully Utilized**
    - Many relationships defined but not used in queries
    - Some could benefit from eager loading optimization

---

## Proposed Cleanup Plan

### Phase A: Remove/Deprecate Legacy Fields

**Fields to KEEP but DEPRECATE** (don't remove, set NULL for new users):
```python
# Legacy waitlist campaign - keep for historical data
countdown_t14_sent_at: DateTime | None
countdown_t7_sent_at: DateTime | None  
countdown_t1_sent_at: DateTime | None
launch_sent_at: DateTime | None

# Legacy access grant tracking
early_access_granted_at: DateTime | None  # Map to approved_at in new system
```

**Fields to REMOVE** (after verifying not used):
```python
has_account: Boolean  # Redundant with access_status/approval_status
```

**Fields to KEEP** (still useful):
```python
# Marketing - still used by SendGrid sync
marketing_opt_in: Boolean
marketing_opt_in_at: DateTime | None
marketing_unsubscribed_at: DateTime | None
marketing_bounced_at: DateTime | None
marketing_last_event: String | None
marketing_last_event_at: DateTime | None

# Demo tracking - different from application workflow
demo_requested: Boolean
demo_requested_at: DateTime | None
demo_scheduled_at: DateTime | None
demo_completed: Boolean
demo_completed_at: DateTime | None

# Demo mode - for simulator feature
demo_mode: Boolean
demo_mode_enabled_at: DateTime | None

# Admin notes - can migrate to applications table later
demo_prep_notes: Text | None
follow_up_reminders: Text | None
user_qualification_notes: Text | None

# Trial/subscription - keep for future
trial_start_date: DateTime | None
trial_end_date: DateTime | None
trial_notified_7d: Boolean
trial_notified_3d: Boolean
trial_notified_1d: Boolean
subscription_status: String
```

### Phase B: Add New Fields to Users Table

```python
# New approval workflow fields
account_type: Enum('creator', 'agency', 'legacy') | None
    # 'legacy' for existing users without application
approval_status: Enum('pending', 'approved', 'rejected') DEFAULT 'pending'
application_submitted_at: DateTime | None
approved_at: DateTime | None
approved_by: UUID | None  # FK to users.id (admin)
rejected_at: DateTime | None
rejected_by: UUID | None  # FK to users.id (admin)
rejection_reason: Text | None
```

**Migration Strategy for Existing Users:**
- Set `account_type = 'legacy'` for all existing users
- Set `approval_status = 'approved'` for users with `access_status = 'full'`
- Set `approval_status = 'pending'` for users with `access_status = 'waiting'`
- Map `early_access_granted_at` → `approved_at` for existing users

### Phase C: Create New Tables

#### Table 1: `applications`
```sql
CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('creator', 'agency')),
    application_data JSONB NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE NULL,
    reviewed_by UUID NULL REFERENCES users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_notes TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_applications_user_id ON applications(user_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_submitted_at ON applications(submitted_at DESC);
CREATE INDEX idx_applications_account_type ON applications(account_type);
```

**JSONB Schema for `application_data`:**

**Creator Application:**
```json
{
  "full_name": "string",
  "creator_name": "string",
  "platforms": {
    "youtube": {"enabled": true, "email": "creator@gmail.com"},
    "instagram": {"enabled": true, "email": "creator@gmail.com"},
    "tiktok": {"enabled": true, "username": "@creator"},
    "twitter": {"enabled": false},
    "other": {"enabled": false}
  },
  "follower_range": "10000-50000",
  "content_type": "Fitness tutorials and workout tips",
  "why_repruv": "Want to automate comment replies...",
  "biggest_challenge": "Too many spam comments...",
  "referral_source": "social_media"
}
```

**Agency Application:**
```json
{
  "agency_name": "string",
  "contact_name": "string",
  "contact_role": "string",
  "agency_website": "https://...",
  "creator_count": 25,
  "platforms": ["youtube", "instagram", "tiktok"],
  "avg_audience_size": "100000-500000",
  "partner_interest": "yes",
  "biggest_challenge": "Managing replies across all creators",
  "required_features": "Bulk onboarding, team permissions...",
  "creator_emails": ["creator1@example.com", "creator2@example.com"],
  "referral_source": "industry_referral"
}
```

#### Table 2: `admin_notification_settings`
```sql
CREATE TABLE admin_notification_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    notification_types JSONB NOT NULL DEFAULT '{"creator_applications": true, "agency_applications": true}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    added_by UUID REFERENCES users(id),
    added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admin_notifications_active ON admin_notification_settings(is_active);
```

### Phase D: Add Missing Indexes

```sql
-- Performance indexes for new workflow
CREATE INDEX idx_users_approval_status ON users(approval_status);
CREATE INDEX idx_users_account_type ON users(account_type);
CREATE INDEX idx_users_is_admin ON users(is_admin) WHERE is_admin = true;
CREATE INDEX idx_users_access_status ON users(access_status);

-- Composite index for admin dashboard queries
CREATE INDEX idx_users_approval_account ON users(approval_status, account_type);
```

### Phase E: Rename/Standardize Fields

**No field renames** - Too risky with existing code. Instead:
1. Add new fields (`account_type`, `approval_status`)
2. Keep old fields (`user_kind`, `access_status`) for backward compatibility
3. Update code to use new fields
4. Deprecate old fields in future version

---

## Migration Plan

### Migration Order

**Migration 1:** `20251024_140000_cleanup_user_schema.py`
1. Add new ENUM types (account_type, approval_status)
2. Add new columns to users table
3. Add indexes
4. **Data migration:** Set defaults for existing users
5. Add foreign key constraints

**Migration 2:** `20251024_140100_create_applications_table.py`
1. Create applications table
2. Add indexes
3. Add foreign key constraints

**Migration 3:** `20251024_140200_create_admin_notifications_table.py`
1. Create admin_notification_settings table
2. Add indexes
3. Seed with initial admin email (from env var)

**Migration 4:** `20251024_140300_remove_deprecated_fields.py` *(FUTURE - Phase 2)*
1. Remove `has_account` column (after verifying not used)
2. Remove other truly deprecated fields

### Data Migration Logic

```python
# Pseudo-code for migration
def upgrade():
    # Add new columns
    op.add_column('users', sa.Column('account_type', ...))
    op.add_column('users', sa.Column('approval_status', ...))
    # ... other columns
    
    # Data migration for existing users
    connection = op.get_bind()
    
    # Set legacy account type for all existing users
    connection.execute(
        "UPDATE users SET account_type = 'legacy' WHERE account_type IS NULL"
    )
    
    # Map old access_status to new approval_status
    connection.execute("""
        UPDATE users 
        SET approval_status = CASE 
            WHEN access_status = 'full' THEN 'approved'
            WHEN access_status = 'waiting' THEN 'pending'
            ELSE 'pending'
        END
        WHERE approval_status IS NULL
    """)
    
    # Map early_access_granted_at to approved_at for existing users
    connection.execute("""
        UPDATE users 
        SET approved_at = early_access_granted_at
        WHERE early_access_granted_at IS NOT NULL 
        AND approved_at IS NULL
    """)
    
    # Add indexes
    op.create_index('idx_users_approval_status', 'users', ['approval_status'])
    # ... other indexes
```

### Rollback Plan

If migration fails or issues arise:
1. **Database rollback:** `alembic downgrade -1` (for each migration)
2. **Code rollback:** Git revert to previous commit
3. **User impact:** None if caught in staging; minimal if in production (old code still works with old fields)

### Testing Strategy

**Pre-Migration:**
1. Backup production database
2. Test migration on staging with production data copy
3. Verify all existing users still work
4. Verify all existing API endpoints still work

**Post-Migration:**
1. Smoke test: Login as existing user → access dashboard
2. Smoke test: Admin dashboard loads users
3. Smoke test: Create new user (old flow) → still works
4. Monitor error logs for 24 hours

---

## New Schema Summary

### Users Table - Final State

**Core Fields:** 13 (unchanged)  
**New Workflow Fields:** 7 (added)  
**Marketing Fields:** 6 (kept)  
**Demo Tracking Fields:** 9 (kept)  
**Trial Fields:** 7 (kept)  
**Legacy Fields:** 5 (deprecated but kept)  
**Total:** ~47 fields

**New Tables:** 2  
**New Indexes:** 7  
**New ENUMs:** 2

### Estimated Timeline

- **Migration Development:** 4 hours
- **Testing on Staging:** 2 hours  
- **Code Review:** 1 hour
- **Production Deployment:** 1 hour (during low-traffic window)
- **Monitoring:** 24 hours
- **Total:** ~2 days (including buffer)

---

## Risks & Mitigation

### High Risk ⚠️
**Risk:** Data migration fails for some users  
**Mitigation:** 
- Extensive testing on staging with production data
- Transaction-based migration (all or nothing)
- Rollback plan ready

### Medium Risk ⚠️
**Risk:** Existing code breaks due to missing fields  
**Mitigation:**
- Grep search all code for field usage before removing anything
- Keep all existing fields (only add, don't remove)
- Comprehensive testing

### Low Risk ✅
**Risk:** Performance degradation from new indexes  
**Mitigation:**
- Indexes are selective and necessary
- Monitor query performance post-deployment

---

## Recommendations

### Immediate Actions (Phase 0)

1. ✅ **APPROVE THIS AUDIT** - Get sign-off before proceeding
2. 🔧 **Create staging environment copy** with production data
3. 🔧 **Write migration scripts** (4 migrations)
4. 🧪 **Test migrations thoroughly** on staging
5. ✅ **Get final approval** before production deployment

### Phase 1 Actions (After Cleanup)

1. Implement new signup flow
2. Build application forms (creator/agency)
3. Update authentication/routing logic
4. Build admin application review interface
5. Integrate SendGrid for notifications

### Future Cleanup (Phase 2 - Q1 2026)

1. Remove `has_account` field (verify not used)
2. Consider moving demo call tracking to separate table
3. Consolidate admin notes into applications table
4. Review if all marketing fields still needed

---

## Questions for Product/Engineering

1. **Existing Users:** Should all existing users be grandfathered as "approved" with `account_type = 'legacy'`?  
   **Recommendation:** YES - don't disrupt existing users

2. **Waitlist Users:** Users currently on waitlist (access_status='waiting') - should they go through new application flow?  
   **Recommendation:** YES - set them to `approval_status='pending'` and prompt to submit application

3. **Demo Tracking:** Keep demo call tracking in users table or move to separate table?  
   **Recommendation:** KEEP for now - separate concern from application workflow

4. **Trial Fields:** Keep trial/subscription fields even though not implemented?  
   **Recommendation:** KEEP - planned for Q1, low cost to maintain

5. **Countdown Email Fields:** Remove old waitlist campaign email flags?  
   **Recommendation:** KEEP as deprecated - historical data, no harm

6. **has_account Field:** Safe to remove?  
   **Recommendation:** YES but do in Phase 2 after verifying not used in frontend/backend

---

## Approval Checklist

Before proceeding to implementation:

- [ ] Schema changes reviewed and approved
- [ ] Migration plan reviewed and approved  
- [ ] Data migration logic reviewed
- [ ] Rollback plan acceptable
- [ ] Timeline acceptable (2 days for cleanup, then 5 days for implementation)
- [ ] Risk mitigation strategies acceptable
- [ ] Staging environment ready for testing
- [ ] Production deployment window scheduled

---

## Next Steps

**Upon Approval:**
1. Create 3 migration files (cleanup, applications, admin_notifications)
2. Test migrations on staging
3. Deploy to production during low-traffic window
4. Monitor for 24 hours
5. Proceed with Phase 1 implementation (signup flow)

**Estimated Total Timeline:**
- Phase 0 (Cleanup): 2 days
- Phase 1-6 (Implementation): 5-7 days
- **Total: 7-9 days** (with buffer)

---

**Report Prepared By:** AI Assistant  
**For Review By:** Product Lead / Engineering Lead  
**Status:** AWAITING APPROVAL
