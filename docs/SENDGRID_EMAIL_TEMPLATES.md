# SendGrid Email Templates Documentation

This document describes the email templates used by the Repruv notification system and how to set them up in SendGrid.

## Overview

Repruv uses SendGrid for transactional email delivery. The notification system supports two delivery modes:
- **Instant**: Emails sent immediately when notifications are created
- **Daily Digest**: Aggregated emails sent once per day at the user's preferred time

## Email Types

### Creator Notifications

| Template ID | Name | Trigger | Priority |
|-------------|------|---------|----------|
| `creator_engagement_spike` | Engagement Spike Alert | Content gets 2x+ average engagement | High |
| `creator_viral_content` | Viral Content Alert | Content reaches 10x average views | High |
| `creator_content_milestone` | Content Milestone | Content hits 1K/10K/100K/1M views | Normal |
| `creator_new_superfan` | New Superfan | Fan becomes top 5% engager | Normal |
| `creator_negative_sentiment` | Negative Sentiment Alert | >20% negative comments in 24h | High |
| `creator_deal_offer` | New Deal Offer | New deal/opportunity created | High |
| `creator_deal_update` | Deal Status Update | Deal status changes | Normal |
| `creator_payment_received` | Payment Received | Payment confirmed | Normal |
| `creator_platform_issue` | Platform Connection Issue | Platform disconnected or sync error | High |
| `creator_agency_invitation` | Agency Invitation | Invited to join agency | Normal |
| `creator_daily_digest` | Daily Digest | Aggregated daily notifications | Normal |

### Agency Notifications

| Template ID | Name | Trigger | Priority |
|-------------|------|---------|----------|
| `agency_deliverable_uploaded` | Deliverable Uploaded | Creator uploads deliverable | Normal |
| `agency_deliverable_due` | Deliverable Due Soon | Deliverable due within 48h | High |
| `agency_deliverable_overdue` | Deliverable Overdue | Deliverable past due date | Urgent |
| `agency_approval_needed` | Approval Needed | Content needs approval | High |
| `agency_deal_update` | Deal Stage Changed | Deal moves pipeline stages | Normal |
| `agency_deal_stagnant` | Deal Needs Attention | Deal inactive for 7+ days | Normal |
| `agency_invoice_paid` | Invoice Paid | Invoice payment received | Normal |
| `agency_invoice_overdue` | Invoice Overdue | Invoice past due date | High |
| `agency_creator_joined` | Creator Joined | Creator accepts invitation | Normal |
| `agency_task_assigned` | Task Assigned | Task assigned to user | Normal |
| `agency_task_due` | Task Due Soon | Task due within 24h | High |
| `agency_daily_digest` | Daily Digest | Aggregated daily notifications | Normal |

## SendGrid Setup

### 1. Create Dynamic Templates

1. Log into SendGrid Dashboard
2. Go to **Email API** → **Dynamic Templates**
3. Click **Create a Dynamic Template**
4. Name it according to the template IDs above

### 2. Template Variables

All templates receive these base variables:

```json
{
  "user_name": "John Doe",
  "user_email": "john@example.com",
  "notification_title": "Engagement Spike Detected!",
  "notification_message": "Your content is getting 3.5x more engagement than average!",
  "notification_priority": "high",
  "action_url": "https://app.repruv.com/analytics?content=123",
  "action_label": "View Analytics",
  "category": "Performance",
  "site_url": "https://app.repruv.com",
  "settings_url": "https://app.repruv.com/settings?tab=Notifications",
  "year": "2025"
}
```

### 3. Template HTML Structure

