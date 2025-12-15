# Notification System Audit & Design Document

**Status: ✅ IMPLEMENTED**

## Executive Summary

This document outlines the complete notification system design for Repruv, covering both **Creator Dashboard** and **Agency Dashboard** notification types, triggers, data requirements, and implementation plan.

## Implementation Summary

The notification system has been fully implemented with the following components:

### Backend
- **Models**: `CreatorNotification`, `NotificationPreference` (V2), `NotificationDeliveryLog` in `backend/app/models/notification.py`
- **Service**: `NotificationService` in `backend/app/services/notification_service.py`
- **Email Service**: `notification_email_service.py` for rendering email templates
- **API Endpoints**: 
  - Creator: `/api/v1/notifications/*`
  - Agency: `/api/v1/agency/notifications/*`
- **Celery Tasks**: `backend/app/tasks/notifications.py` with scheduled jobs
- **Migration**: `20251215_1700_add_notification_tables.py`

### Frontend
- **Context**: `frontend/contexts/NotificationContext.tsx`
- **Components**: 
  - `frontend/components/notifications/NotificationBell.tsx` (creator)
  - `frontend/components/agency/NotificationsDropdown.tsx` (agency - updated)
- **API Routes**: `frontend/app/api/notifications/*` and `frontend/app/api/agency/notifications/*`
- **Settings**: Notifications tab added to creator settings page

### Configuration
- Email delivery: Instant or Daily Digest
- 90-day notification retention
- No quiet hours (per user request)
- No browser push notifications (per user request)

---

## Current State Analysis

### Existing Code

#### Backend
- **`AgencyNotification` model** exists in `backend/app/models/agency_notification.py`
  - Has types: deliverable_uploaded, deliverable_due, deliverable_overdue, invoice_paid, invoice_overdue, invoice_sent, deal_moved, deal_stagnant, deal_won, deal_lost, campaign_started, campaign_completed, creator_added, creator_removed, payment_received, payout_due, payout_completed, mention, comment, approval_needed, approval_granted, performance_milestone, system
  - Has priority levels: low, normal, high, urgent
  - Links to user_id, agency_id, entity_type, entity_id
  - **No API endpoints exist** for fetching/managing notifications
  - **No scheduled jobs** for generating notifications

- **Email infrastructure** exists via SendGrid in `backend/app/tasks/email.py`
  - `send_email()` task works with SendGrid and Resend fallback
  - Celery is configured with beat scheduler

#### Frontend
- **Agency**: `NotificationsDropdown.tsx` - Uses **hardcoded mock data**
- **Creator**: `NotificationCenter.tsx` - Calls API but falls back to **demo data**
- **Shared**: `NotificationCenter.tsx` - For automation suggestions only
- **No notification preferences page** exists
- **No real-time updates** (polling or SSE)

### What's Missing
1. Creator notification model (separate from agency)
2. Notification preferences model
3. API endpoints for notifications
4. Scheduled jobs for notification detection
5. Real-time notification delivery
6. Email templates for notifications
7. Notification preferences UI

---

## Notification Types Definition

### Creator Dashboard Notifications

| ID | Type | Title (Settings) | Category | Default | Route Function |
|----|------|------------------|----------|---------|----------------|
| 1 | `engagement_spike` | Engagement Spike Alert | Performance | ✅ On | `/dashboard` or content URL |
| 2 | `viral_content` | Viral Content Alert | Performance | ✅ On | Content URL |
| 3 | `new_superfan` | New Superfan Detected | Audience | ✅ On | `/fans/{fan_id}` |
| 4 | `superfan_activity` | Superfan Activity | Audience | ✅ On | `/fans/{fan_id}` |
| 5 | `negative_sentiment_spike` | Negative Sentiment Alert | Moderation | ✅ On | `/interactions?sentiment=negative` |
| 6 | `brand_mention` | Brand Mention | Opportunities | ✅ On | `/interactions/{id}` |
| 7 | `collab_opportunity` | Collaboration Opportunity | Opportunities | ✅ On | `/opportunities/{id}` |
| 8 | `deal_offer` | New Deal Offer | Deals | ✅ On | `/deals/{id}` |
| 9 | `deal_status_change` | Deal Status Update | Deals | ✅ On | `/deals/{id}` |
| 10 | `payment_received` | Payment Received | Deals | ✅ On | `/deals/{id}` |
| 11 | `content_milestone` | Content Milestone | Performance | ✅ On | Content URL |
| 12 | `weekly_summary` | Weekly Performance Summary | Insights | ✅ On | `/analytics` |
| 13 | `ai_insight` | AI-Generated Insight | Insights | ✅ On | `/ai-assistant` |
| 14 | `posting_reminder` | Best Time to Post | Scheduling | ⬜ Off | `/calendar` |
| 15 | `platform_connected` | Platform Connected | System | ✅ On | `/settings?tab=Integrations` |
| 16 | `platform_disconnected` | Platform Disconnected | System | ✅ On | `/settings?tab=Integrations` |
| 17 | `sync_error` | Sync Error | System | ✅ On | `/settings?tab=Integrations` |
| 18 | `agency_invitation` | Agency Invitation | Agency | ✅ On | `/agency/invitations` |
| 19 | `agency_task_assigned` | Task Assigned by Agency | Agency | ✅ On | `/tasks/{id}` |

