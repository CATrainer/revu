# Production Architecture Refactor - Implementation Plan

## Overview
Transform Repruv from client-heavy SPA to production-grade server-first architecture.

---

## Refactor Phases

### **Phase 1: Foundation - Authentication & Sessions**

#### 1.1 Move Auth to httpOnly Cookies
**Current:** Tokens in localStorage  
**Target:** Secure httpOnly cookies

**Changes:**
- Backend: Add cookie-based session endpoints
- Create `user_sessions` table
- Update `auth.py` to set cookies instead of returning tokens
- Frontend: Remove localStorage token management
- Add Next.js middleware to read cookies

**Files:**
- `backend/app/api/v1/endpoints/auth.py`
- `backend/app/models/session.py` (new)
- `frontend/middleware.ts` (new)
- `frontend/lib/auth.ts`

#### 1.2 Create Server-Side Auth Utilities
**Files to create:**
- `frontend/lib/auth-server.ts` - Server Component auth
- `frontend/lib/session.ts` - Session management

```typescript
// lib/auth-server.ts
import { cookies } from 'next/headers';

export async function getServerSession() {
  const sessionToken = cookies().get('session_token');
  if (!sessionToken) return null;
  
  // Validate with backend
  const res = await fetch(`${API_URL}/auth/session`, {
    headers: { Cookie: `session_token=${sessionToken.value}` }
  });
  
  if (!res.ok) return null;
  return res.json();
}
```

---

### **Phase 2: Database Schema Updates**

#### 2.1 Add State Tracking Fields
**Migration file:** `backend/alembic/versions/xxx_add_state_tracking.py`

```sql
-- Demo mode state
ALTER TABLE users ADD COLUMN demo_mode_status VARCHAR(20) DEFAULT 'disabled';
ALTER TABLE users ADD COLUMN demo_mode_error TEXT;

-- Platform connection state  
ALTER TABLE platform_connections ADD COLUMN connection_status VARCHAR(20) DEFAULT 'disconnected';
ALTER TABLE platform_connections ADD COLUMN connection_error TEXT;
```

#### 2.2 Create Background Jobs Table
```sql
CREATE TABLE background_jobs (
    id UUID PRIMARY KEY,
    job_type VARCHAR(50) NOT NULL,
    user_id UUID REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'pending',
    result_data JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);
```

#### 2.3 Migrate Existing Data
```sql
-- Set demo_mode_status based on demo_mode boolean
UPDATE users SET demo_mode_status = 
  CASE WHEN demo_mode THEN 'enabled' ELSE 'disabled' END;
```

---

### **Phase 3: Backend Refactor - Async Operations**

#### 3.1 Create Background Job Service
**File:** `backend/app/services/background_jobs.py`

```python
class BackgroundJobService:
    async def create_job(self, job_type: str, user_id: UUID) -> BackgroundJob:
        job = BackgroundJob(job_type=job_type, user_id=user_id)
        self.db.add(job)
        await self.db.commit()
        return job
    
    async def get_job_status(self, job_id: UUID) -> dict:
        job = await self.db.get(BackgroundJob, job_id)
        return {"status": job.status, "result": job.result_data}
```

#### 3.2 Refactor Demo Enable Endpoint
**File:** `backend/app/api/v1/endpoints/demo.py`

```python
@router.post("/demo/enable")
async def enable_demo_mode(
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
    background_tasks: BackgroundTasks,
):
    # 1. Immediately update status to 'enabling'
    current_user.demo_mode_status = 'enabling'
    await session.commit()
    
    # 2. Create background job
    job = BackgroundJob(job_type='demo_enable', user_id=current_user.id)
    session.add(job)
    await session.commit()
    
    # 3. Queue async task
    background_tasks.add_task(process_demo_enable, str(current_user.id), str(job.id))
    
    # 4. Return immediately
    return {
        "status": "enabling",
        "job_id": str(job.id),
        "message": "Demo mode is being enabled"
    }
```

#### 3.3 Create Async Task Handlers
**File:** `backend/app/tasks/demo.py`

```python
async def process_demo_enable(user_id: str, job_id: str):
    async with get_async_session_context() as db:
        try:
            job = await db.get(BackgroundJob, UUID(job_id))
            job.status = 'running'
            job.started_at = datetime.utcnow()
            await db.commit()
            
            # Call demo service
            async with httpx.AsyncClient() as client:
                response = await client.post(f"{DEMO_SERVICE_URL}/profiles", ...)
            
            # Update user
            user = await db.get(User, UUID(user_id))
            user.demo_mode_status = 'enabled'
            user.demo_profile_id = response.json()['id']
            
            # Mark job complete
            job.status = 'completed'
            job.completed_at = datetime.utcnow()
            job.result_data = response.json()
            
            await db.commit()
            
        except Exception as e:
            # Mark as failed
            user.demo_mode_status = 'failed'
            user.demo_mode_error = str(e)
            job.status = 'failed'
            job.error_message = str(e)
            await db.commit()
```

