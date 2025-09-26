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
    asm_group_id: int | None = None,
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
            from sendgrid.helpers.mail import Mail, From, To, Content, ASM

            message = Mail(
                from_email=From(from_email or str(settings.EMAIL_FROM_ADDRESS), settings.EMAIL_FROM_NAME),
                to_emails=[To(to)],
                subject=subject,
                html_content=Content("text/html", html_content),
            )
            # Attach ASM group for one-click unsubscribe if provided (marketing only)
            if asm_group_id is not None:
                try:
                    message.asm = ASM(group_id=int(asm_group_id))
                except Exception:
                    pass

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


def _marketing_footer_html() -> str:
    addr = getattr(settings, "COMPANY_POSTAL_ADDRESS", None)
    addr_html = f"<br><span>{addr}</span>" if addr else ""
    return (
        f"<p style=\"margin:16px 0 0;color:#94a3b8;font-size:12px;\">"
        f"You are receiving this because you joined the Repruv waitlist. "
        f"You can unsubscribe at any time using the link below.{addr_html}</p>"
    )


def _countdown_email_html(days_left: int, waitlist_position: int | None) -> tuple[str, str]:
    site_url = settings.FRONTEND_URL
    support_url = f"{settings.FRONTEND_URL}/help"
    pos_html = (
        f"You’re number <strong>{waitlist_position}</strong> on our list." if waitlist_position else ""
    )
    if days_left == 14:
        subject = "Two weeks to launch — you’re on the list"
        body = f"""
        <!doctype html>
        <html><body style="font-family:Arial,Helvetica,sans-serif;background:#f5f7fb;padding:24px;">
          <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;padding:24px;">
            <h1 style="margin:0 0 8px;color:#0f172a;font-weight:800;font-size:22px;">We’re almost ready</h1>
            <p style="margin:0 0 12px;color:#334155;font-size:14px;line-height:22px;">{pos_html}</p>
            <p style="margin:0 0 16px;color:#334155;font-size:14px;line-height:22px;">Thanks for joining the Repruv waitlist. Launch is in <strong>14 days</strong>.</p>
            <a href="{site_url}" style="background:#16a34a;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;display:inline-block;">Learn more</a>
            <p style="margin:12px 0 0;color:#64748b;font-size:12px;">Questions? <a href="{support_url}" style="color:#16a34a;">Help Center</a>.</p>
            {_marketing_footer_html()}
          </div>
          <p style="text-align:center;color:#94a3b8;font-size:12px;">© Repruv</p>
        </body></html>
        """
        return subject, body
    if days_left == 7:
        subject = "One week to launch — we’ll email your invite"
        body = f"""
        <!doctype html>
        <html><body style="font-family:Arial,Helvetica,sans-serif;background:#f5f7fb;padding:24px;">
          <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;padding:24px;">
            <h1 style="margin:0 0 8px;color:#0f172a;font-weight:800;font-size:22px;">One week to go</h1>
            <p style="margin:0 0 12px;color:#334155;font-size:14px;line-height:22px;">{pos_html}</p>
            <p style="margin:0 0 16px;color:#334155;font-size:14px;line-height:22px;">We’ll send your early access link on launch day.</p>
            <a href="{site_url}" style="background:#16a34a;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;display:inline-block;">See what’s coming</a>
            <p style="margin:12px 0 0;color:#64748b;font-size:12px;">Questions? <a href="{support_url}" style="color:#16a34a;">Help Center</a>.</p>
            {_marketing_footer_html()}
          </div>
          <p style="text-align:center;color:#94a3b8;font-size:12px;">© Repruv</p>
        </body></html>
        """
        return subject, body
    if days_left == 1:
        subject = "Tomorrow: your early access invite"
        body = f"""
        <!doctype html>
        <html><body style="font-family:Arial,Helvetica,sans-serif;background:#f5f7fb;padding:24px;">
          <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;padding:24px;">
            <h1 style="margin:0 0 8px;color:#0f172a;font-weight:800;font-size:22px;">Launching tomorrow 🚀</h1>
            <p style="margin:0 0 12px;color:#334155;font-size:14px;line-height:22px;">{pos_html}</p>
            <p style="margin:0 0 16px;color:#334155;font-size:14px;line-height:22px;">You’ll get your invite first thing tomorrow.</p>
            <a href="{site_url}" style="background:#16a34a;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;display:inline-block;">Learn more</a>
            <p style="margin:12px 0 0;color:#64748b;font-size:12px;">Questions? <a href="{support_url}" style="color:#16a34a;">Help Center</a>.</p>
            {_marketing_footer_html()}
          </div>
          <p style="text-align:center;color:#94a3b8;font-size:12px;">© Repruv</p>
        </body></html>
        """
        return subject, body
    # Fallback
    return "Update from Repruv", "<html><body>Update</body></html>"