### Agency Dashboard Notifications

| ID | Type | Title (Settings) | Category | Default | Route Function |
|----|------|------------------|----------|---------|----------------|
| 1 | `deliverable_uploaded` | Deliverable Uploaded | Campaigns | ✅ On | `/agency/campaigns/{campaign_id}` |
| 2 | `deliverable_due_soon` | Deliverable Due Soon (48h) | Campaigns | ✅ On | `/agency/campaigns/{campaign_id}` |
| 3 | `deliverable_overdue` | Deliverable Overdue | Campaigns | ✅ On | `/agency/campaigns/{campaign_id}` |
| 4 | `script_approval_needed` | Script Needs Approval | Campaigns | ✅ On | `/agency/campaigns/{campaign_id}` |
| 5 | `content_approval_needed` | Content Needs Approval | Campaigns | ✅ On | `/agency/campaigns/{campaign_id}` |
| 6 | `campaign_started` | Campaign Started | Campaigns | ✅ On | `/agency/campaigns/{campaign_id}` |
| 7 | `campaign_completed` | Campaign Completed | Campaigns | ✅ On | `/agency/campaigns/{campaign_id}` |
| 8 | `deal_stage_changed` | Deal Stage Changed | Pipeline | ✅ On | `/agency/pipeline/{deal_id}` |
| 9 | `deal_stagnant` | Deal Stagnant (7+ days) | Pipeline | ✅ On | `/agency/pipeline/{deal_id}` |
| 10 | `deal_won` | Deal Won | Pipeline | ✅ On | `/agency/pipeline/{deal_id}` |
| 11 | `deal_lost` | Deal Lost | Pipeline | ✅ On | `/agency/pipeline/{deal_id}` |
| 12 | `invoice_sent` | Invoice Sent | Finance | ✅ On | `/agency/finance/invoices/{id}` |
| 13 | `invoice_paid` | Invoice Paid | Finance | ✅ On | `/agency/finance/invoices/{id}` |
| 14 | `invoice_overdue` | Invoice Overdue | Finance | ✅ On | `/agency/finance/invoices/{id}` |
| 15 | `payout_due` | Creator Payout Due | Finance | ✅ On | `/agency/finance/payouts` |
| 16 | `payout_completed` | Payout Completed | Finance | ✅ On | `/agency/finance/payouts` |
| 17 | `creator_joined` | Creator Accepted Invitation | Team | ✅ On | `/agency/creators/{id}` |
| 18 | `creator_left` | Creator Left Agency | Team | ✅ On | `/agency/creators` |
| 19 | `team_member_joined` | Team Member Joined | Team | ✅ On | `/agency/team` |
| 20 | `mention` | You Were Mentioned | Collaboration | ✅ On | Entity URL |
| 21 | `comment_added` | Comment on Your Item | Collaboration | ✅ On | Entity URL |
| 22 | `task_assigned` | Task Assigned to You | Tasks | ✅ On | `/agency/tasks/{id}` |
| 23 | `task_due_soon` | Task Due Soon (24h) | Tasks | ✅ On | `/agency/tasks/{id}` |
| 24 | `task_overdue` | Task Overdue | Tasks | ✅ On | `/agency/tasks/{id}` |
| 25 | `performance_milestone` | Campaign Hit Milestone | Performance | ✅ On | `/agency/campaigns/{id}` |
| 26 | `weekly_summary` | Weekly Agency Summary | Insights | ✅ On | `/agency` |

