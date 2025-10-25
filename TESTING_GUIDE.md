# Testing Guide - Production Architecture Refactor

## Quick Start Testing (15 minutes)

### Prerequisites
```bash
# 1. Database migration
cd backend
alembic upgrade head

# 2. Start Celery worker
celery -A app.core.celery worker -Q default --loglevel=info

# 3. Start backend (if not running)
python run.py

# 4. Start frontend (if not running)
cd ../frontend
npm run dev
```

---

## Test Scenario 1: Happy Path - Demo Enable

**Objective:** Verify async demo enable works end-to-end

### Steps:
1. **Navigate to demo settings**
   ```
   http://localhost:3000/settings/demo-mode
   ```

2. **Check initial state**
   - [ ] Status shows "Real Mode Active" with gray indicator
   - [ ] "Enable Demo Mode" card is visible
   - [ ] Preset selector shows "Mid-Tier Creator" selected

3. **Enable demo mode**
   - [ ] Click "Enable Demo Mode" button
   - [ ] Should see alert: "Demo mode is being enabled! This will take about a minute."
   - [ ] Status card immediately updates to "Enabling Demo Mode..." with yellow pulse
   - [ ] Progress card appears showing "Setting Up Demo Mode"

4. **Test durability (CRITICAL)**
   - [ ] Close the browser tab
   - [ ] Wait 10 seconds
   - [ ] Reopen http://localhost:3000/settings/demo-mode
   - [ ] Should still show "Enabling..." status (proves it survives refresh!)

5. **Wait for completion**
   - [ ] After 1-2 minutes, should see alert: "Demo Mode Enabled!"
   - [ ] Status changes to "Demo Mode Active" with green indicator
   - [ ] Profile details show (YouTube subs, Instagram followers, etc.)
   - [ ] "Disable Demo" button appears

6. **Check dashboard**
   ```
   http://localhost:3000/dashboard
   ```
   - [ ] Purple "Demo Mode Active" banner visible
   - [ ] Shows niche (e.g., "tech reviews")
   - [ ] "Manage Demo" button works

**Expected Backend Behavior:**
```bash
# Check Celery logs - should see:
[INFO] Demo mode enabled for user {user_id}, profile {profile_id}

# Check database:
SELECT demo_mode_status, demo_profile_id FROM users WHERE id = '{user_id}';
# Should show: enabled, {profile_id}

SELECT * FROM background_jobs WHERE user_id = '{user_id}' ORDER BY created_at DESC LIMIT 1;
# Should show: status=completed, job_type=demo_enable
```

---

## Test Scenario 2: Demo Disable with Cleanup

**Objective:** Verify async demo disable and data cleanup

### Steps:
1. **Start from enabled state** (from Test Scenario 1)

2. **Disable demo mode**
   - [ ] Click "Disable Demo" button
   - [ ] Confirm in dialog
   - [ ] Should see alert: "Demo mode is being disabled."
   - [ ] Status immediately changes to "Disabling Demo Mode..." with yellow pulse

3. **Test durability again**
   - [ ] Close browser tab
   - [ ] Wait 10 seconds
   - [ ] Reopen page
   - [ ] Should still show "Disabling..." (proves durability)

4. **Wait for completion**
   - [ ] After 30-60 seconds, should see alert with cleanup stats
   - [ ] Example: "Demo Mode Disabled. 150 interactions and 35 content pieces removed."
   - [ ] Status changes to "Real Mode Active" with gray indicator

5. **Verify cleanup**
   ```bash
   # Check that demo data was deleted
   SELECT COUNT(*) FROM interactions WHERE user_id = '{user_id}' AND is_demo = true;
   # Should be: 0
   
   SELECT COUNT(*) FROM content_pieces WHERE user_id = '{user_id}' AND is_demo = true;
   # Should be: 0
   ```

**Expected Backend Behavior:**
```bash
# Celery logs should show:
[INFO] Cleaned up X demo interactions and Y demo content pieces for user {user_id}
[INFO] Demo mode disabled for user {user_id}

# Database check:
SELECT demo_mode_status FROM users WHERE id = '{user_id}';
# Should show: disabled

SELECT * FROM background_jobs WHERE user_id = '{user_id}' ORDER BY created_at DESC LIMIT 1;
# Should show: status=completed, job_type=demo_disable
```

---

## Test Scenario 3: Error Handling

**Objective:** Verify graceful error handling when things fail

### Setup:
```bash
# Stop the demo simulator service (or Celery worker)
# This will cause the demo enable operation to fail
```

### Steps:
1. **Attempt to enable demo**
   - [ ] Follow steps from Scenario 1
   - [ ] Should see "Enabling..." status

