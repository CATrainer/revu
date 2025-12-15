# Hardcoded Data Audit - Dashboard Infrastructure
**Date:** December 10, 2024  
**Purpose:** Comprehensive audit of hardcoded data in creator and agency dashboards  
**Scope:** Phase 0 infrastructure revamp preparation

---

## Executive Summary

This audit identifies all instances where data is hardcoded into frontend components rather than being fetched from the database or external integrations (YouTube, Instagram, TikTok). The agency dashboard is particularly problematic with extensive mock data across all widgets.

**Key Findings:**
- **Agency Dashboard:** 8 major widgets with hardcoded mock data
- **Creator Dashboard:** Minimal hardcoded data (properly fetches from API)
- **Backend API:** Fully implemented for agency dashboard but not being used by frontend
- **Impact:** Agency dashboard is non-functional for real agency users

---

## 1. Agency Dashboard (`/agency`)

### 1.1 QuickStatsBar Component
**File:** `frontend/components/agency/dashboard/QuickStatsBar.tsx`

**Hardcoded Data (Lines 21-27):**
```typescript
const mockStats: DashboardStats = {
  total_active_campaigns: 15,
  total_creators: 43,
  revenue_this_month: 50000,
  pipeline_value: 125000,
  completion_rate: 94,
};
```

**Issue:** Component accepts `stats` prop but defaults to `mockStats` when no data provided.

**Backend API Available:** ✅ `/api/v1/agency/dashboard/stats` (fully implemented)

**Fix Required:** Remove mock data, enforce required `stats` prop, handle loading/error states properly.

---

### 1.2 ActionRequiredWidget Component
**File:** `frontend/components/agency/dashboard/ActionRequiredWidget.tsx`

**Hardcoded Data (Lines 26-71):**
```typescript
const mockItems: ActionRequiredItem[] = [
  {
    id: '1',
    type: 'approval',
    title: 'Script approval overdue',
    description: 'Brand X x @Creator1',
    campaign_name: 'Brand X Product Review',
    creator_name: '@Creator1',
    urgency: 'overdue',
    days_overdue: 3,
    action_url: '/agency/campaigns/1',
    quick_action: 'Review Now',
  },
  // ... 3 more hardcoded items
];
```

**Issue:** 4 fake action items with fictional brands, creators, and campaigns.

**Backend API Available:** ✅ `/api/v1/agency/dashboard/action-required` (fully implemented)

**Fix Required:** Remove all mock items, fetch from API, handle empty state.

---

### 1.3 CreatorAvailabilityWidget Component
**File:** `frontend/components/agency/dashboard/CreatorAvailabilityWidget.tsx`

**Hardcoded Data (Lines 21-43):**
```typescript
const mockStats = {
  available: 12,
  booked: 8,
  unavailable: 3,
};

const mockWeekCapacity = [
  { day: 'Mon', date: 15, capacity: 40, booked: 3 },
  { day: 'Tue', date: 16, capacity: 60, booked: 5 },
  // ... 5 more days
];

const mockAvailableCreators = [
  { id: '1', name: 'John Smith', handle: '@johnsmith', platform: 'YouTube', availableDays: 'Mon-Fri' },
  { id: '2', name: 'Jane Doe', handle: '@janedoe', platform: 'Instagram', availableDays: 'Wed-Sun' },
  // ... 3 more fake creators
];
```

**Issue:** Completely fabricated creator availability data with fake names and schedules.

**Backend API Available:** ❌ No endpoint exists for creator availability

**Fix Required:** 
1. Create backend endpoint `/api/v1/agency/creators/availability`
2. Add availability tracking to `AgencyCreatorProfile` model
3. Implement calendar/booking system
4. Replace all mock data with API calls

---

### 1.4 CampaignPerformanceWidget Component
**File:** `frontend/components/agency/dashboard/CampaignPerformanceWidget.tsx`

**Hardcoded Data (Lines 25-76):**
```typescript
const mockStats = {
  activeCampaigns: 8,
  totalEstimatedReach: 5200000,
  avgEngagementRate: 4.1,
  contentPosted: 12,
  contentTotal: 20,
};

const mockTopPerformers = [
  {
    id: '1',
    brandName: 'Brand X',
    creatorName: '@creator1',
    metric: '2.5M views',
    metricType: 'views',
    status: 'exceeding',
    percentOfGoal: 150,
  },
  // ... 2 more fake campaigns
];

const mockAlerts = [
  {
    id: '1',
    type: 'success',
    message: 'Brand X campaign exceeded goals by 150%',
    campaignId: '1',
  },
  // ... 1 more alert
];
```

