# Monetization Auto-Setup Testing Guide

## Quick Test Scenarios

### ✅ Test 1: Demo Mode User (Your Case)

**Setup:**
- User has `demo_mode_status = 'enabled'` in database
- No monetization profile exists

**Expected Result:**
1. Visit `/monetization/setup`
2. See loading: "Detecting your profile data..."
3. See success: "Profile Created! Using data from demo..."
4. Auto-redirect to `/monetization` (NO FORM SHOWN)

**What to Check:**
- ✅ No "undefined" in any messages
- ✅ No validation errors
- ✅ Profile created with 100k followers, 6.5% engagement
- ✅ Niche set to "Tech Reviews"

---

### ✅ Test 2: YouTube Connected User

**Setup:**
- User has active YouTube connection
- `demo_mode_status = 'disabled'`
- No monetization profile exists

**Expected Result:**
1. Visit `/monetization/setup`
2. See alert: "Auto-filled from your youtube connection"
3. Form shows ONLY "Niche/Category" field
4. Other fields hidden (auto-filled)
5. Enter niche → Submit → Success

**What to Check:**
- ✅ Only 1 field shown (niche)
- ✅ Submit works without validation errors
- ✅ Profile created with YouTube metrics

---

### ✅ Test 3: No Data User

**Setup:**
- `demo_mode_status = 'disabled'`
- No platform connections
- No monetization profile exists

**Expected Result:**
1. Visit `/monetization/setup`
2. See full form (all 8 fields)
3. Fill required fields → Submit → Success

**What to Check:**
- ✅ All fields shown
- ✅ Validation works correctly
- ✅ Profile created with entered data

---

### ✅ Test 4: Demo Mode Disable

**Setup:**
- User has demo mode enabled
- Monetization profile exists

**Expected Result:**
1. Go to Settings → Demo Mode
2. Click "Disable Demo Mode"
3. Confirm dialog mentions "reset monetization setup"
4. Demo disabled
5. Visit `/monetization` → Shows "Get Started"
6. Click → Redirects to `/monetization/setup`
7. If no real connections: Shows full form

**What to Check:**
- ✅ Confirmation mentions monetization reset
- ✅ Profile deleted from database
- ✅ Active project deleted
- ✅ Next setup uses real data (if available)

---

## API Testing (Optional)

### Test Auto-Detect Endpoint

**Demo Mode Enabled:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/v1/monetization/profile/auto-detect
```

**Expected Response:**
```json
{
  "data_source": "demo",
  "is_demo": true,
  "profile_data": {
    "primary_platform": "youtube",
    "follower_count": 100000,
    "engagement_rate": 6.5,
    "niche": "Tech Reviews",
    "platform_url": "https://youtube.com/@democreator",
    "avg_content_views": 50000,
    "content_frequency": 3,
    "time_available_hours_per_week": 10
  },
  "missing_fields": [],
  "can_auto_create": true
}
```

**YouTube Connected:**
```json
{
  "data_source": "youtube",
  "is_demo": false,
  "profile_data": {
    "primary_platform": "youtube",
    "follower_count": 50000,
    "engagement_rate": 4.2,
    "niche": null,
    "platform_url": "https://youtube.com/channel/UC...",
    "avg_content_views": 25000,
    ...
  },
  "missing_fields": ["niche"],
  "can_auto_create": false
}
```

**No Data:**
```json
{
  "data_source": null,
  "is_demo": false,
  "profile_data": {
    "primary_platform": null,
    "follower_count": null,
    "engagement_rate": null,
    "niche": null,
    ...
  },
  "missing_fields": ["primary_platform", "follower_count", "engagement_rate", "niche"],
  "can_auto_create": false
}
```

---

## Database Verification

### Check Demo Mode Status
```sql
SELECT 
  id, 
  email, 
  demo_mode_status, 
  demo_mode_enabled_at 
FROM users 
WHERE email = 'your@email.com';
```

Should show `demo_mode_status = 'enabled'` for demo users.

### Check Monetization Profile
```sql
SELECT 
  user_id,
  primary_platform,
  follower_count,
  engagement_rate,
  niche
FROM creator_profiles
WHERE user_id = 'YOUR_USER_ID';
```

After auto-creation, should show demo values.

### Check Profile Deleted After Demo Disable
```sql
-- Should return 0 rows after disabling demo
SELECT COUNT(*) FROM creator_profiles WHERE user_id = 'YOUR_USER_ID';
SELECT COUNT(*) FROM active_projects WHERE user_id = 'YOUR_USER_ID';
```

---

## Common Issues & Solutions

### Issue: Still seeing "undefined"
**Cause**: Backend not returning correct demo status
**Check**: 
```python
# In monetization.py, verify:
is_demo = (
    hasattr(current_user, 'demo_mode_status') and 
    current_user.demo_mode_status == 'enabled'
)
```

### Issue: Validation error on auto-filled data
**Cause**: Frontend validating all fields
**Check**:
```typescript
// In setup/page.tsx, verify:
if (missingFields.includes('follower_count') && formData.follower_count < 1000) {
  // Only validates if field is missing
}
```

### Issue: Form shown instead of auto-create
**Cause**: Backend returning `can_auto_create: false`
**Check**: 
- Demo mode status in database
- Backend returning all required fields
- No fields in `missing_fields` array

---

## Success Criteria

✅ Demo users: Zero-click setup (instant redirect)
✅ Connected users: One-field form (niche only)
✅ New users: Full form works correctly
✅ Demo disable: Monetization reset automatically
✅ No "undefined" messages anywhere
✅ No validation errors on auto-filled data
