# Monetization Engine V2

Complete revamp of the monetization system with a template library, project management, and Kanban-style task tracking.

## Overview

The V2 monetization engine replaces the previous hardcoded system with:
- **50+ curated templates** across 5 categories
- **Decision points** for project customization
- **Kanban board** for task management
- **AI recommendations** based on creator profile

## Architecture

### Backend

**Database Tables:**
- `monetization_templates` - Template library with action plans
- `monetization_projects` - User projects with customization
- `monetization_tasks` - Individual tasks with Kanban status

**Key Files:**
- `backend/app/models/monetization_v2.py` - SQLAlchemy models
- `backend/app/schemas/monetization_v2.py` - Pydantic schemas
- `backend/app/services/monetization_template_service.py` - Template queries
- `backend/app/services/monetization_project_service.py` - Project/task management
- `backend/app/api/v1/endpoints/monetization_v2.py` - API endpoints
- `backend/scripts/seed_monetization_templates.py` - Database seeder

### Frontend

**Pages:**
- `/monetization-v2` - Main dashboard with project list
- `/monetization-v2/new` - Template browser and project creation
- `/monetization-v2/project/[id]` - Project detail with Kanban board

**Components:**
- `TemplateBrowser` - Filterable template grid
- `ProjectCreationFlow` - Multi-step project setup with decision points
- `KanbanBoard` - Task management by phase

**Types & API:**
- `frontend/types/monetization-v2.ts` - TypeScript types
- `frontend/lib/monetization-v2-api.ts` - API client

## Template Categories

1. **Digital Products** (20 templates)
   - Online courses, e-books, presets, templates, memberships, newsletters

2. **Services** (20 templates)
   - Coaching, consulting, workshops, speaking, done-for-you services

3. **Physical Products** (15 templates)
   - Merchandise, subscription boxes, art prints, planners

4. **Partnerships** (20 templates)
   - Sponsorships, affiliate marketing, brand ambassadorships, UGC

5. **Platform Features** (15 templates)
   - YouTube memberships, Twitch subs, Patreon, platform monetization

## API Endpoints

### Templates
- `GET /api/v1/monetization/v2/templates` - List all templates
- `GET /api/v1/monetization/v2/templates/{id}` - Get template details
- `GET /api/v1/monetization/v2/templates/recommendations` - AI recommendations

### Projects
- `POST /api/v1/monetization/v2/projects` - Create project
- `GET /api/v1/monetization/v2/projects` - List user projects
- `GET /api/v1/monetization/v2/projects/{id}` - Get project details
- `PATCH /api/v1/monetization/v2/projects/{id}` - Update project
- `DELETE /api/v1/monetization/v2/projects/{id}` - Delete project

### Tasks
- `GET /api/v1/monetization/v2/projects/{id}/tasks` - Get tasks by status
- `PATCH /api/v1/monetization/v2/tasks/{id}` - Update task
- `POST /api/v1/monetization/v2/tasks/{id}/reorder` - Reorder task (Kanban)

## Setup

### 1. Run Migration
```bash
cd backend
alembic upgrade head
```

### 2. Seed Templates
```bash
cd backend
python -m scripts.seed_monetization_templates
```

### 3. Access the UI
Navigate to `/monetization-v2` in the frontend.

## Data Model

### Template Structure
```typescript
{
  id: string,
  category: string,
  subcategory: string,
  title: string,
  description: string,
  prerequisites: string[],
  suitable_for: {
    min_followers: number,
    niches: string[],
    platforms: string[]
  },
  revenue_model: 'one-time' | 'recurring' | 'hybrid',
  expected_timeline: string,
  expected_revenue_range: { low: number, high: number, unit: string },
  decision_points: DecisionPoint[],
  action_plan: ActionPhase[]
}
```

### Decision Point
```typescript
{
  key: string,
  label: string,
  type: 'select' | 'text' | 'number' | 'boolean',
  options?: { value: string, label: string }[],
  default?: any
}
```

### Action Phase
```typescript
{
  phase: number,
  phase_name: string,
  tasks: {
    id: string,
    title: string,
    description: string,
    estimated_hours?: number,
    depends_on_decisions?: string[]
  }[]
}
```

## Future Enhancements

1. **AI Plan Customization** - Use Claude to modify action plans based on decision values
2. **Progress Analytics** - Track completion rates and time spent
3. **Template Recommendations** - Improve AI matching algorithm
4. **Task Dependencies** - Add task dependency visualization
5. **Collaboration** - Allow team members on projects