---

## Trigger Definitions

### Creator Notifications

#### `engagement_spike`
**Trigger:** When content receives engagement (likes + comments) at 2x or more the creator's 30-day average within 24 hours of posting.
**Check Frequency:** Every 6 hours
**Deduplication:** One notification per content piece
**Data Required:**
- Content performance metrics (current)
- 30-day average engagement rate
- Content publish timestamp

#### `viral_content`
**Trigger:** When content reaches 10x the creator's average views within 48 hours of posting.
**Check Frequency:** Every 6 hours
**Deduplication:** One notification per content piece
**Data Required:**
- Content view count
- Average view count per content
- Content publish timestamp

#### `new_superfan`
**Trigger:** When a fan's engagement score crosses the "superfan" threshold (top 5% of engagers).
**Check Frequency:** Daily
**Deduplication:** One notification per fan becoming superfan
**Data Required:**
- Fan engagement scores
- Engagement score threshold

#### `superfan_activity`
**Trigger:** When a known superfan comments on new content.
**Check Frequency:** Real-time (on interaction creation)
**Deduplication:** Max 1 per superfan per day
**Data Required:**
- Fan superfan status
- Interaction records

#### `negative_sentiment_spike`
**Trigger:** When negative sentiment comments exceed 20% of total comments in the last 24 hours (min 10 comments).
**Check Frequency:** Every 6 hours
**Deduplication:** One notification per 24-hour period
**Data Required:**
- Interaction sentiment scores
- Interaction timestamps

#### `brand_mention`
**Trigger:** When a comment mentions a known brand or contains sponsorship-related keywords.
**Check Frequency:** Real-time (on interaction creation)
**Deduplication:** One per interaction
**Data Required:**
- Interaction content
- Brand keyword list

#### `deal_offer`
**Trigger:** When a new deal/opportunity is created for the creator.
**Check Frequency:** Real-time (on creation)
**Deduplication:** One per deal
**Data Required:**
- Deal records

#### `deal_status_change`
**Trigger:** When a deal's status changes.
**Check Frequency:** Real-time (on update)
**Deduplication:** One per status change
**Data Required:**
- Deal status history

#### `payment_received`
**Trigger:** When a payment is marked as received for the creator.
**Check Frequency:** Real-time (on payment record)
**Deduplication:** One per payment
**Data Required:**
- Payment records

#### `content_milestone`
**Trigger:** When content hits milestone views (1K, 10K, 100K, 1M, 10M).
**Check Frequency:** Every 6 hours
**Deduplication:** One per milestone per content
**Data Required:**
- Content view counts
- Milestone tracking (new field needed)

#### `weekly_summary`
**Trigger:** Every Monday at 9 AM user's timezone.
**Check Frequency:** Weekly (scheduled)
**Deduplication:** One per week
**Data Required:**
- Weekly aggregated metrics

#### `ai_insight`
**Trigger:** When AI generates a significant insight about content or audience.
**Check Frequency:** On AI analysis completion
**Deduplication:** Max 3 per day
**Data Required:**
- AI analysis results

#### `posting_reminder`
**Trigger:** 30 minutes before optimal posting time.
**Check Frequency:** Every 30 minutes
**Deduplication:** Max 1 per day
**Data Required:**
- Optimal posting times
- User timezone

#### `platform_connected` / `platform_disconnected`
**Trigger:** When platform OAuth completes or token expires/revokes.
**Check Frequency:** Real-time
**Deduplication:** One per event
**Data Required:**
- Platform connection status

#### `sync_error`
**Trigger:** When platform sync fails 3+ times consecutively.
**Check Frequency:** On sync failure
**Deduplication:** One per platform per day
**Data Required:**
- Sync logs

#### `agency_invitation`
**Trigger:** When creator receives agency invitation.
**Check Frequency:** Real-time
**Deduplication:** One per invitation
**Data Required:**
- Agency invitation records

#### `agency_task_assigned`
**Trigger:** When agency assigns task to creator.
**Check Frequency:** Real-time
**Deduplication:** One per task
**Data Required:**
- Task assignments

---

### Agency Notifications