**Issue:** Fake campaign performance metrics, top performers, and alerts.

**Backend API Available:** ⚠️ Partial - campaigns exist but performance metrics not aggregated

**Fix Required:**
1. Create endpoint `/api/v1/agency/campaigns/performance`
2. Aggregate metrics from `AgencyCampaign` and `CampaignDeliverable`
3. Calculate performance scores and rankings
4. Remove all mock data

---

### 1.5 FinancialOverviewWidget Component
**File:** `frontend/components/agency/dashboard/FinancialOverviewWidget.tsx`

**Hardcoded Data (Lines 27-37 & 218-238):**
```typescript
const mockStats: FinancialStats = {
  outstanding_receivables: 25000,
  overdue_receivables: 5000,
  overdue_count: 2,
  oldest_overdue_days: 12,
  creator_payouts_due: 18000,
  creator_payouts_count: 7,
  revenue_this_month: 50000,
  revenue_last_month: 40000,
  revenue_trend_percent: 25,
};

// Revenue trend chart (lines 218-238)
{[35, 42, 38, 45, 40, 50].map((height, i) => (
  // Hardcoded 6-month revenue bars
))}
```

**Issue:** Fake financial data and hardcoded revenue chart values.

**Backend API Available:** ✅ `/api/v1/agency/dashboard/financial` (fully implemented)

**Fix Required:** Remove mock stats, fetch real financial data, implement proper chart with real historical data.

---

### 1.6 PipelineSummaryWidget Component
**File:** `frontend/components/agency/dashboard/PipelineSummaryWidget.tsx`

**Hardcoded Data (Lines 63-79):**
```typescript
const mockStats: PipelineStats = {
  total_value: 125000,
  avg_deal_size: 8333,
  deals_closing_this_month: 4,
  deals_closing_this_month_value: 32000,
  win_rate_this_month: 65,
  stagnant_deals: 3,
  by_stage: {
    prospecting: { count: 12, value: 75000 },
    pitch_sent: { count: 5, value: 25000 },
    negotiating: { count: 8, value: 45000 },
    booked: { count: 6, value: 38000 },
    in_progress: { count: 4, value: 22000 },
    completed: { count: 15, value: 85000 },
    lost: { count: 5, value: 28000 },
  },
};
```

**Issue:** Completely fabricated pipeline statistics across all deal stages.

**Backend API Available:** ✅ `/api/v1/agency/dashboard/pipeline` (fully implemented)

**Fix Required:** Remove mock data, fetch from API, handle empty pipeline state.

---

### 1.7 UpcomingDeadlinesWidget Component
**File:** `frontend/components/agency/dashboard/UpcomingDeadlinesWidget.tsx`

**Hardcoded Data (Lines 39-100):**
```typescript
const mockDeadlines: UpcomingDeadline[] = [
  {
    id: '1',
    date: new Date().toISOString(),
    type: 'content_posting',
    title: 'YouTube Video Post',
    campaign_name: 'Brand X Review',
    creator_name: '@creator1',
    brand_name: 'Brand X',
    is_overdue: false,
  },
  // ... 5 more fake deadlines
];
```

**Issue:** 6 hardcoded deadlines with fake campaigns and dates.

**Backend API Available:** ✅ `/api/v1/agency/dashboard/deadlines` (fully implemented)

**Fix Required:** Remove mock deadlines, fetch from API with configurable date range.

---

### 1.8 RecentActivityWidget Component
**File:** `frontend/components/agency/dashboard/RecentActivityWidget.tsx`

**Hardcoded Data (Lines 28-85):**
```typescript
const mockActivities: ActivityItem[] = [
  {
    id: '1',
    type: 'deal_moved',
    description: 'Deal moved: Brand X from Negotiating → Booked',
    actor_name: 'Caleb',
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    link_url: '/agency/pipeline/1',
  },
  // ... 6 more fake activities
];
```

**Issue:** 7 hardcoded activity items with fake actions and timestamps.

**Backend API Available:** ✅ `/api/v1/agency/dashboard/activity` (fully implemented)

**Fix Required:** Remove mock activities, fetch from API, implement real-time updates.

---

### 1.9 Agency Dashboard Main Page
**File:** `frontend/app/(agency)/agency/page.tsx`

