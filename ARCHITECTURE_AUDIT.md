# Repruv Architecture Audit & Refactor Plan

**Date:** October 24, 2025  
**Objective:** Transform from fragile client-heavy architecture to production-grade server-first system

---

## Executive Summary

Your application has **fundamental architectural problems** that make it feel sluggish and fragile:

**Critical Issues:**
1. **State lives in the wrong places** - Demo mode status, user data, and app state are fetched client-side on every page load instead of being server-rendered
2. **No persistence layer for operations** - When users trigger actions (enable demo, connect platforms), the browser must stay open or operations fail
3. **Client components everywhere** - Pages that should be Server Components are Client Components, causing unnecessary hydration and slow initial loads
4. **No Next.js API routes** - Frontend talks directly to FastAPI, bypassing Next.js's server capabilities entirely
5. **Zustand for server state** - Using client state manager for data that should come from the database
6. **No job/task system** - Long-running operations block HTTP requests instead of running asynchronously

**The Core Problem:** You've built a Single Page Application (SPA) architecture in Next.js App Router, negating all the benefits of server-side rendering.

---

## Part 1: Current Architecture Deep Dive

### 1.1 Data Flow Analysis

#### **Demo Mode Flow (BROKEN)**

**Current Implementation:**
```
User clicks "Enable Demo" 
→ Client Component makes api.post('/demo/enable')
→ FastAPI updates user.demo_mode = True, calls demo service
→ Demo service generates content in background
→ FastAPI returns immediately
→ Client refetches demo status
→ Page re-renders
```

**Problems:**
- Demo status fetch happens client-side on every page load (`useEffect` in dashboard)
- No Server Component reads `user.demo_mode` from database during SSR
- If user refreshes during demo setup, they see stale data
- Demo service webhook calls backend, but frontend doesn't know about new interactions until manual refresh
- `DemoModeContext` stores state in `localStorage` and client memory, duplicating database state

#### **Authentication Flow (BROKEN)**

**Current Implementation:**
```
User loads /dashboard
→ Client Component Layout checks auth via useEffect
→ Calls checkAuth() which does api.get('/auth/me')
→ Shows loading spinner
→ Gets user data
→ Renders page
```

**Problems:**
- EVERY protected page shows a loading spinner on initial load
- User data is always fetched client-side, never server-rendered
- `isLoading` state bug (fixed per memory, but symptom not cause)
- No Server Component reads user session during SSR
- Auth tokens in localStorage instead of httpOnly cookies

#### **Dashboard Metrics Flow (BROKEN)**

**Current Implementation:**
```typescript
// dashboard/page.tsx
export default function DashboardPage() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetch('/api/v1/analytics/dashboard-metrics')
      .then(r => r.json())
      .then(setMetrics)
      .finally(() => setLoading(false));
  }, []);
  
  return loading ? <Spinner /> : <Stats data={metrics} />;
}
```

**Problems:**
- Entire dashboard is a Client Component
- Metrics are NEVER server-rendered - always shows loading state first
- Direct fetch to backend instead of Next.js API route
- No caching, no revalidation strategy
- User sees empty page → spinner → data (3 states instead of 1)

### 1.2 Component Architecture Problems

#### **Client vs Server Components (WRONG)**

**Current State:**
- `app/(dashboard)/dashboard/page.tsx` - Client Component ❌
- `app/(dashboard)/layout.tsx` - Client Component ❌
- `app/(dashboard)/settings/demo-mode/page.tsx` - Client Component ✓ (correct)
- `app/(dashboard)/socials/page.tsx` - Neither (static) ⚠️

**What Should Be:**
- Dashboard page - Server Component with client islands ✓
- Dashboard layout - Server Component for auth check ✓
- Settings pages - Client Components ✓
- All data-display pages - Server Components with progressive enhancement ✓

#### **State Management Chaos**

**Multiple Sources of Truth:**
1. **Database** (PostgreSQL) - Stores `user.demo_mode`, `user.approval_status`, etc.
2. **Zustand** (`useAuth`) - Caches user object in client memory
3. **LocalStorage** - Stores tokens, duplicates demo mode state
4. **DemoModeContext** - ANOTHER client state layer for demo mode
5. **Component useState** - Each page maintains its own state

**Result:** Same data exists in 5 places, constantly out of sync.

### 1.3 Missing Infrastructure

#### **No Next.js API Routes**
Your `frontend/app/api/` directory **doesn't exist**. Frontend talks directly to FastAPI:

```typescript
// lib/api.ts
export const api = axios.create({
  baseURL: 'https://revu-backend-production.up.railway.app/api/v1',
});
```

