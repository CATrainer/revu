"""Email sending tasks."""

from datetime import datetime, timedelta
from typing import Dict, List

from celery import shared_task
from loguru import logger

import asyncio
from sqlalchemy import select, func

from app.core.database import async_session_maker
from app.models.user import User
from app.core.celery import celery_app
from app.core.config import settings


@celery_app.task(name="app.tasks.email.send_email")
def send_email(
    to: str,
    subject: str,
    html_content: str,
    from_email: str | None = None,
) -> bool:
    """
    Send an email using SendGrid if configured, otherwise Resend.

    Args:
        to: Recipient email address
        subject: Email subject
        html_content: HTML content of the email
        from_email: Sender email (defaults to settings)

    Returns:
        bool: Success status
    """
    # Prefer SendGrid if API key is available
    if getattr(settings, "SENDGRID_API_KEY", None):
        try:
            from sendgrid import SendGridAPIClient
            from sendgrid.helpers.mail import Mail, From, To, Content

            message = Mail(
                from_email=From(from_email or str(settings.EMAIL_FROM_ADDRESS), settings.EMAIL_FROM_NAME),
                to_emails=[To(to)],
                subject=subject,
                html_content=Content("text/html", html_content),
            )
            sg = SendGridAPIClient(settings.SENDGRID_API_KEY)
            response = sg.send(message)
            logger.info(f"SendGrid email sent to {to}, status={response.status_code}")
            return 200 <= int(response.status_code) < 300
        except Exception as e:
            logger.error(f"SendGrid send failed for {to}: {e}")
            # fall through to Resend as a backup

    # Fallback to Resend
    try:
        import resend

        if not getattr(settings, "RESEND_API_KEY", None):
            logger.error("No email provider configured (missing SENDGRID_API_KEY and RESEND_API_KEY)")
            return False

        resend.api_key = settings.RESEND_API_KEY

        params = {
            "from": from_email or f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM_ADDRESS}>",
            "to": [to],
            "subject": subject,
            "html": html_content,
        }

        email = resend.Emails.send(params)
        logger.info(f"Resend email sent successfully to {to}: {email.get('id')}")
        return True

    except Exception as e:
        logger.error(f"Resend send failed for {to}: {e}")
        return False


async def _get_waitlist_position(email: str, offset: int = 55) -> int:
    """
    Compute the user's waitlist position with a starting offset.

    Position logic:
    - Rank by (joined_waiting_list_at or created_at) ascending among users with
      access_status in ("waiting", "waiting_list").
    - Return offset + rank (1-based). If user not found, place at end + 1.
    """
    async with async_session_maker() as session:
        res = await session.execute(select(User).where(User.email == email))
        me = res.scalar_one_or_none()

        waiting_status = ("waiting", "waiting_list")

        if me is not None:
            anchor = me.joined_waiting_list_at or me.created_at
        else:
            anchor = None

        if anchor is not None:
            count_res = await session.execute(
                select(func.count()).where(
                    User.access_status.in_(waiting_status),
                    func.coalesce(User.joined_waiting_list_at, User.created_at) <= anchor,
                )
            )
            count_before_or_equal = int(count_res.scalar() or 0)
            # First user gets exactly `offset`, so subtract 1 from rank
            return offset + max(count_before_or_equal - 1, 0)

        total_res = await session.execute(
            select(func.count()).where(User.access_status.in_(waiting_status))
        )
        total_waiting = int(total_res.scalar() or 0)
        # If not found, place at end (no +1 so first rank maps to offset)
        return offset + total_waiting