**Issue:** All widgets receive mock data as defaults. The page makes API calls but widgets fall back to mock data when loading or when API returns no data.

**Lines 67-106:** API calls are present but not properly enforced:
```typescript
const { data: dashboardStats, isLoading: statsLoading } = useQuery({
  queryKey: ['agency-dashboard-stats'],
  queryFn: () => dashboardApi.getStats(),
  staleTime: 30000,
});
// ... similar for all widgets
```

**Fix Required:** 
1. Remove all default mock data from widget props
2. Implement proper loading skeletons
3. Add error boundaries
4. Show empty states when no data exists
5. Ensure all widgets require data prop (no defaults)

---

## 2. Creator Dashboard (`/dashboard`)

### 2.1 Dashboard Main Page
**File:** `frontend/app/(dashboard)/dashboard/page.tsx`

**Status:** ✅ **GOOD** - Properly fetches data from API

**Lines 50-80:** Correctly fetches metrics from backend:
```typescript
const fetchMetrics = async () => {
  const response = await fetch('/api/v1/analytics/dashboard-metrics');
  if (response.ok) {
    const data = await response.json();
    setMetrics(data);
  }
};
```

**Backend API:** ✅ `/api/v1/analytics/dashboard-metrics` (fully implemented with demo/real mode support)

**No Issues Found:** This dashboard correctly pulls all data from the database or demo service.

---

### 2.2 QuickActions Component
**File:** `frontend/components/dashboard/QuickActions.tsx`

**Minor Issue (Line 19):**
```typescript
{labelNew} (5)  // Hardcoded count
```

**Fix Required:** Fetch actual unread interaction count from API.

---

### 2.3 Insights Dashboard
**File:** `frontend/app/(dashboard)/insights/page.tsx`

**Status:** ✅ **GOOD** - Properly fetches from API

**Lines 114-134:** Correctly fetches insights data:
```typescript
const response = await api.get(`/insights/dashboard?${params}`)
```

**Backend API:** ✅ `/api/v1/insights/dashboard` (implemented)

**No Issues Found**

---

### 2.4 Monetization Dashboard
**File:** `frontend/app/(dashboard)/monetization/page.tsx`

**Status:** ✅ **GOOD** - Properly fetches from API

**Lines 26-30:** Correctly fetches profile and projects:
```typescript
const [profileData, projectsData] = await Promise.all([
  getProfile(),
  getAllProjects()
]);
```

**Backend API:** ✅ Monetization endpoints implemented

**No Issues Found**

---

## 3. Backend API Status

### 3.1 Agency Dashboard Endpoints
**File:** `backend/app/api/v1/endpoints/agency_dashboard.py`

**Status:** ✅ **FULLY IMPLEMENTED**

All required endpoints exist and are functional:
- ✅ `GET /stats` - Dashboard overview statistics
- ✅ `GET /action-required` - Items needing attention
- ✅ `GET /deadlines` - Upcoming deadlines
- ✅ `GET /activity` - Recent activity feed
- ✅ `GET /pipeline` - Pipeline statistics
- ✅ `GET /financial` - Financial overview (referenced, needs verification)
- ✅ `GET /notifications` - User notifications
- ✅ `GET /search` - Global search

**Issue:** Frontend is not using these endpoints properly - falling back to mock data instead.

---

### 3.2 Creator Dashboard Endpoints
**File:** `backend/app/api/v1/endpoints/dashboard_metrics.py`

**Status:** ✅ **FULLY IMPLEMENTED**

- ✅ `GET /dashboard-metrics` - Unified metrics endpoint
- ✅ Supports both demo mode and real mode
- ✅ Aggregates from YouTube, Instagram, TikTok
- ✅ Calculates engagement rates, growth metrics
- ✅ Properly handles missing connections

**No Issues Found**

---

## 4. Missing Backend Endpoints

### 4.1 Creator Availability System
**Required For:** `CreatorAvailabilityWidget`

**Missing Endpoints:**
- `GET /api/v1/agency/creators/availability` - Get creator availability calendar
- `POST /api/v1/agency/creators/availability` - Set creator availability
- `GET /api/v1/agency/creators/availability/week` - Week view with capacity

**Missing Database Fields:**
- `AgencyCreatorProfile.availability_schedule` (JSON)
- `AgencyCreatorProfile.booking_status` (enum)
- New table: `CreatorBooking` for tracking bookings

---

### 4.2 Campaign Performance Aggregation
**Required For:** `CampaignPerformanceWidget`