Use this base structure for all notification emails:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{notification_title}}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f7fb; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; padding: 24px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 24px;">
      <img src="https://app.repruv.com/logo.png" alt="Repruv" style="height: 32px;">
    </div>
    
    <!-- Main Card -->
    <div style="background: #ffffff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <!-- Priority indicator for high/urgent -->
      {{#if_eq notification_priority "urgent"}}
      <div style="border-left: 4px solid #ef4444; padding-left: 16px;">
      {{/if_eq}}
      {{#if_eq notification_priority "high"}}
      <div style="border-left: 4px solid #f59e0b; padding-left: 16px;">
      {{/if_eq}}
      {{#unless notification_priority}}
      <div>
      {{/unless}}
      
        <h1 style="font-size: 20px; font-weight: 600; color: #0f172a; margin: 0 0 8px 0;">
          {{notification_title}}
        </h1>
        
        <p style="font-size: 14px; color: #334155; line-height: 1.6; margin: 0 0 16px 0;">
          {{notification_message}}
        </p>
        
        {{#if action_url}}
        <a href="{{action_url}}" style="display: inline-block; background: #16a34a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500; font-size: 14px;">
          {{action_label}}
        </a>
        {{/if}}
        
      </div>
      
      <p style="font-size: 12px; color: #94a3b8; margin-top: 16px;">
        Category: {{category}}
      </p>
    </div>
    
    <!-- Footer -->
    <div style="text-align: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
      <p style="font-size: 12px; color: #64748b; margin: 0 0 8px 0;">
        You received this because you have email notifications enabled.
      </p>
      <p style="font-size: 12px; color: #64748b; margin: 0;">
        <a href="{{settings_url}}" style="color: #16a34a;">Manage preferences</a>
      </p>
      <p style="font-size: 12px; color: #94a3b8; margin-top: 16px;">
        © {{year}} Repruv
      </p>
    </div>
  </div>
</body>
</html>
```

### 4. Daily Digest Template

The daily digest template receives additional variables:

```json
{
  "notifications": [
    {
      "title": "Engagement Spike Detected!",
      "message": "Your content is getting 3.5x more engagement",
      "action_url": "https://app.repruv.com/analytics",
      "category": "Performance",
      "priority": "high"
    },
    {
      "title": "New Superfan Detected",
      "message": "@johndoe is now one of your top fans",
      "action_url": "https://app.repruv.com/fans/123",
      "category": "Audience",
      "priority": "normal"
    }
  ],
  "notification_count": 2,
  "dashboard_url": "https://app.repruv.com/dashboard"
}
```

Digest template structure:

```html
<h1>Your Daily Digest</h1>
<p>Here's what happened in the last 24 hours:</p>

{{#each notifications}}
<div style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
  <div style="font-weight: 500; color: #0f172a;">{{this.title}}</div>
  <div style="font-size: 13px; color: #64748b; margin-top: 4px;">{{this.message}}</div>
  {{#if this.action_url}}
  <a href="{{this.action_url}}" style="color: #16a34a; font-size: 12px;">View →</a>
  {{/if}}
</div>
{{/each}}

<a href="{{dashboard_url}}" style="...">Open Dashboard</a>
```

## Environment Variables

Add these to your backend `.env`:

```bash
# SendGrid Configuration
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxx

# Optional: Template IDs (if using SendGrid dynamic templates)
SENDGRID_TEMPLATE_ENGAGEMENT_SPIKE=d-xxxxxxxxxxxxxxxx
SENDGRID_TEMPLATE_VIRAL_CONTENT=d-xxxxxxxxxxxxxxxx
SENDGRID_TEMPLATE_DAILY_DIGEST=d-xxxxxxxxxxxxxxxx
# ... add more as needed

# Unsubscribe Group (for CAN-SPAM compliance)
SENDGRID_ASM_GROUP_ID_NOTIFICATIONS=12345
```

## Unsubscribe Groups

Create these unsubscribe groups in SendGrid:

1. **Notification Emails** (ID: store in `SENDGRID_ASM_GROUP_ID_NOTIFICATIONS`)
   - For all notification-related emails
   - Users can unsubscribe from notifications while keeping account emails

2. **Marketing Emails** (ID: store in `SENDGRID_ASM_GROUP_ID_MARKETING`)
   - For promotional content
   - Separate from transactional notifications

## Testing

1. Use SendGrid's "Send Test" feature in the template editor
2. Test with sample data matching the variable structure above
3. Verify emails render correctly on:
   - Gmail (web and mobile)
   - Outlook (web and desktop)
   - Apple Mail
   - Mobile email clients

## Monitoring

Monitor email delivery in SendGrid Dashboard:
- **Activity Feed**: Real-time delivery status
- **Statistics**: Open rates, click rates, bounces
- **Suppressions**: Bounces, spam reports, unsubscribes

Set up alerts for:
- Bounce rate > 5%
- Spam report rate > 0.1%
- Delivery failures

## Fallback Behavior

If SendGrid is unavailable or not configured:
1. System falls back to Resend email provider
2. Uses inline HTML templates (no dynamic templates)
3. Logs warning but doesn't fail notification creation

## Rate Limits

- SendGrid rate limit: 30 emails/minute (configured in Celery)
- Daily digest batching prevents burst sending
- Deduplication prevents spam to same user
