# Repruv AI Coding Agent Instructions

## Architecture Overview

Repruv is an AI-powered social media management platform with a **FastAPI backend** (`backend/`) and **Next.js 14 App Router frontend** (`frontend/`).

### Backend Structure (`backend/app/`)
- **API endpoints**: `api/v1/endpoints/` - FastAPI routers organized by feature (auth, agency, monetization, chat, youtube, etc.)
- **Services**: `services/` - Business logic layer (70+ service files for AI, platform integrations, automation)
- **Models**: `models/` - SQLAlchemy ORM models using async PostgreSQL (`asyncpg`)
- **Core**: `core/config.py` (Pydantic settings), `core/database.py` (async session management)

### Frontend Structure (`frontend/`)
- **App Router**: `app/` with route groups - `(dashboard)/`, `(auth)/`, `(agency)/`, `(landing)/`
- **Components**: `components/` organized by domain (agency, dashboard, monetization, ui)
- **State**: Zustand stores in `store/`, React contexts in `contexts/`
- **API Client**: `lib/api.ts` - Axios with token refresh interceptor

### Key Data Flow
Frontend uses `lib/api.ts` → FastAPI backend at Railway (`https://revu-backend-production.up.railway.app/api/v1`) → Supabase PostgreSQL with async sessions.

## Critical Development Commands

```bash
# Backend (from backend/)
alembic upgrade head          # Run migrations (ALWAYS before backend changes)
uvicorn app.main:app --reload # Start dev server
celery -A app.core.celery worker -Q default --loglevel=info  # Background jobs

# Frontend (from frontend/)
npm run dev      # Next.js dev with Turbopack
npm run build    # Production build (validates before deploy)
```

## Database Conventions

- **Migrations**: `backend/alembic/versions/` - Filename pattern: `YYYYMMDD_HHMM_description.py`
- **Models use async**: Always use `AsyncSession` from `get_async_session()`, never sync queries
- **UUIDs everywhere**: All primary keys are UUID type
- **Timestamps**: Use `DateTime(timezone=True)` with UTC

```python
# Correct async pattern:
from app.core.database import get_async_session
async for session in get_async_session():
    result = await session.execute(select(User).where(User.id == user_id))
```

## Frontend Patterns

### Component Architecture
- **Dashboard pages are Client Components** with `"use client"` - they fetch via `useEffect`
- **UI components**: Use Shadcn/ui in `components/ui/` with Radix primitives
- **Auth state**: `useAuth` from `lib/auth.ts` (Zustand) - check `isAuthenticated`, `user`

### Styling System (Retro-Futurism Theme)
- **Colors**: Use CSS variables `--holo-purple`, `--holo-teal` defined in `globals.css`
- **Gradients**: Primary buttons use `bg-gradient-to-r from-holo-purple to-holo-purple-light`
- **Glass effects**: Apply `glass-panel` or `card` classes for glassmorphic surfaces
- **Animations**: Framer Motion for complex animations, CSS transitions for simple ones

```tsx
// Button variants follow this pattern (see components/ui/button.tsx):
<Button variant="default">Primary Action</Button>  // Purple gradient
<Button variant="secondary">Secondary</Button>     // Teal gradient
<Button variant="outline">Outline</Button>         // Glass border
```

## API Conventions

### Backend Endpoints
- All routes prefixed with `/api/v1/` (configured in `core/config.py`)
- Auth endpoints: `/auth/login`, `/auth/me`, `/auth/refresh`
- Protected routes use `Depends(get_current_user)` or `Depends(get_current_admin_user)`

### Adding New Features
1. Create model in `models/` → Create migration with `alembic revision --autogenerate -m "description"`
2. Add schemas in `schemas/` for request/response validation
3. Create service in `services/` for business logic
4. Add endpoint in `api/v1/endpoints/` → Register in `api/v1/api.py`

## Demo Mode & Testing

The platform has an extensive demo mode system for testing without real social accounts:
- Demo accounts seeded via `backend/scripts/seed_demo_accounts.py`
- Demo mode toggle in user settings enables simulated platform data
- Test credentials: `admin@repruv.dev` / `Demo2025!`

## Environment Variables

Backend requires: `DATABASE_URL`, `SECRET_KEY`, `REDIS_URL`, `OPENAI_API_KEY`
Frontend requires: `NEXT_PUBLIC_API_URL` (defaults to production Railway URL if unset)

## Important Files to Reference

- [backend/app/api/v1/api.py](backend/app/api/v1/api.py) - All API route registrations
- [backend/app/models/__init__.py](backend/app/models/__init__.py) - All model exports
- [frontend/lib/api.ts](frontend/lib/api.ts) - API client configuration
- [frontend/lib/auth.ts](frontend/lib/auth.ts) - Auth state management
- [frontend/tailwind.config.ts](frontend/tailwind.config.ts) - Design system colors
- [frontend/app/globals.css](frontend/app/globals.css) - CSS variables and theme