#### `deliverable_uploaded`
**Trigger:** When a creator uploads a deliverable for review.
**Check Frequency:** Real-time (on upload)
**Recipients:** Campaign owner + team members with campaign access
**Data Required:**
- Deliverable records
- Campaign team assignments

#### `deliverable_due_soon`
**Trigger:** When a deliverable's due date is within 48 hours and status is not "completed".
**Check Frequency:** Every 6 hours
**Deduplication:** One per deliverable
**Recipients:** Assignee + campaign owner
**Data Required:**
- Deliverable due dates
- Deliverable status

#### `deliverable_overdue`
**Trigger:** When a deliverable's due date has passed and status is not "completed".
**Check Frequency:** Every 6 hours
**Deduplication:** One per deliverable (then daily reminder)
**Recipients:** Assignee + campaign owner + agency owner
**Data Required:**
- Deliverable due dates
- Deliverable status

#### `script_approval_needed` / `content_approval_needed`
**Trigger:** When deliverable status changes to "submitted" or "pending_approval".
**Check Frequency:** Real-time
**Recipients:** Campaign owner or designated approver
**Data Required:**
- Deliverable status
- Approval workflow

#### `campaign_started` / `campaign_completed`
**Trigger:** When campaign status changes to "in_progress" or "completed".
**Check Frequency:** Real-time
**Recipients:** All team members on campaign
**Data Required:**
- Campaign status

#### `deal_stage_changed`
**Trigger:** When deal moves to a new pipeline stage.
**Check Frequency:** Real-time
**Recipients:** Deal owner
**Data Required:**
- Deal stage history

#### `deal_stagnant`
**Trigger:** When deal hasn't moved stages in 7+ days and is not in "completed" or "lost" stage.
**Check Frequency:** Daily
**Deduplication:** One per deal per week
**Recipients:** Deal owner + agency owner
**Data Required:**
- Deal stage timestamps

#### `deal_won` / `deal_lost`
**Trigger:** When deal moves to "booked"/"completed" or "lost" stage.
**Check Frequency:** Real-time
**Recipients:** All team members
**Data Required:**
- Deal status

#### `invoice_sent` / `invoice_paid` / `invoice_overdue`
**Trigger:** On invoice status change or when due date passes.
**Check Frequency:** Real-time for status changes, daily for overdue check
**Recipients:** Finance team + agency owner
**Data Required:**
- Invoice records

#### `payout_due`
**Trigger:** When creator payout is scheduled within 7 days.
**Check Frequency:** Daily
**Recipients:** Finance team
**Data Required:**
- Payout schedules

#### `payout_completed`
**Trigger:** When payout is marked as completed.
**Check Frequency:** Real-time
**Recipients:** Finance team + creator
**Data Required:**
- Payout records

#### `creator_joined` / `creator_left`
**Trigger:** When creator accepts invitation or leaves agency.
**Check Frequency:** Real-time
**Recipients:** Agency owner + team leads
**Data Required:**
- Creator-agency relationships

#### `team_member_joined`
**Trigger:** When new team member accepts invitation.
**Check Frequency:** Real-time
**Recipients:** All team members
**Data Required:**
- Team member records

#### `mention`
**Trigger:** When user is @mentioned in a note or comment.
**Check Frequency:** Real-time
**Recipients:** Mentioned user
**Data Required:**
- Notes/comments with mentions

#### `comment_added`
**Trigger:** When someone comments on an entity the user owns/created.
**Check Frequency:** Real-time
**Recipients:** Entity owner
**Data Required:**
- Comment records

#### `task_assigned`
**Trigger:** When task is assigned to user.
**Check Frequency:** Real-time
**Recipients:** Assignee
**Data Required:**
- Task assignments

#### `task_due_soon`
**Trigger:** When task due date is within 24 hours and not completed.
**Check Frequency:** Every 6 hours
**Deduplication:** One per task
**Recipients:** Assignee
**Data Required:**
- Task due dates

#### `task_overdue`
**Trigger:** When task due date has passed and not completed.
**Check Frequency:** Every 6 hours
**Deduplication:** One per task (then daily)
**Recipients:** Assignee + task creator
**Data Required:**
- Task due dates

#### `performance_milestone`
**Trigger:** When campaign hits view/engagement milestones.
**Check Frequency:** Every 6 hours
**Deduplication:** One per milestone
**Recipients:** Campaign team
**Data Required:**
- Campaign performance metrics