@celery_app.task(name="app.tasks.email.send_welcome_email")
def send_welcome_email(user_email: str, user_name: str | None = None) -> bool:
    """
    Send welcome email to a new user. If SendGrid template is configured, use it.
    Otherwise send a simple HTML fallback that does not require a name.

    Args:
        user_email: Recipient email address
        user_name: Optional recipient name (unused for template-only flows)

    Returns:
        bool: Success status
    """
    # If a SendGrid template is provided, use it
    # Compute waitlist position (with base offset 55)
    try:
        try:
            pos = asyncio.get_event_loop().run_until_complete(
                _get_waitlist_position(user_email, 55)
            )
        except RuntimeError:
            # If no running loop, use asyncio.run
            pos = asyncio.run(_get_waitlist_position(user_email, 55))
    except Exception:
        # On any error, fall back to base offset
        pos = 55

    if getattr(settings, "SENDGRID_API_KEY", None) and getattr(settings, "SENDGRID_WELCOME_TEMPLATE_ID", None):
        try:
            from sendgrid import SendGridAPIClient
            from sendgrid.helpers.mail import Mail, From, To

            message = Mail(
                from_email=From(str(settings.EMAIL_FROM_ADDRESS), settings.EMAIL_FROM_NAME),
                to_emails=[To(user_email)],
            )
            message.template_id = settings.SENDGRID_WELCOME_TEMPLATE_ID
            # If you have dynamic data fields in your template, add them here
            message.dynamic_template_data = {
                # "first_name": user_name or "",
                "support_url": f"{settings.FRONTEND_URL}/help",
                "site_url": settings.FRONTEND_URL,
                "waitlist_position": pos,
            }

            sg = SendGridAPIClient(settings.SENDGRID_API_KEY)
            resp = sg.send(message)
            logger.info(f"SendGrid welcome email sent to {user_email}, status={resp.status_code}")
            return 200 <= int(resp.status_code) < 300
        except Exception as e:
            logger.error(f"SendGrid welcome send failed for {user_email}: {e}")
            # Fallback to raw HTML

    subject = "You're in — Welcome to Repruv 🎉"
    html_content = f"""
    <!doctype html>
    <html><body style=\"font-family:Arial,Helvetica,sans-serif; background:#f5f7fb; padding:24px;\">
    <div style=\"max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;padding:24px;\">
      <h1 style=\"margin:0 0 8px;color:#0f172a;font-weight:800;font-size:22px;\">Welcome to Repruv</h1>
      <p style=\"margin:0 0 16px;color:#334155;font-size:14px;line-height:22px;\">Thanks for joining! We’ll email you as soon as early access opens.</p>
      <p style=\"margin:0 0 16px;color:#334155;font-size:14px;line-height:22px;\">You're number <strong>{pos}</strong> on our waiting list.</p>
      <p style=\"margin:8px 0 0;color:#64748b;font-size:12px;\">Need help? Reply to this email or visit our <a href=\"{settings.FRONTEND_URL}/help\" style=\"color:#16a34a;\">Help Center</a>.</p>
    </div>
    <p style=\"text-align:center;color:#94a3b8;font-size:12px;\"> Repruv</p>
    </body></html>
    """
    return send_email(user_email, subject, html_content)


@celery_app.task(name="app.tasks.email.check_trial_expirations")
def check_trial_expirations() -> Dict[str, int]:
    """
    Check for expiring trials and send reminder emails.

    
    Returns:
        dict: Summary of emails sent
    """
    logger.info("Checking for trial expirations")
    
    # TODO: Query organizations with expiring trials
    # For now, return mock results
    return {
        "checked": 0,
        "expiring_soon": 0,
        "emails_sent": 0,
        "completed_at": datetime.utcnow().isoformat(),
    }


@celery_app.task(name="app.tasks.email.send_review_alert")
def send_review_alert(
    user_email: str,
    location_name: str,
    review_summary: dict,
) -> bool:
    """
    Send alert about new review requiring attention.
    
    Args:
        user_email: Recipient email
        location_name: Name of the location
        review_summary: Review details
        
    Returns:
        bool: Success status
    """
    rating = review_summary.get("rating", 0)
    author = review_summary.get("author_name", "A customer")
    platform = review_summary.get("platform", "review platform")
    
    subject = f"⚠️ New {rating}-star review needs your response - {location_name}"
    
    html_content = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #EF4444;">New Review Needs Attention</h2>
                
                <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>Location:</strong> {location_name}</p>
                    <p><strong>Platform:</strong> {platform.title()}</p>
                    <p><strong>Rating:</strong> {'⭐' * rating}</p>
                    <p><strong>From:</strong> {author}</p>
                </div>
                
                <p>This review requires your immediate attention.</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{settings.FRONTEND_URL}/reviews" 
                       style="background-color: #6366F1; color: white; padding: 12px 30px; 
                              text-decoration: none; border-radius: 6px; display: inline-block;">
                        Respond Now
                    </a>
                </div>
                
                <p style="color: #666; font-size: 14px;">
                    You're receiving this because you have review alerts enabled.
                </p>
            </div>
        </body>
    </html>
    """
    
    return send_email(user_email, subject, html_content)