"""
Notification Email Service

Renders email templates for notifications.
"""

from typing import Tuple, List, Optional
from datetime import datetime

from app.models.notification import (
    CreatorNotification,
    CREATOR_NOTIFICATION_TYPES,
    AGENCY_NOTIFICATION_TYPES,
)
from app.models.agency_notification import AgencyNotification
from app.models.user import User
from app.core.config import settings


def _get_base_styles() -> str:
    """Common email styles."""
    return """
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f5f7fb; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 24px; }
        .card { background: #ffffff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .header { margin-bottom: 20px; }
        .logo { font-size: 24px; font-weight: 700; color: #16a34a; }
        .title { font-size: 20px; font-weight: 600; color: #0f172a; margin: 0 0 8px 0; }
        .message { font-size: 14px; color: #334155; line-height: 1.6; margin: 0 0 16px 0; }
        .button { display: inline-block; background: #16a34a; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500; font-size: 14px; }
        .button:hover { background: #15803d; }
        .footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center; }
        .priority-urgent { border-left: 4px solid #ef4444; padding-left: 16px; }
        .priority-high { border-left: 4px solid #f59e0b; padding-left: 16px; }
        .meta { font-size: 12px; color: #94a3b8; margin-top: 12px; }
    </style>
    """


def _get_priority_class(priority: str) -> str:
    """Get CSS class for priority."""
    if priority == 'urgent':
        return 'priority-urgent'
    elif priority == 'high':
        return 'priority-high'
    return ''


def render_creator_notification_email(
    notification: CreatorNotification,
    user: User,
) -> Tuple[str, str]:
    """
    Render email for a creator notification.
    
    Returns:
        Tuple of (subject, html_content)
    """
    type_config = CREATOR_NOTIFICATION_TYPES.get(notification.type, {})
    category = type_config.get('category', 'notification')
    
    # Build subject
    subject = f"[Repruv] {notification.title}"
    if notification.priority == 'urgent':
        subject = f"🚨 {subject}"
    elif notification.priority == 'high':
        subject = f"⚠️ {subject}"
    
    # Build action button
    action_html = ""
    if notification.action_url:
        full_url = notification.action_url
        if not full_url.startswith('http'):
            full_url = f"{settings.FRONTEND_URL}{notification.action_url}"
        label = notification.action_label or "View Details"
        action_html = f'<a href="{full_url}" class="button">{label}</a>'
    
    priority_class = _get_priority_class(notification.priority)
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        {_get_base_styles()}
    </head>
    <body>
        <div class="container">
            <div class="card">
                <div class="header">
                    <div class="logo">Repruv</div>
                </div>
                <div class="{priority_class}">
                    <h1 class="title">{notification.title}</h1>
                    <p class="message">{notification.message or ''}</p>
                    {action_html}
                </div>
                <p class="meta">Category: {category.title()}</p>
            </div>
            <div class="footer">
                <p>You received this because you have email notifications enabled for {type_config.get('title', notification.type)}.</p>
                <p><a href="{settings.FRONTEND_URL}/settings?tab=Preferences">Manage notification preferences</a></p>
                <p>© {datetime.now().year} Repruv</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return subject, html