#### `weekly_summary`
**Trigger:** Every Monday at 9 AM.
**Check Frequency:** Weekly
**Recipients:** All team members
**Data Required:**
- Weekly aggregated metrics

---

## Data Requirements & Schema Changes

### New Models Needed

#### 1. `CreatorNotification` (new model)
```python
class CreatorNotification(Base):
    __tablename__ = "creator_notifications"
    
    user_id = Column(UUID, ForeignKey("users.id"), nullable=False)
    type = Column(String(50), nullable=False)  # notification type identifier
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=True)
    priority = Column(String(20), default='normal')  # low, normal, high, urgent
    
    # Linking
    action_url = Column(String(500), nullable=True)
    entity_type = Column(String(50), nullable=True)
    entity_id = Column(UUID, nullable=True)
    
    # Status
    is_read = Column(Boolean, default=False)
    read_at = Column(DateTime, nullable=True)
    is_dismissed = Column(Boolean, default=False)
    dismissed_at = Column(DateTime, nullable=True)
    
    # Email tracking
    email_sent = Column(Boolean, default=False)
    email_sent_at = Column(DateTime, nullable=True)
    
    # Metadata
    data = Column(JSONB, default=dict)  # Additional context
    expires_at = Column(DateTime, nullable=True)
```

#### 2. `NotificationPreference` (new model)
```python
class NotificationPreference(Base):
    __tablename__ = "notification_preferences"
    
    user_id = Column(UUID, ForeignKey("users.id"), nullable=False, unique=True)
    
    # Global settings
    in_app_enabled = Column(Boolean, default=True)
    email_enabled = Column(Boolean, default=True)
    email_frequency = Column(String(20), default='instant')  # instant, hourly, daily
    
    # Quiet hours
    quiet_hours_enabled = Column(Boolean, default=False)
    quiet_hours_start = Column(String(5), nullable=True)  # "22:00"
    quiet_hours_end = Column(String(5), nullable=True)    # "08:00"
    timezone = Column(String(50), default='UTC')
    
    # Per-type settings (JSONB for flexibility)
    # Format: {"engagement_spike": {"in_app": true, "email": true}, ...}
    type_settings = Column(JSONB, default=dict)
    
    # Muted entities (don't notify about these)
    muted_entities = Column(JSONB, default=list)  # [{"type": "campaign", "id": "..."}]
```

#### 3. `NotificationDeliveryLog` (for deduplication)
```python
class NotificationDeliveryLog(Base):
    __tablename__ = "notification_delivery_logs"
    
    user_id = Column(UUID, ForeignKey("users.id"), nullable=False)
    notification_type = Column(String(50), nullable=False)
    entity_type = Column(String(50), nullable=True)
    entity_id = Column(UUID, nullable=True)
    dedup_key = Column(String(255), nullable=True)  # Custom dedup key
    delivered_at = Column(DateTime, nullable=False)
    
    # Index for fast lookups
    __table_args__ = (
        Index("idx_notif_delivery_dedup", "user_id", "notification_type", "entity_id", "dedup_key"),
    )
```

### Existing Model Updates

#### `ContentPiece` - Add milestone tracking
```python
# Add to content.py
milestones_reached = Column(JSONB, default=list)  # ["1k", "10k", "100k", ...]
```

#### `Fan` - Ensure superfan flag exists
```python
# Already has engagement_score, may need:
is_superfan = Column(Boolean, default=False)
became_superfan_at = Column(DateTime, nullable=True)
```

---

## API Endpoints

### Creator Notifications
```
GET    /api/v1/notifications                    # List notifications (paginated)
GET    /api/v1/notifications/unread-count       # Get unread count
POST   /api/v1/notifications/{id}/read          # Mark as read
POST   /api/v1/notifications/read-all           # Mark all as read
POST   /api/v1/notifications/{id}/dismiss       # Dismiss notification
GET    /api/v1/notifications/preferences        # Get preferences
PUT    /api/v1/notifications/preferences        # Update preferences
GET    /api/v1/notifications/stream             # SSE stream for real-time
```

