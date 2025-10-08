# Disabled Email Tasks (Post-Launch)

## Overview
After launch, all automated prelaunch/waiting list email tasks have been disabled to avoid sending unnecessary emails to live users. The code is **commented out**, not deleted, so it can be easily re-enabled for future campaigns.

---

## What Was Disabled

### 1. Welcome Emails on Signup
**Location:** `backend/app/api/v1/endpoints/auth.py`

- **Line 35:** Commented import of `send_welcome_email`
- **Lines 93-97:** Disabled welcome email for existing waiting list users upgrading
- **Lines 126-130:** Disabled welcome email for new signups

**Previous Behavior:**
- New users received automated welcome email via Celery task
- Waiting list users received welcome email when upgraded

**Current Behavior:**
- No automated emails sent on signup
- Users can still create accounts and access platform

### 2. Celery Beat Scheduled Tasks
**Location:** `backend/app/core/celery.py`

Disabled periodic tasks:
- **`check-trial-expirations`** (Lines 77-80)
  - Previously: Daily at 9 AM UTC
  - Purpose: Send trial expiration reminders

- **`sync-sendgrid-contacts`** (Lines 81-84)
  - Previously: Daily at 4:15 AM UTC
  - Purpose: Sync contacts to SendGrid

- **`waitlist-campaign-hourly`** (Lines 85-88)
  - Previously: Every hour
  - Purpose: Send waiting list campaign emails

**Still Active:**
- ✅ **`cleanup-chat-streams`** - Chat cleanup (lines 91-94)

---

## What Was NOT Disabled

### Password Reset Emails
**Location:** `backend/app/api/v1/endpoints/auth.py` (Line 347)

Password reset functionality remains **active** as it's a core feature, not prelaunch-specific:
```python
await auth_service.send_password_reset_email(email_in.email)
```

---

## How to Re-Enable Email Tasks

### Option 1: Re-enable Specific Features

**To re-enable welcome emails:**
1. Uncomment line 35 in `auth.py`:
   ```python
   from app.tasks.email import send_welcome_email
   ```

2. Uncomment lines 93-97 and 126-130 in `auth.py`:
   ```python
   try:
       send_welcome_email.delay(user.email, user.full_name)
   except Exception as e:
       logger.error(f"Failed to enqueue welcome email: {e}")
   ```

**To re-enable scheduled tasks:**
1. Uncomment desired tasks in `celery.py` (lines 77-88)
2. Redeploy backend
3. Restart Celery Beat worker

### Option 2: Full Re-enable
```bash
# Search for "DISABLED: Post-launch" comments
git log --all --source --full-history -S "DISABLED: Post-launch"

# Revert specific commit if needed
git show ff14b0f  # View the disable commit
git revert ff14b0f  # Revert to re-enable everything
```

---

## Testing Email Tasks

If you need to test emails without enabling them globally:

**Manual task invocation:**
```python
from app.tasks.email import send_welcome_email

# Via Celery CLI
celery -A app.core.celery call app.tasks.email.send_welcome_email --args='["user@example.com", "John Doe"]'

# Via Python shell
send_welcome_email.delay("user@example.com", "John Doe")
```

**Check task status:**
```python
from app.core.celery import get_task_info

result = send_welcome_email.delay("user@example.com", "John Doe")
print(get_task_info(result.id))
```

---

## Email Configuration

Email tasks require these environment variables (still configured, just not used):
- `RESEND_API_KEY` - Resend.com API key
- `SENDGRID_API_KEY` - SendGrid API key (for marketing)
- `EMAIL_FROM` - Sender email address

**Current Status:**
- ✅ Configuration preserved
- ✅ Email tasks code intact
- ❌ Tasks not called automatically
- ❌ Beat schedules disabled

---

## Migration Notes

### When to Re-enable
Consider re-enabling email tasks when:
- Launching new campaigns
- Running promotional events
- Implementing onboarding sequences
- Need to remind trial users

### Future Email Strategy
When ready to re-implement emails:
1. Update templates for live product (not prelaunch)
2. Add unsubscribe links (legal requirement)
3. Set up proper email preferences per user
4. Test thoroughly in staging
5. Monitor bounce/complaint rates

---

## Related Files

**Email Tasks:**
- `backend/app/tasks/email.py` - Email task implementations
- `backend/app/tasks/marketing.py` - Marketing sync tasks

**Services:**
- `backend/app/services/email.py` - Email service layer
- `backend/app/services/auth.py` - Auth service (password reset)

**Templates:**
- Email templates should be in a templates directory (if exists)

---

## Quick Reference

**Disabled Features:**
- ❌ Welcome emails on signup
- ❌ Trial expiration reminders
- ❌ Waitlist campaign emails
- ❌ SendGrid contact sync

**Active Features:**
- ✅ Password reset emails
- ✅ Chat stream cleanup
- ✅ All email infrastructure (just not triggered)

**To Revert:**
```bash
git show ff14b0f             # View changes
git revert ff14b0f           # Undo disable
git push                     # Deploy re-enabled version
```

---

**Last Updated:** 2025-10-08  
**Disabled By:** Launch preparation  
**Commit:** `ff14b0f`