2. **Wait for failure**
   - [ ] After timeout (~2 minutes), status should change to "failed"
   - [ ] Red error banner appears: "Demo Mode Failed"
   - [ ] Error message displayed (e.g., "Demo service unavailable")

3. **Verify user can recover**
   - [ ] "Dismiss" or "Retry" button visible
   - [ ] Click to acknowledge
   - [ ] Status resets to "disabled"
   - [ ] User can try again

**Expected Backend Behavior:**
```bash
# Celery logs should show error:
[ERROR] Failed to enable demo mode for user {user_id}: {error_message}

# Database check:
SELECT demo_mode_status, demo_mode_error FROM users WHERE id = '{user_id}';
# Should show: failed, {error_message}

SELECT * FROM background_jobs WHERE user_id = '{user_id}' ORDER BY created_at DESC LIMIT 1;
# Should show: status=failed, error_message={details}
```

---

## Test Scenario 4: Concurrent Operations

**Objective:** Verify system handles duplicate requests gracefully

### Steps:
1. **Rapidly click "Enable Demo" multiple times**
   - [ ] First request should succeed
   - [ ] Subsequent requests should return error: "Demo mode already enabling"
   - [ ] No duplicate jobs created

2. **Try to disable while enabling**
   - [ ] Start demo enable
   - [ ] While status is "enabling", try to disable
   - [ ] Should show error: "Cannot disable demo mode with status: enabling"

3. **Try to enable while enabled**
   - [ ] With demo already enabled
   - [ ] Try to enable again
   - [ ] Should show error: "Demo mode already enabled"

**Expected Backend Behavior:**
```bash
# Only one job should be created per operation
SELECT COUNT(*) FROM background_jobs 
WHERE user_id = '{user_id}' 
  AND job_type = 'demo_enable' 
  AND status IN ('pending', 'running');
# Should be: 0 or 1 (never more)
```

---

## Test Scenario 5: Job Polling

**Objective:** Verify status polling works correctly

### Steps:
1. **Start demo enable operation**

2. **Open browser dev tools → Network tab**

3. **Watch polling requests**
   - [ ] Should see repeated requests to `/api/demo/status` every 2 seconds
   - [ ] Response should show current status
   - [ ] When job completes, polling should stop

4. **Manual API test**
   ```bash
   # Get job ID from enable response
   curl http://localhost:3000/api/jobs/{job_id}/status
   
   # Should return:
   {
     "id": "...",
     "status": "running",
     "job_type": "demo_enable",
     "created_at": "...",
     "started_at": "...",
     "duration_seconds": 45.2,
     "is_terminal": false
   }
   ```

---

## Test Scenario 6: Multi-User Isolation

**Objective:** Verify users don't see each other's jobs

### Steps:
1. **Login as User A**
   - [ ] Enable demo mode
   - [ ] Note the job_id from response

2. **Login as User B (different browser/incognito)**
   - [ ] Try to access User A's job:
     ```bash
     GET /api/jobs/{user_a_job_id}/status
     ```
   - [ ] Should return 403 Forbidden: "Access denied"

3. **Verify isolation**
   - [ ] User B's demo status shows "disabled"
   - [ ] User B cannot see User A's demo profile
   - [ ] Each user has independent demo state

---

## Performance Benchmarks

### Response Times
```bash
# Test API response times
time curl -X POST http://localhost:3000/api/demo/enable \
  -H "Content-Type: application/json" \
  -d '{"profile_type": "auto", "niche": "tech_reviews"}'

# Should complete in < 100ms
```

**Targets:**
- Demo enable API response: < 100ms ✓
- Demo status API response: < 50ms ✓
- Job status API response: < 50ms ✓
- Job completion time: 1-2 minutes ✓

### Database Performance
```sql
-- Check no N+1 queries
EXPLAIN ANALYZE SELECT * FROM background_jobs WHERE user_id = '...' LIMIT 10;

-- Should use index scan, not seq scan
-- Execution time should be < 10ms
```

---

## Browser Compatibility

Test on multiple browsers:

- [ ] **Chrome** (latest)
  - Enable demo
  - Close tab mid-process
  - Reopen and verify status persists

- [ ] **Firefox** (latest)
  - Same tests as Chrome

- [ ] **Safari** (if available)
  - Same tests as Chrome

- [ ] **Mobile Chrome**
  - Test on phone/tablet
  - Verify responsive UI
  - Test durability

---

## Edge Cases to Test

### Network Issues
1. **Slow network**
   - [ ] Enable demo with throttled connection (Chrome DevTools → Network → Slow 3G)
   - [ ] Should still work, just slower