### Agency Notifications
```
GET    /api/v1/agency/notifications             # List notifications
GET    /api/v1/agency/notifications/unread-count
POST   /api/v1/agency/notifications/{id}/read
POST   /api/v1/agency/notifications/read-all
POST   /api/v1/agency/notifications/{id}/dismiss
GET    /api/v1/agency/notifications/preferences
PUT    /api/v1/agency/notifications/preferences
GET    /api/v1/agency/notifications/stream      # SSE stream
```

---

## Scheduled Jobs (Celery Beat)

| Job Name | Schedule | Description |
|----------|----------|-------------|
| `check_engagement_spikes` | Every 6 hours | Detect engagement spikes for creators |
| `check_viral_content` | Every 6 hours | Detect viral content |
| `check_content_milestones` | Every 6 hours | Check for view milestones |
| `check_negative_sentiment` | Every 6 hours | Detect sentiment spikes |
| `check_superfans` | Daily at 3 AM | Update superfan status |
| `check_deliverable_deadlines` | Every 6 hours | Check approaching/overdue deliverables |
| `check_deal_stagnation` | Daily at 9 AM | Find stagnant deals |
| `check_task_deadlines` | Every 6 hours | Check approaching/overdue tasks |
| `check_invoice_status` | Daily at 9 AM | Check overdue invoices |
| `check_payout_schedules` | Daily at 9 AM | Check upcoming payouts |
| `send_weekly_summaries` | Monday 9 AM | Generate and send weekly summaries |
| `cleanup_old_notifications` | Daily at 2 AM | Archive notifications older than 90 days |

---

## Email Templates Required

### Creator Emails
1. `creator_engagement_spike` - Engagement spike alert
2. `creator_viral_content` - Viral content alert
3. `creator_new_superfan` - New superfan detected
4. `creator_deal_offer` - New deal offer
5. `creator_deal_update` - Deal status change
6. `creator_payment_received` - Payment confirmation
7. `creator_weekly_summary` - Weekly performance digest
8. `creator_platform_issue` - Platform connection issue
9. `creator_agency_invitation` - Agency invitation

### Agency Emails
1. `agency_deliverable_uploaded` - Creator uploaded deliverable
2. `agency_deliverable_due` - Deliverable due soon
3. `agency_deliverable_overdue` - Deliverable overdue
4. `agency_approval_needed` - Content needs approval
5. `agency_deal_update` - Deal stage changed
6. `agency_deal_stagnant` - Deal needs attention
7. `agency_invoice_paid` - Invoice paid
8. `agency_invoice_overdue` - Invoice overdue
9. `agency_creator_joined` - Creator joined agency
10. `agency_task_assigned` - Task assigned
11. `agency_task_due` - Task due soon
12. `agency_weekly_summary` - Weekly agency digest

---

## Implementation Plan

### Phase 1: Database & Models (Day 1)
1. Create migration for new tables
2. Implement CreatorNotification model
3. Implement NotificationPreference model
4. Implement NotificationDeliveryLog model
5. Update ContentPiece with milestones_reached
6. Update Fan with is_superfan

### Phase 2: Backend Service (Day 2)
1. Create NotificationService class
2. Implement notification creation logic
3. Implement preference management
4. Implement deduplication logic
5. Create API endpoints

### Phase 3: Scheduled Jobs (Day 3)
1. Create notification detection tasks
2. Configure Celery beat schedule
3. Implement each detector function
4. Add logging and monitoring

### Phase 4: Real-time Delivery (Day 4)
1. Implement SSE endpoint
2. Create notification broadcast mechanism
3. Handle connection management

### Phase 5: Email Integration (Day 5)
1. Create email templates
2. Integrate with SendGrid
3. Implement email sending logic
4. Create SendGrid setup documentation

### Phase 6: Frontend (Day 6-7)
1. Create notification context/hook
2. Build notification bell component
3. Build notification dropdown
4. Build notification preferences page
5. Integrate SSE for real-time updates

### Phase 7: Testing & Polish (Day 8)
1. End-to-end testing
2. Performance optimization
3. Documentation

---

## Questions for User

1. **Email frequency options**: Should we support "instant", "hourly digest", and "daily digest" for email notifications?

2. **Push notifications**: Do you want browser push notifications in addition to in-app and email?

3. **Notification retention**: How long should we keep notifications? (Suggested: 90 days)

4. **Weekly summary content**: What metrics should be included in the weekly summary emails?

5. **Quiet hours**: Should quiet hours apply to in-app notifications or just emails?