**Problems:**
- Can't do server-side auth validation
- Can't transform/sanitize data before sending to FastAPI
- Can't implement BFF (Backend for Frontend) pattern
- Can't use Next.js caching/revalidation
- Exposes internal backend URL to browser

#### **No Job/Task System for Long Operations**

When user enables demo mode:
```python
# demo.py
@router.post("/demo/enable")
async def enable_demo_mode(...):
    # This HTTP handler does EVERYTHING
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(f"{demo_service_url}/profiles", ...)
    
    current_user.demo_mode = True
    await session.commit()
    return {"status": "demo_enabled"}
```

**Problems:**
- HTTP request blocks while demo service creates profile
- If demo service is slow, user waits
- No status tracking (is it enabling? enabled? failed?)
- User can't close browser during operation
- No retry mechanism if it fails

#### **No Real-Time Updates**

Demo interactions are created by background service and sent via webhook, but:
- Frontend has no way to know when new interactions arrive
- Must manually refresh to see new data
- No WebSocket, Server-Sent Events, or polling system
- Makes the app feel "stuck" and unresponsive

---

## Part 2: The Gold Standard Architecture

### 2.1 Fundamental Principles

**1. Database is Source of Truth**
- ALL persistent state lives in PostgreSQL
- Application reads from database, never from memory/cache for authoritative data
- UI displays what's in the database, not what we hope is in the database

**2. Backend Owns Business Logic**
- FastAPI handles ALL state mutations
- FastAPI orchestrates external services (demo simulator, OAuth providers)
- FastAPI manages background jobs and async operations

**3. Next.js is the Server Layer**
- Server Components render initial state from database
- API routes authenticate requests and proxy to FastAPI
- Client Components only for true interactivity
- Cookies for auth, not localStorage

**4. Client is Presentation Only**
- Displays data from server
- Captures user intent (button clicks, form submissions)
- Shows optimistic updates while server processes
- Never makes authoritative decisions

### 2.2 Correct Data Flows

#### **Demo Mode Flow (FIXED)**

```
User clicks "Enable Demo"
→ POST /api/demo/enable (Next.js API route)
  → Validates session
  → POST /api/v1/demo/enable (FastAPI)
    → Updates user.demo_mode_status = 'enabling'
    → Creates background task
    → Returns {status: 'enabling', job_id: 'xxx'}
  → Returns to client
→ Client shows optimistic "Enabling..." state
→ Client polls /api/demo/status OR subscribes to SSE
→ Background task:
  → Calls demo service
  → Demo service generates content
  → Webhooks back to FastAPI
  → Updates user.demo_mode_status = 'enabled'
  → Stores demo credentials
→ Frontend sees status change
→ Redirects or updates UI

User refreshes page mid-process:
→ Server Component reads user.demo_mode_status from DB
→ Sees 'enabling'
→ Renders "Demo mode is being set up..." immediately
→ Client component polls for completion
```

**Key Changes:**
- Database tracks state: `demo_mode_status ENUM('disabled', 'enabling', 'enabled', 'disabling', 'failed')`
- Operation runs in background, survives browser close
- Server-rendered initial state - no loading spinner
- Client polls or uses SSE for updates

#### **Authentication Flow (FIXED)**

```
User visits /dashboard
→ Next.js middleware or Server Component:
  → Reads session from httpOnly cookie
  → If no session → redirect /login
  → Validates JWT
  → Fetches user from database
→ Server Component receives user object
→ Renders page with user data
→ HTML sent to browser already contains:
  - Username
  - Demo mode status
  - Dashboard metrics (or placeholders)
→ Client Component islands hydrate for interactivity
→ No loading spinner, no flash of wrong content
```

**Key Changes:**
- Move tokens from localStorage to httpOnly cookies
- Create Next.js middleware for auth check
- Server Components read session and fetch data
- Client never sees loading state for data that should be known server-side

#### **Dashboard Metrics (FIXED)**

```typescript
// app/(dashboard)/dashboard/page.tsx (SERVER COMPONENT)
import { getServerSession } from '@/lib/auth-server';
import { getMetrics } from '@/lib/metrics';

export default async function DashboardPage() {
  const session = await getServerSession();
  const metrics = await getMetrics(session.userId);
  const demoStatus = await getDemoStatus(session.userId);
  
  return (
    <div>
      {demoStatus.enabled && <DemoBanner profile={demoStatus.profile} />}
      <MetricsGrid data={metrics} />
      <InteractiveSection userId={session.userId} />
    </div>
  );
}
```

**Key Changes:**
- Entire page is Server Component
- Data fetched during SSR
- Browser receives fully-rendered HTML
- Interactive parts are Client Component islands
- Data cached and revalidated server-side