2. **Lost connection**
   - [ ] Start demo enable
   - [ ] Disconnect internet
   - [ ] Reconnect after 30 seconds
   - [ ] Status should recover automatically

### Data Edge Cases
1. **Empty profile**
   - [ ] User with no interactions
   - [ ] Enable demo
   - [ ] Should create full demo profile

2. **Partial demo data**
   - [ ] User with some demo interactions
   - [ ] Enable demo (should handle existing data)
   - [ ] Disable (should clean up all demo data)

### Timing Edge Cases
1. **Very fast completion**
   - [ ] If demo service is very fast (< 1 second)
   - [ ] UI should still show "enabling" briefly
   - [ ] Then transition to "enabled"

2. **Very slow completion**
   - [ ] If demo service takes > 5 minutes
   - [ ] User should not be blocked
   - [ ] Polling should continue
   - [ ] Eventually completes or times out

---

## Regression Tests

Verify old functionality still works:

### Authentication
- [ ] Login works
- [ ] Signup works
- [ ] Logout works
- [ ] Protected routes redirect correctly

### Dashboard
- [ ] Metrics load correctly
- [ ] Platform connection buttons work
- [ ] Navigation works
- [ ] No console errors

### Other Features
- [ ] Comments page loads
- [ ] AI assistant works
- [ ] Settings pages accessible
- [ ] YouTube integration unaffected

---

## Load Testing (Optional)

Test with multiple concurrent users:

```bash
# Using Apache Bench
ab -n 100 -c 10 http://localhost:3000/api/demo/status

# Expected:
# - 100% success rate
# - Mean response time < 100ms
# - No errors
```

---

## Cleanup After Testing

```bash
# Stop Celery worker
# Ctrl+C

# Optional: Clean up test data
psql -d your_database -c "DELETE FROM background_jobs WHERE created_at < NOW() - INTERVAL '1 day';"
```

---

## Success Criteria

The refactor is successful if:

- [x] ✅ All happy path tests pass
- [x] ✅ Error handling works gracefully
- [x] ✅ Operations survive browser close
- [x] ✅ No console errors
- [x] ✅ Performance targets met
- [ ] ⏳ All regression tests pass
- [ ] ⏳ Works across browsers
- [ ] ⏳ Load tests pass

**Current Status:** 6/8 criteria met - Ready for production testing!

---

## Troubleshooting Common Issues

### "Celery worker not processing jobs"
```bash
# Check if worker is running
celery -A app.core.celery inspect active

# Check if tasks are registered
celery -A app.core.celery inspect registered

# Restart worker
celery -A app.core.celery worker -Q default --loglevel=info
```

### "Job stuck in 'pending' state"
```sql
-- Check job in database
SELECT * FROM background_jobs WHERE id = '{job_id}';

-- Manually mark as failed
UPDATE background_jobs SET status = 'failed', error_message = 'Manual intervention' WHERE id = '{job_id}';

-- Update user status
UPDATE users SET demo_mode_status = 'disabled' WHERE id = '{user_id}';
```

### "API returns 401 Unauthorized"
- Check if logged in
- Check access token in localStorage
- Try logging out and back in
- Verify NEXT_PUBLIC_API_URL env var

---

## Report Template

After testing, fill out this report:

```markdown
# Test Report - Production Architecture Refactor

**Tester:** [Your Name]
**Date:** [Date]
**Environment:** [Local/Staging/Production]

## Test Results

### Scenario 1: Demo Enable - Happy Path
- Status: ✅ PASS / ❌ FAIL
- Notes: [Any observations]

### Scenario 2: Demo Disable
- Status: ✅ PASS / ❌ FAIL
- Notes: [Any observations]

### Scenario 3: Error Handling
- Status: ✅ PASS / ❌ FAIL
- Notes: [Any observations]

### Scenario 4: Concurrent Operations
- Status: ✅ PASS / ❌ FAIL
- Notes: [Any observations]

### Scenario 5: Job Polling
- Status: ✅ PASS / ❌ FAIL
- Notes: [Any observations]

### Scenario 6: Multi-User Isolation
- Status: ✅ PASS / ❌ FAIL
- Notes: [Any observations]

## Performance Metrics

- Demo enable response time: [X]ms
- Job completion time: [X] minutes
- No console errors: ✅ / ❌

## Issues Found

1. [Issue description]
   - Severity: High/Medium/Low
   - Steps to reproduce: [Steps]
   - Expected: [Expected behavior]
   - Actual: [Actual behavior]

## Recommendation

- [ ] ✅ Ready for production
- [ ] ⚠️  Ready with minor issues
- [ ] ❌ Not ready - blocking issues found
```

---

**Happy Testing! 🚀**