---

### **Phase 4: Frontend Refactor - Server Components**

#### 4.1 Create Next.js API Routes
**Files to create:**
- `frontend/app/api/auth/session/route.ts`
- `frontend/app/api/demo/enable/route.ts`
- `frontend/app/api/demo/status/route.ts`

```typescript
// app/api/demo/enable/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth-server';

export async function POST(req: NextRequest) {
  // 1. Validate session
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // 2. Forward to FastAPI
  const response = await fetch(`${BACKEND_URL}/api/v1/demo/enable`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(await req.json()),
  });
  
  // 3. Return result
  return NextResponse.json(await response.json());
}
```

#### 4.2 Convert Dashboard to Server Component
**File:** `frontend/app/(dashboard)/dashboard/page.tsx`

```typescript
// SERVER COMPONENT - no 'use client'
import { getServerSession } from '@/lib/auth-server';
import { getDemoStatus } from '@/lib/demo-server';
import { getMetrics } from '@/lib/metrics-server';
import { DemoBanner } from '@/components/demo/DemoBanner';
import { MetricsGrid } from '@/components/dashboard/MetricsGrid';

export default async function DashboardPage() {
  const session = await getServerSession();
  
  // Fetch data server-side in parallel
  const [demoStatus, metrics] = await Promise.all([
    getDemoStatus(session.userId),
    getMetrics(session.userId),
  ]);
  
  return (
    <div>
      {demoStatus.status === 'enabled' && (
        <DemoBanner profile={demoStatus.profile} />
      )}
      
      {demoStatus.status === 'enabling' && (
        <EnableProcessingBanner jobId={demoStatus.jobId} />
      )}
      
      <MetricsGrid data={metrics} />
      
      {/* Client component for interactivity */}
      <PlatformConnectionsInteractive />
    </div>
  );
}
```

#### 4.3 Create Client Island for Real-Time Updates
**File:** `frontend/components/demo/EnableProcessingBanner.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';

export function EnableProcessingBanner({ jobId }: { jobId: string }) {
  const [status, setStatus] = useState('enabling');
  
  useEffect(() => {
    // Poll for job status
    const interval = setInterval(async () => {
      const res = await fetch(`/api/jobs/${jobId}/status`);
      const data = await res.json();
      
      if (data.status === 'completed') {
        // Refresh page to show new state
        window.location.reload();
      } else if (data.status === 'failed') {
        setStatus('failed');
        clearInterval(interval);
      }
    }, 2000);
    
    return () => clearInterval(interval);
  }, [jobId]);
  
  return (
    <div className="banner">
      {status === 'enabling' && <Spinner />}
      Demo mode is being set up...
    </div>
  );
}
```

---

### **Phase 5: Remove Client State Management**

#### 5.1 Remove Unnecessary Zustand Stores
- Keep auth store only for client-side actions (login, logout)
- Remove server state from Zustand (metrics, demo status, etc.)
- Use Server Components + React Query for data fetching

#### 5.2 Remove localStorage Usage
**Find and replace pattern:**
```typescript
// OLD
localStorage.setItem('demo_mode', '1');

// NEW - not needed, server handles this
```

#### 5.3 Remove DemoModeContext
**Delete:** `frontend/contexts/DemoModeContext.tsx`  
**Reason:** Demo status comes from server, not client context

---

## Testing Strategy

### Unit Tests
- Backend job service tests
- State transition tests
- Migration tests

### Integration Tests
- Demo enable/disable flow
- Platform connection flow
- Session management

### E2E Tests
```typescript
test('demo mode enable survives page refresh', async () => {
  await page.click('[data-test="enable-demo"]');
  await page.waitForSelector('[data-test="demo-enabling"]');
  
  // Refresh page mid-process
  await page.reload();
  
  // Should still show enabling state
  expect(await page.textContent('[data-test="demo-banner"]'))
    .toContain('being set up');
});
```

---

## Rollout Plan

1. **Week 1:** Database migrations + backend job system
2. **Week 2:** Refactor demo mode endpoints
3. **Week 3:** Auth migration to cookies
4. **Week 4:** Convert dashboard to Server Components
5. **Week 5:** Remove client state, cleanup
6. **Week 6:** Testing + bug fixes