def render_agency_notification_email(
    notification: AgencyNotification,
    user: User,
) -> Tuple[str, str]:
    """
    Render email for an agency notification.
    
    Returns:
        Tuple of (subject, html_content)
    """
    type_config = AGENCY_NOTIFICATION_TYPES.get(notification.type, {})
    category = type_config.get('category', 'notification')
    
    # Build subject
    subject = f"[Repruv Agency] {notification.title}"
    if notification.priority == 'urgent':
        subject = f"🚨 {subject}"
    elif notification.priority == 'high':
        subject = f"⚠️ {subject}"
    
    # Build action button
    action_html = ""
    if notification.link_url:
        full_url = notification.link_url
        if not full_url.startswith('http'):
            full_url = f"{settings.FRONTEND_URL}{notification.link_url}"
        action_html = f'<a href="{full_url}" class="button">View Details</a>'
    
    priority_class = _get_priority_class(notification.priority)
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        {_get_base_styles()}
    </head>
    <body>
        <div class="container">
            <div class="card">
                <div class="header">
                    <div class="logo">Repruv Agency</div>
                </div>
                <div class="{priority_class}">
                    <h1 class="title">{notification.title}</h1>
                    <p class="message">{notification.description or ''}</p>
                    {action_html}
                </div>
                <p class="meta">Category: {category.title()}</p>
            </div>
            <div class="footer">
                <p>You received this because you have email notifications enabled for {type_config.get('title', notification.type)}.</p>
                <p><a href="{settings.FRONTEND_URL}/agency/settings/notifications">Manage notification preferences</a></p>
                <p>© {datetime.now().year} Repruv</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return subject, html


def render_daily_digest_email(
    user: User,
    notifications: List[CreatorNotification],
    is_agency: bool = False,
) -> Tuple[str, str]:
    """
    Render daily digest email with multiple notifications.
    
    Returns:
        Tuple of (subject, html_content)
    """
    count = len(notifications)
    subject = f"[Repruv] Your Daily Digest - {count} notification{'s' if count != 1 else ''}"
    
    # Group by category
    by_category = {}
    type_defs = AGENCY_NOTIFICATION_TYPES if is_agency else CREATOR_NOTIFICATION_TYPES
    
    for notif in notifications:
        type_config = type_defs.get(notif.type, {})
        category = type_config.get('category', 'other')
        if category not in by_category:
            by_category[category] = []
        by_category[category].append(notif)
    
    # Build notification items HTML
    items_html = ""
    for category, notifs in by_category.items():
        items_html += f'<h3 style="font-size: 14px; color: #64748b; margin: 16px 0 8px 0; text-transform: uppercase;">{category.replace("_", " ").title()}</h3>'
        
        for notif in notifs:
            priority_style = ""
            if notif.priority == 'urgent':
                priority_style = "border-left: 3px solid #ef4444; padding-left: 12px;"
            elif notif.priority == 'high':
                priority_style = "border-left: 3px solid #f59e0b; padding-left: 12px;"
            
            action_link = ""
            action_url = getattr(notif, 'action_url', None) or getattr(notif, 'link_url', None)
            if action_url:
                full_url = action_url if action_url.startswith('http') else f"{settings.FRONTEND_URL}{action_url}"
                action_link = f'<a href="{full_url}" style="color: #16a34a; font-size: 12px;">View →</a>'
            
            items_html += f"""
            <div style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; {priority_style}">
                <div style="font-weight: 500; color: #0f172a;">{notif.title}</div>
                <div style="font-size: 13px; color: #64748b; margin-top: 4px;">{getattr(notif, 'message', '') or getattr(notif, 'description', '') or ''}</div>
                {action_link}
            </div>
            """
    
    settings_url = f"{settings.FRONTEND_URL}/agency/settings/notifications" if is_agency else f"{settings.FRONTEND_URL}/settings?tab=Preferences"
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        {_get_base_styles()}
    </head>
    <body>
        <div class="container">
            <div class="card">
                <div class="header">
                    <div class="logo">Repruv{'Agency' if is_agency else ''}</div>
                </div>
                <h1 class="title">Your Daily Digest</h1>
                <p class="message">Here's what happened in the last 24 hours:</p>
                
                <div style="margin-top: 16px;">
                    {items_html}
                </div>
                
                <div style="margin-top: 24px; text-align: center;">
                    <a href="{settings.FRONTEND_URL}/{'agency' if is_agency else 'dashboard'}" class="button">Open Dashboard</a>
                </div>
            </div>
            <div class="footer">
                <p>You're receiving this daily digest because of your notification preferences.</p>
                <p><a href="{settings_url}">Manage preferences</a> | <a href="{settings.FRONTEND_URL}">Open Repruv</a></p>
                <p>© {datetime.now().year} Repruv</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return subject, html