def _launch_email_html(waitlist_position: int | None) -> tuple[str, str]:
    site_url = settings.FRONTEND_URL
    support_url = f"{settings.FRONTEND_URL}/help"
    pos_html = (
        f"You’re number <strong>{waitlist_position}</strong> — thanks for waiting!" if waitlist_position else "Thanks for waiting!"
    )
    subject = "Your early access is ready 🎉"
    body = f"""
    <!doctype html>
    <html><body style="font-family:Arial,Helvetica,sans-serif;background:#f5f7fb;padding:24px;">
      <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;padding:24px;">
        <h1 style="margin:0 0 8px;color:#0f172a;font-weight:800;font-size:22px;">Your early access is ready 🎉</h1>
        <p style="margin:0 0 12px;color:#334155;font-size:14px;line-height:22px;">{pos_html}</p>
        <p style="margin:0 0 16px;color:#334155;font-size:14px;line-height:22px;">Click below to start using Repruv.</p>
        <a href="{site_url}/early-access" style="background:#16a34a;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;display:inline-block;">Get Early Access</a>
        <p style="margin:12px 0 0;color:#64748b;font-size:12px;">Need help? <a href="{support_url}" style="color:#16a34a;">Help Center</a>.</p>
        {_marketing_footer_html()}
      </div>
      <p style="text-align:center;color:#94a3b8;font-size:12px;">© Repruv</p>
    </body></html>
    """
    return subject, body


async def _get_user_waitlist_position(session, user: User, offset: int = 55) -> int | None:
    waiting_status = ("waiting", "waiting_list")
    anchor = user.joined_waiting_list_at or user.created_at
    if not anchor:
        return None
    res = await session.execute(
        select(func.count()).where(
            User.access_status.in_(waiting_status),
            func.coalesce(User.joined_waiting_list_at, User.created_at) <= anchor,
        )
    )
    count_before_or_equal = int(res.scalar() or 0)
    return 55 + max(count_before_or_equal - 1, 0)


async def _send_waitlist_batch(kind: str) -> dict:
    """Send countdown or launch emails to opted-in waiting list users.

    kind in {"t14","t7","t1","launch"}
    """
    sent = 0
    skipped = 0
    failures = 0

    async with async_session_maker() as session:
        # Base query: waiting list, consented, not bounced
        q = select(User).where(
            User.access_status.in_(["waiting", "waiting_list"]),
            User.marketing_opt_in == True,  # noqa: E712
            User.marketing_unsubscribed_at.is_(None),
        )
        # Exclude already sent for the target kind
        if kind == "t14":
            q = q.where(User.countdown_t14_sent_at.is_(None))
        elif kind == "t7":
            q = q.where(User.countdown_t7_sent_at.is_(None))
        elif kind == "t1":
            q = q.where(User.countdown_t1_sent_at.is_(None))
        elif kind == "launch":
            q = q.where(User.launch_sent_at.is_(None))

        res = await session.execute(q.order_by(User.joined_waiting_list_at.asc(), User.created_at.asc()))
        users = list(res.scalars())

        for u in users:
            try:
                pos = await _get_user_waitlist_position(session, u)
                if kind == "launch":
                    subject, html = _launch_email_html(pos)
                else:
                    days_left = {"t14": 14, "t7": 7, "t1": 1}[kind]
                    subject, html = _countdown_email_html(days_left, pos)
                ok = send_email(
                    u.email,
                    subject,
                    html,
                    asm_group_id=getattr(settings, "SENDGRID_ASM_GROUP_ID_WAITLIST", None),
                )
                if ok:
                    now = datetime.utcnow()
                    if kind == "t14":
                        u.countdown_t14_sent_at = now
                    elif kind == "t7":
                        u.countdown_t7_sent_at = now
                    elif kind == "t1":
                        u.countdown_t1_sent_at = now
                    elif kind == "launch":
                        u.launch_sent_at = now
                    await session.commit()
                    sent += 1
                else:
                    failures += 1
            except Exception as e:  # noqa: BLE001
                logger.error("Countdown send failed for {}: {}", u.email, e)
                failures += 1
        return {"sent": sent, "skipped": skipped, "failed": failures}


@celery_app.task(name="app.tasks.email.send_waitlist_countdown_daily")
def send_waitlist_countdown_daily() -> dict:
    """Daily scheduler that sends T-14, T-7, T-1, or Launch emails based on PLANNED_LAUNCH_DATE.

    Runs once per day via Celery Beat.
    """
    planned = getattr(settings, "PLANNED_LAUNCH_DATE", None)
    if not planned:
        logger.info("PLANNED_LAUNCH_DATE not set; skipping countdown scheduler")
        return {"status": "skipped", "reason": "no_planned_date"}
    try:
        target = datetime.strptime(planned, "%Y-%m-%d").date()
    except Exception:
        logger.warning("Invalid PLANNED_LAUNCH_DATE format; expected YYYY-MM-DD")
        return {"status": "skipped", "reason": "bad_date"}

    today = datetime.utcnow().date()
    delta = (target - today).days
    logger.info(f"Countdown scheduler: days_to_launch={delta}")

    import asyncio
    if delta in (14, 7, 1):
        kind = {14: "t14", 7: "t7", 1: "t1"}[delta]
        try:
            return asyncio.get_event_loop().run_until_complete(_send_waitlist_batch(kind))
        except RuntimeError:
            return asyncio.run(_send_waitlist_batch(kind))
    elif delta == 0:
        try:
            return asyncio.get_event_loop().run_until_complete(_send_waitlist_batch("launch"))
        except RuntimeError:
            return asyncio.run(_send_waitlist_batch("launch"))
    else:
        return {"status": "noop", "days_to_launch": delta}


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