# Agency Dashboard Setup Guide

This document outlines all the setup steps required to fully configure and deploy the Agency Dashboard for the Repruv platform.

## Table of Contents

1. [Overview](#overview)
2. [Frontend Setup](#frontend-setup)
3. [Backend API Endpoints](#backend-api-endpoints)
4. [Database Schema](#database-schema)
5. [Email Templates](#email-templates)
6. [Environment Variables](#environment-variables)
7. [Third-Party Integrations](#third-party-integrations)
8. [Deployment Checklist](#deployment-checklist)

---

## Overview

The Agency Dashboard is a comprehensive system for managing creator relationships, campaigns, finances, and reporting. The implementation includes:

### Frontend Components Created

| Component | Location | Description |
|-----------|----------|-------------|
| Enhanced Layout | `/components/agency/AgencyLayoutNew.tsx` | New navigation with workspace dropdown, global search, notifications |
| Global Search | `/components/agency/GlobalSearchModal.tsx` | Command palette (Cmd+K) for searching across all entities |
| Notifications | `/components/agency/NotificationsDropdown.tsx` | Real-time notification dropdown with tabs and grouping |
| Dashboard Widgets | `/components/agency/dashboard/` | 8 dashboard widgets for the home page |
| Dashboard Page | `/app/(agency)/agency/page.tsx` | Main dashboard with layout presets |
| Pipeline Page | `/app/(agency)/agency/pipeline/page.tsx` | Kanban board, list view, analytics |
| Campaigns Page | `/app/(agency)/agency/campaigns/page.tsx` | Campaign management with deliverables |
| Creators Page | `/app/(agency)/agency/creators/page.tsx` | Directory, availability, performance, groups |
| Finance Page | `/app/(agency)/agency/finance/page.tsx` | Invoices, payouts, analytics |
| Reports Page | `/app/(agency)/agency/reports/page.tsx` | Report builder with templates |

### API Client

| File | Location | Description |
|------|----------|-------------|
| Dashboard API | `/lib/agency-dashboard-api.ts` | TypeScript types and API client for all dashboard features |

---

## Frontend Setup

### 1. Install Dependencies

The dashboard uses existing project dependencies. Ensure these are installed:

```bash
cd frontend
npm install
```

### 2. Required UI Components

The dashboard uses these shadcn/ui components (already in the project):

- `card`, `button`, `input`, `badge`, `tabs`
- `dialog`, `dropdown-menu`, `select`, `checkbox`
- `avatar`, `progress`, `textarea`, `label`
- `command` (for global search)

### 3. Dark Mode Support

The dashboard supports dark mode via Tailwind's `dark:` prefix. Ensure your theme provider is configured.

---

## Backend API Endpoints

The following API endpoints need to be implemented to support all dashboard features:

### Dashboard Stats

```
GET /api/agency/dashboard/stats
Response: {
  active_campaigns: number,
  total_pipeline_value: number,
  pending_invoices: number,
  total_creators: number,
  pending_deliverables: number,
  overdue_items: number
}
```

### Pipeline/Deals

```
GET /api/agency/pipeline/deals
GET /api/agency/pipeline/deals/:id
POST /api/agency/pipeline/deals
PATCH /api/agency/pipeline/deals/:id
DELETE /api/agency/pipeline/deals/:id
POST /api/agency/pipeline/deals/:id/move  # Move to different stage
GET /api/agency/pipeline/stages
GET /api/agency/pipeline/analytics
```

### Campaigns

```
GET /api/agency/campaigns
GET /api/agency/campaigns/:id
POST /api/agency/campaigns
PATCH /api/agency/campaigns/:id
DELETE /api/agency/campaigns/:id
GET /api/agency/campaigns/:id/deliverables
POST /api/agency/campaigns/:id/deliverables
PATCH /api/agency/deliverables/:id
POST /api/agency/deliverables/:id/approve
POST /api/agency/deliverables/:id/request-revision
```

### Creators (Extended)

```
GET /api/agency/creators/directory  # Extended creator profiles
GET /api/agency/creators/:id/profile
GET /api/agency/creators/availability
PATCH /api/agency/creators/:id/availability
GET /api/agency/creators/performance
GET /api/agency/creators/groups
POST /api/agency/creators/groups
PATCH /api/agency/creators/groups/:id
DELETE /api/agency/creators/groups/:id
POST /api/agency/creators/:id/groups  # Add to group
```

### Finance

```
GET /api/agency/finance/overview
GET /api/agency/finance/invoices
GET /api/agency/finance/invoices/:id
POST /api/agency/finance/invoices
PATCH /api/agency/finance/invoices/:id
POST /api/agency/finance/invoices/:id/send
POST /api/agency/finance/invoices/:id/mark-paid
GET /api/agency/finance/payouts
POST /api/agency/finance/payouts
GET /api/agency/finance/analytics
```

### Reports

```
GET /api/agency/reports
GET /api/agency/reports/:id
POST /api/agency/reports
PATCH /api/agency/reports/:id
DELETE /api/agency/reports/:id
POST /api/agency/reports/:id/generate
GET /api/agency/reports/templates
GET /api/agency/reports/scheduled
```

### Notifications

```
GET /api/agency/notifications
PATCH /api/agency/notifications/:id/read
POST /api/agency/notifications/read-all
GET /api/agency/notifications/preferences
PATCH /api/agency/notifications/preferences
```

### Global Search

```
GET /api/agency/search?q=:query&type=:type
Response: {
  campaigns: [],
  creators: [],
  brands: [],
  invoices: [],
  reports: [],
  deals: []
}
```

---

## Database Schema

### New Tables Required

#### 1. Pipeline Deals

```sql
CREATE TABLE agency_deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES agencies(id),
    brand_name VARCHAR(255) NOT NULL,
    brand_contact_name VARCHAR(255),
    brand_contact_email VARCHAR(255),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    value DECIMAL(12, 2) NOT NULL DEFAULT 0,
    stage VARCHAR(50) NOT NULL DEFAULT 'lead',
    probability INTEGER DEFAULT 0,
    expected_close_date DATE,
    creator_ids UUID[] DEFAULT '{}',
    tags VARCHAR(100)[] DEFAULT '{}',
    notes TEXT,
    last_activity_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    closed_reason VARCHAR(50),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_agency_deals_agency ON agency_deals(agency_id);
CREATE INDEX idx_agency_deals_stage ON agency_deals(stage);
```

#### 2. Campaigns

```sql
CREATE TABLE agency_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES agencies(id),
    deal_id UUID REFERENCES agency_deals(id),
    title VARCHAR(255) NOT NULL,
    brand_name VARCHAR(255) NOT NULL,
    brand_logo_url VARCHAR(500),
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    budget DECIMAL(12, 2),
    spent DECIMAL(12, 2) DEFAULT 0,
    start_date DATE,
    end_date DATE,
    creator_ids UUID[] DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_agency_campaigns_agency ON agency_campaigns(agency_id);
CREATE INDEX idx_agency_campaigns_status ON agency_campaigns(status);
```

#### 3. Campaign Deliverables

```sql
CREATE TABLE campaign_deliverables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES agency_campaigns(id),
    creator_id UUID NOT NULL REFERENCES users(id),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    due_date DATE NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,
    published_at TIMESTAMP WITH TIME ZONE,
    published_url VARCHAR(500),
    file_url VARCHAR(500),
    revision_count INTEGER DEFAULT 0,
    feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_deliverables_campaign ON campaign_deliverables(campaign_id);
CREATE INDEX idx_deliverables_creator ON campaign_deliverables(creator_id);
CREATE INDEX idx_deliverables_status ON campaign_deliverables(status);
CREATE INDEX idx_deliverables_due_date ON campaign_deliverables(due_date);
```

#### 4. Creator Groups

```sql
CREATE TABLE creator_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES agencies(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(50) DEFAULT 'bg-gray-500',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(agency_id, name)
);

CREATE TABLE creator_group_members (
    group_id UUID NOT NULL REFERENCES creator_groups(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES users(id),
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (group_id, creator_id)
);
```

#### 5. Invoices

```sql
CREATE TABLE agency_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES agencies(id),
    campaign_id UUID REFERENCES agency_campaigns(id),
    invoice_number VARCHAR(50) NOT NULL,
    brand_name VARCHAR(255) NOT NULL,
    brand_email VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    due_date DATE,
    sent_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    line_items JSONB DEFAULT '[]',
    notes TEXT,
    pdf_url VARCHAR(500),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_invoices_agency ON agency_invoices(agency_id);
CREATE INDEX idx_invoices_status ON agency_invoices(status);
```

#### 6. Creator Payouts

```sql
CREATE TABLE creator_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES agencies(id),
    creator_id UUID NOT NULL REFERENCES users(id),
    campaign_id UUID REFERENCES agency_campaigns(id),
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    payment_method VARCHAR(50),
    transaction_id VARCHAR(255),
    paid_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payouts_agency ON creator_payouts(agency_id);
CREATE INDEX idx_payouts_creator ON creator_payouts(creator_id);
CREATE INDEX idx_payouts_status ON creator_payouts(status);
```

#### 7. Reports

```sql
CREATE TABLE agency_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES agencies(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    is_favorite BOOLEAN DEFAULT FALSE,
    sections VARCHAR(100)[] DEFAULT '{}',
    date_range_start DATE,
    date_range_end DATE,
    schedule VARCHAR(50),
    format VARCHAR(20) DEFAULT 'pdf',
    last_generated_at TIMESTAMP WITH TIME ZONE,
    file_url VARCHAR(500),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_reports_agency ON agency_reports(agency_id);
```

#### 8. Notifications

```sql
CREATE TABLE user_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    link_url VARCHAR(500),
    is_read BOOLEAN DEFAULT FALSE,
    is_actioned BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON user_notifications(user_id);
CREATE INDEX idx_notifications_read ON user_notifications(user_id, is_read);
CREATE INDEX idx_notifications_created ON user_notifications(created_at DESC);
```

---

## Email Templates

The following email templates need to be created for the notification system:

### 1. Creator Invitation Email

**Template ID:** `agency_creator_invitation`

```
Subject: You've been invited to join {{agency_name}}

Hi {{creator_name}},

{{inviter_name}} from {{agency_name}} has invited you to join their creator roster on Repruv.

As a member, you'll be able to:
- Receive and respond to sponsorship opportunities
- Track your campaign deliverables
- Get paid through the platform

Click the button below to accept this invitation:

[Accept Invitation] {{invitation_link}}

This invitation expires on {{expiration_date}}.

If you have any questions, reply to this email or contact {{agency_email}}.

Best,
The Repruv Team
```

### 2. Opportunity Notification Email

**Template ID:** `agency_opportunity_sent`

```
Subject: New Opportunity from {{agency_name}}: {{opportunity_title}}

Hi {{creator_name}},

{{agency_name}} has sent you a new sponsorship opportunity!

Campaign: {{opportunity_title}}
Brand: {{brand_name}}
Compensation: {{compensation_amount}}
Deadline: {{deadline}}

{{opportunity_description}}

[View Opportunity Details] {{opportunity_link}}

Please respond by {{response_deadline}}.

Best,
The Repruv Team
```

### 3. Invoice Email

**Template ID:** `agency_invoice_sent`

```
Subject: Invoice #{{invoice_number}} from {{agency_name}}

Hi {{brand_contact_name}},

Please find attached Invoice #{{invoice_number}} from {{agency_name}}.

Invoice Details:
- Amount: {{amount}}
- Due Date: {{due_date}}
- Campaign: {{campaign_name}}

[View Invoice] {{invoice_link}}

Payment Methods:
{{payment_instructions}}

If you have any questions about this invoice, please contact {{agency_email}}.

Best,
{{agency_name}}
```

### 4. Invoice Reminder Email

**Template ID:** `agency_invoice_reminder`

```
Subject: Reminder: Invoice #{{invoice_number}} is {{days_overdue}} days overdue

Hi {{brand_contact_name}},

This is a friendly reminder that Invoice #{{invoice_number}} for {{amount}} was due on {{due_date}} and is now {{days_overdue}} days overdue.

[View Invoice] {{invoice_link}}

If you've already sent payment, please disregard this message. Otherwise, please process payment at your earliest convenience.

Best,
{{agency_name}}
```

### 5. Deliverable Due Reminder

**Template ID:** `deliverable_due_reminder`

```
Subject: Reminder: {{deliverable_title}} is due {{due_text}}

Hi {{creator_name}},

This is a reminder that your deliverable is due soon:

Campaign: {{campaign_name}}
Deliverable: {{deliverable_title}}
Due Date: {{due_date}}

[View Deliverable] {{deliverable_link}}

If you have any questions or need an extension, please contact your agency.

Best,
The Repruv Team
```

### 6. Deliverable Status Update

**Template ID:** `deliverable_status_update`

```
Subject: {{status_text}}: {{deliverable_title}}

Hi {{creator_name}},

Your deliverable "{{deliverable_title}}" for {{campaign_name}} has been {{status_text}}.

{{#if feedback}}
Feedback from your agency:
"{{feedback}}"
{{/if}}

[View Details] {{deliverable_link}}

Best,
The Repruv Team
```

### 7. Weekly Activity Digest

**Template ID:** `agency_weekly_digest`

```
Subject: Your Weekly Agency Digest - {{week_range}}

Hi {{user_name}},

Here's what happened in your agency this week:

PIPELINE
- New deals: {{new_deals_count}}
- Deals closed: {{closed_deals_count}}
- Total pipeline value: {{pipeline_value}}

CAMPAIGNS
- Active campaigns: {{active_campaigns}}
- Deliverables completed: {{deliverables_completed}}
- Deliverables pending review: {{pending_review}}

FINANCE
- Invoices sent: {{invoices_sent}}
- Payments received: {{payments_received}}
- Outstanding: {{outstanding_amount}}

[View Dashboard] {{dashboard_link}}

Best,
The Repruv Team
```

---

## Environment Variables

Add these environment variables to your `.env` file:

```env
# Email Configuration (for notifications)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your_sendgrid_api_key
FROM_EMAIL=notifications@repruv.com
FROM_NAME=Repruv

# File Storage (for reports, invoices, deliverables)
AWS_S3_BUCKET=repruv-agency-files
AWS_S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# Report Generation
REPORT_GENERATION_TIMEOUT=300  # seconds
REPORT_MAX_SIZE_MB=50

# Notification Settings
NOTIFICATION_BATCH_SIZE=100
NOTIFICATION_RETENTION_DAYS=90

# Real-time Updates (optional)
PUSHER_APP_ID=your_app_id
PUSHER_KEY=your_key
PUSHER_SECRET=your_secret
PUSHER_CLUSTER=us2
```

---

## Third-Party Integrations

### 1. Email Service (SendGrid/Postmark)

Configure your email service for transactional emails:

1. Create account at SendGrid or Postmark
2. Verify your sending domain
3. Create email templates using the content above
4. Add API credentials to environment variables

### 2. File Storage (AWS S3)

Set up S3 bucket for storing:
- Report PDFs
- Invoice documents
- Deliverable files
- Creator avatars

Bucket policy:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadForAgencyFiles",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::repruv-agency-files/*"
        }
    ]
}
```

### 3. Real-time Updates (Optional)

For real-time notifications and updates, integrate Pusher or similar:

1. Create Pusher account
2. Create app for your project
3. Add credentials to environment variables
4. Implement WebSocket connections in frontend

### 4. PDF Generation

For report generation, you can use:
- **Puppeteer** - Headless Chrome for HTML to PDF
- **react-pdf** - React-based PDF generation
- **jsPDF** - Client-side PDF generation

---

## Deployment Checklist

### Pre-Deployment

- [ ] All database migrations created and tested
- [ ] API endpoints implemented and documented
- [ ] Email templates created in email service
- [ ] S3 bucket configured with proper permissions
- [ ] Environment variables set in production
- [ ] CORS configured for production domains

### Frontend Deployment

- [ ] Build succeeds without errors: `npm run build`
- [ ] All TypeScript types are correct
- [ ] Images and assets optimized
- [ ] Environment variables configured for production

### Backend Deployment

- [ ] Database migrations applied
- [ ] API endpoints tested with production database
- [ ] Rate limiting configured
- [ ] Error monitoring set up (Sentry, etc.)
- [ ] Logging configured

### Post-Deployment

- [ ] Smoke test all major features
- [ ] Verify email delivery
- [ ] Test file uploads
- [ ] Verify real-time updates (if configured)
- [ ] Monitor error rates and performance

---

## Feature Flags (Optional)

Consider implementing feature flags for gradual rollout:

```typescript
// lib/features.ts
export const features = {
  PIPELINE_KANBAN: true,
  REPORTS_BUILDER: true,
  CREATOR_AVAILABILITY_GRID: true,
  REAL_TIME_NOTIFICATIONS: false, // Enable when Pusher configured
  SCHEDULED_REPORTS: false, // Enable when cron jobs configured
};
```

---

## Support

For questions or issues with the Agency Dashboard setup:

1. Check the existing documentation
2. Review the API implementation guide
3. Contact the development team

---

*Last Updated: November 2024*