**Missing Endpoint:**
- `GET /api/v1/agency/campaigns/performance` - Aggregated performance metrics

**Required Implementation:**
- Aggregate metrics from `AgencyCampaign` and `CampaignDeliverable`
- Calculate performance scores based on goals
- Rank campaigns by performance
- Generate alerts for over/underperforming campaigns

---

### 4.3 Financial Historical Data
**Required For:** `FinancialOverviewWidget` chart

**Missing Endpoint:**
- `GET /api/v1/agency/finance/revenue-history` - Monthly revenue history

**Required Implementation:**
- Query `AgencyInvoice` grouped by month
- Return last 6-12 months of revenue data
- Include trend calculations

---

## 5. Priority Fix Recommendations

### Phase 1: Critical (Agency Dashboard Non-Functional)
1. **Remove all mock data from agency dashboard widgets** (1-2 hours)
   - Update all 8 widget components to require data props
   - Remove default mock values
   
2. **Fix agency dashboard data flow** (2-3 hours)
   - Ensure API calls properly pass data to widgets
   - Add loading states to all widgets
   - Add error boundaries
   - Implement empty states

3. **Test with real agency accounts** (1 hour)
   - Verify all widgets display real data
   - Test with empty database (new agency)
   - Test with populated agency data

### Phase 2: Missing Features (1-2 days)
4. **Implement Creator Availability System**
   - Backend: Database schema + endpoints (4 hours)
   - Frontend: Remove mock data, connect to API (2 hours)

5. **Implement Campaign Performance Aggregation**
   - Backend: Performance calculation endpoint (3 hours)
   - Frontend: Connect widget to API (1 hour)

6. **Implement Financial Historical Data**
   - Backend: Revenue history endpoint (2 hours)
   - Frontend: Dynamic chart rendering (2 hours)

### Phase 3: Polish (1 day)
7. **Add real-time updates** to activity feed
8. **Implement notification system** properly
9. **Add data refresh mechanisms**
10. **Optimize query performance** for dashboard endpoints

---

## 6. Testing Checklist

### Agency Dashboard
- [ ] All widgets display real data from database
- [ ] Loading states work correctly
- [ ] Empty states display when no data exists
- [ ] Error states handle API failures gracefully
- [ ] No console errors about missing data
- [ ] All links navigate to correct pages
- [ ] Quick actions work with real data
- [ ] Search functionality works
- [ ] Notifications system functional

### Creator Dashboard
- [ ] Metrics display correctly in demo mode
- [ ] Metrics display correctly with real connections
- [ ] Platform connection status accurate
- [ ] Interaction counts match database
- [ ] Workflow counts accurate
- [ ] No hardcoded values visible

---

## 7. Code Quality Issues

### Inconsistent Patterns
- Some widgets use `isLoading` prop, others don't
- Mock data sometimes in component, sometimes in separate const
- Inconsistent prop naming (`stats` vs `data` vs `items`)

### Missing TypeScript Strictness
- Optional props with defaults allow mock data to persist
- Should use required props to force proper data flow

### Poor Error Handling
- Most widgets silently fall back to mock data on error
- Should show error states to users
- Should log errors for debugging

---

## 8. Estimated Effort

| Task | Effort | Priority |
|------|--------|----------|
| Remove agency dashboard mock data | 2 hours | P0 |
| Fix agency dashboard data flow | 3 hours | P0 |
| Test agency dashboard | 1 hour | P0 |
| Creator availability backend | 4 hours | P1 |
| Creator availability frontend | 2 hours | P1 |
| Campaign performance backend | 3 hours | P1 |
| Campaign performance frontend | 1 hour | P1 |
| Financial history backend | 2 hours | P1 |
| Financial history frontend | 2 hours | P1 |
| Polish and optimization | 8 hours | P2 |
| **Total** | **28 hours** | **~4 days** |

---

## 9. Conclusion

**Agency Dashboard:** Severely impacted by hardcoded data. All 8 major widgets use mock data despite fully functional backend APIs existing. This makes the agency dashboard completely non-functional for real users.

**Creator Dashboard:** Minimal issues. Properly architected with correct data fetching patterns. Only minor hardcoded value in QuickActions component.

**Root Cause:** Agency dashboard was likely built with mock data for UI development and never properly connected to the backend APIs that were subsequently implemented.

**Immediate Action Required:** Remove all mock data from agency dashboard widgets and properly connect to existing backend APIs. This is a critical P0 issue blocking agency user functionality.
