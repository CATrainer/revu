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
            from sendgrid.helpers.mail import Mail, From, To, Content
            
            # Try to import ASM if available (for unsubscribe groups)
            try:
                from sendgrid.helpers.mail import ASM
                has_asm = True
            except ImportError:
                has_asm = False

            message = Mail(
                from_email=From(from_email or str(settings.EMAIL_FROM_ADDRESS), settings.EMAIL_FROM_NAME),
                to_emails=[To(to)],
                subject=subject,
                html_content=Content("text/html", html_content),
            )
            # Attach ASM group for one-click unsubscribe if provided (marketing only)
            if asm_group_id is not None and has_asm:
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


def _parse_launch_at() -> datetime:
    """Parse planned launch timestamp.

    Order of precedence:
    - settings.PLANNED_LAUNCH_AT (ISO8601 string, e.g., 2025-10-08T09:00:00Z)
    - settings.PLANNED_LAUNCH_DATE at 09:00:00Z
    - default: today at 09:00:00Z (avoids crashes)
    """
    iso = getattr(settings, "PLANNED_LAUNCH_AT", None)
    if iso:
        try:
            # Accept trailing Z or offset-less; always treat as UTC
            s = iso.replace("Z", "+00:00")
            dt = datetime.fromisoformat(s)
            if dt.tzinfo is None:
                # Assume UTC if no tzinfo
                from datetime import timezone as dt_tz
                dt = dt.replace(tzinfo=dt_tz.utc)
            return dt.astimezone(tz=None).astimezone(tz=None).astimezone()  # normalize
        except Exception:
            pass
    date_str = getattr(settings, "PLANNED_LAUNCH_DATE", None)
    if date_str:
        try:
            from datetime import timezone as dt_tz
            d = datetime.strptime(date_str, "%Y-%m-%d").date()
            return datetime(d.year, d.month, d.day, 9, 0, 0, tzinfo=dt_tz.utc)
        except Exception:
            pass
    # Fallback: today 09:00Z
    from datetime import timezone as dt_tz
    today = datetime.utcnow().date()
    return datetime(today.year, today.month, today.day, 9, 0, 0, tzinfo=dt_tz.utc)


def _first_countdown_email_html(launch_date_str: str, waitlist_position: int | None) -> tuple[str, str]:
    site_url = settings.FRONTEND_URL
    support_url = f"{settings.FRONTEND_URL}/help"
    pos_html = (
        f"You’re number <strong>{waitlist_position}</strong> on our list." if waitlist_position else ""
    )
    subject = "You’re on the list — launch is coming"
    body = f"""
    <!doctype html>
    <html><body style=\"font-family:Arial,Helvetica,sans-serif;background:#f5f7fb;padding:24px;\">
      <div style=\"max-width:600px;margin:0 auto;background:#fff;border-radius:12px;padding:24px;\">
        <h1 style=\"margin:0 0 8px;color:#0f172a;font-weight:800;font-size:22px;\">Thanks for joining the waitlist</h1>
        <p style=\"margin:0 0 12px;color:#334155;font-size:14px;line-height:22px;\">{pos_html}</p>
        <p style=\"margin:0 0 16px;color:#334155;font-size:14px;line-height:22px;\">We’re launching on <strong>{launch_date_str}</strong>. We’ll email you 24 hours before launch and again when early access opens.</p>
        <a href=\"{site_url}\" style=\"background:#16a34a;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;display:inline-block;\">See what’s coming</a>
        <p style=\"margin:12px 0 0;color:#64748b;font-size:12px;\">Questions? <a href=\"{support_url}\" style=\"color:#16a34a;\">Help Center</a>.</p>
        {_marketing_footer_html()}
      </div>
      <p style=\"text-align:center;color:#94a3b8;font-size:12px;\">© Repruv</p>
    </body></html>
    """
    return subject, body


async def _send_join_plus_24h_batch(ignore_join_delay: bool, now_utc: datetime, launch_at_utc: datetime) -> dict:
    sent = 0
    failed = 0
    async with async_session_maker() as session:
        # Only while >48h to launch
        if not (now_utc <= launch_at_utc - timedelta(hours=48)):
            return {"sent": 0, "failed": 0, "skipped_reason": ">=48h_condition_not_met"}

        q = select(User).where(
            User.access_status.in_(["waiting", "waiting_list"]),
            User.marketing_unsubscribed_at.is_(None),
            User.marketing_bounced_at.is_(None),
            User.countdown_t14_sent_at.is_(None),  # reuse as first email marker
        ).order_by(User.joined_waiting_list_at.asc(), User.created_at.asc())

        res = await session.execute(q)
        users = list(res.scalars())
        for u in users:
            try:
                join_ts = u.joined_waiting_list_at or u.created_at
                if not ignore_join_delay and join_ts:
                    if now_utc < (join_ts + timedelta(hours=24)):
                        continue
                # Compose and send
                pos = await _get_user_waitlist_position(session, u)
                subject, html = _first_countdown_email_html(launch_at_utc.date().isoformat(), pos)
                ok = send_email(u.email, subject, html, asm_group_id=getattr(settings, "SENDGRID_ASM_GROUP_ID_WAITLIST", None))
                if ok:
                    u.countdown_t14_sent_at = datetime.utcnow()
                    await session.commit()
                    sent += 1
                else:
                    failed += 1
            except Exception as e:  # noqa: BLE001
                logger.error("Join+24h send failed for {}: {}", u.email, e)
                failed += 1
    return {"sent": sent, "failed": failed}


async def _send_prelaunch_24h_batch(now_utc: datetime, launch_at_utc: datetime) -> dict:
    # Only in the 24h window before launch
    if not (launch_at_utc - timedelta(hours=24) <= now_utc < launch_at_utc):
        return {"sent": 0, "failed": 0, "skipped_reason": "outside_24h_window"}
    sent = 0
    failed = 0
    async with async_session_maker() as session:
        q = select(User).where(
            User.access_status.in_(["waiting", "waiting_list"]),
            User.marketing_unsubscribed_at.is_(None),
            User.marketing_bounced_at.is_(None),
            User.countdown_t1_sent_at.is_(None),  # use as prelaunch marker
        ).order_by(User.joined_waiting_list_at.asc(), User.created_at.asc())
        res = await session.execute(q)
        users = list(res.scalars())
        for u in users:
            try:
                pos = await _get_user_waitlist_position(session, u)
                subject, html = _countdown_email_html(1, pos)
                ok = send_email(u.email, subject, html, asm_group_id=getattr(settings, "SENDGRID_ASM_GROUP_ID_WAITLIST", None))
                if ok:
                    u.countdown_t1_sent_at = datetime.utcnow()
                    await session.commit()
                    sent += 1
                else:
                    failed += 1
            except Exception as e:  # noqa: BLE001
                logger.error("Prelaunch-24h send failed for {}: {}", u.email, e)
                failed += 1
    return {"sent": sent, "failed": failed}


async def _send_launch_batch(now_utc: datetime, launch_at_utc: datetime) -> dict:
    # Only on/after launch
    if now_utc < launch_at_utc:
        return {"sent": 0, "failed": 0, "skipped_reason": "before_launch"}
    sent = 0
    failed = 0
    async with async_session_maker() as session:
        q = select(User).where(
            User.access_status.in_(["waiting", "waiting_list"]),
            User.marketing_unsubscribed_at.is_(None),
            User.marketing_bounced_at.is_(None),
            User.launch_sent_at.is_(None),
        ).order_by(User.joined_waiting_list_at.asc(), User.created_at.asc())
        res = await session.execute(q)
        users = list(res.scalars())
        for u in users:
            try:
                pos = await _get_user_waitlist_position(session, u)
                subject, html = _launch_email_html(pos)
                ok = send_email(u.email, subject, html, asm_group_id=getattr(settings, "SENDGRID_ASM_GROUP_ID_WAITLIST", None))
                if ok:
                    # Grant access immediately
                    u.access_status = "full"
                    if not u.early_access_granted_at:
                        u.early_access_granted_at = datetime.utcnow()
                    u.launch_sent_at = datetime.utcnow()
                    await session.commit()
                    sent += 1
                else:
                    failed += 1
            except Exception as e:  # noqa: BLE001
                logger.error("Launch send failed for {}: {}", u.email, e)
                failed += 1
    return {"sent": sent, "failed": failed}


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


@celery_app.task(name="app.tasks.email.send_waitlist_campaign_hourly")
def send_waitlist_campaign_hourly() -> dict:
    """Hourly scheduler that manages:
    - Join+24h email (only when >48h to launch)
    - 24h prelaunch email
    - Launch email with access upgrade
    """
    launch_at = _parse_launch_at()
    now_utc = datetime.utcnow().replace(tzinfo=None)

    import asyncio
    results = {"first": None, "prelaunch": None, "launch": None}
    try:
        results["first"] = asyncio.get_event_loop().run_until_complete(
            _send_join_plus_24h_batch(False, now_utc, launch_at.replace(tzinfo=None))
        )
    except RuntimeError:
        results["first"] = asyncio.run(_send_join_plus_24h_batch(False, now_utc, launch_at.replace(tzinfo=None)))

    # Prelaunch only in window strictly before launch
    if now_utc < launch_at.replace(tzinfo=None):
        try:
            results["prelaunch"] = asyncio.get_event_loop().run_until_complete(
                _send_prelaunch_24h_batch(now_utc, launch_at.replace(tzinfo=None))
            )
        except RuntimeError:
            results["prelaunch"] = asyncio.run(_send_prelaunch_24h_batch(now_utc, launch_at.replace(tzinfo=None)))

    # Launch on/after the launch instant
    if now_utc >= launch_at.replace(tzinfo=None):
        try:
            results["launch"] = asyncio.get_event_loop().run_until_complete(
                _send_launch_batch(now_utc, launch_at.replace(tzinfo=None))
            )
        except RuntimeError:
            results["launch"] = asyncio.run(_send_launch_batch(now_utc, launch_at.replace(tzinfo=None)))

    logger.info(f"waitlist_campaign_hourly results: {results}")
    return results


@celery_app.task(name="app.tasks.email.kickoff_waitlist_first_email")
def kickoff_waitlist_first_email() -> dict:
    """Backfill the first waitlist email to everyone currently waiting, ignoring the join+24h rule, but only if >48h to launch."""
    launch_at = _parse_launch_at()
    now_utc = datetime.utcnow().replace(tzinfo=None)
    import asyncio
    try:
        return asyncio.get_event_loop().run_until_complete(
            _send_join_plus_24h_batch(True, now_utc, launch_at.replace(tzinfo=None))
        )
    except RuntimeError:
        return asyncio.run(_send_join_plus_24h_batch(True, now_utc, launch_at.replace(tzinfo=None)))


@celery_app.task(name="app.tasks.email.check_trial_expirations")
def check_trial_expirations() -> Dict[str, int]:
    """
    Check for expiring trials and send reminder emails.
    
    Checks for trials expiring in 7, 3, or 1 days and sends reminder emails
    to users who haven't been notified yet.
    
    Returns:
        dict: Summary of emails sent
    """
    logger.info("Checking for trial expirations")
    
    async def _check_trials():
        from app.core.database import get_async_session
        from app.models.user import User
        from sqlalchemy import select, and_
        from datetime import timedelta
        
        async for db in get_async_session():
            try:
                now = datetime.utcnow()
                
                # Calculate date ranges for notifications
                days_7_from_now = now + timedelta(days=7)
                days_3_from_now = now + timedelta(days=3)
                days_1_from_now = now + timedelta(days=1)
                
                emails_sent = 0
                checked = 0
                
                # Check for 7-day expiration (within 24 hours of 7 days from now)
                result = await db.execute(
                    select(User).where(
                        and_(
                            User.trial_end_date.isnot(None),
                            User.trial_end_date >= days_7_from_now - timedelta(hours=12),
                            User.trial_end_date <= days_7_from_now + timedelta(hours=12),
                            User.trial_notified_7d == False,
                            User.subscription_status == "trial",
                            User.is_active == True
                        )
                    )
                )
                users_7d = result.scalars().all()
                checked += len(users_7d)
                
                for user in users_7d:
                    if await _send_trial_expiration_email(user.email, user.full_name or "there", 7):
                        user.trial_notified_7d = True
                        emails_sent += 1
                
                # Check for 3-day expiration
                result = await db.execute(
                    select(User).where(
                        and_(
                            User.trial_end_date.isnot(None),
                            User.trial_end_date >= days_3_from_now - timedelta(hours=12),
                            User.trial_end_date <= days_3_from_now + timedelta(hours=12),
                            User.trial_notified_3d == False,
                            User.subscription_status == "trial",
                            User.is_active == True
                        )
                    )
                )
                users_3d = result.scalars().all()
                checked += len(users_3d)
                
                for user in users_3d:
                    if await _send_trial_expiration_email(user.email, user.full_name or "there", 3):
                        user.trial_notified_3d = True
                        emails_sent += 1
                
                # Check for 1-day expiration
                result = await db.execute(
                    select(User).where(
                        and_(
                            User.trial_end_date.isnot(None),
                            User.trial_end_date >= days_1_from_now - timedelta(hours=12),
                            User.trial_end_date <= days_1_from_now + timedelta(hours=12),
                            User.trial_notified_1d == False,
                            User.subscription_status == "trial",
                            User.is_active == True
                        )
                    )
                )
                users_1d = result.scalars().all()
                checked += len(users_1d)
                
                for user in users_1d:
                    if await _send_trial_expiration_email(user.email, user.full_name or "there", 1):
                        user.trial_notified_1d = True
                        emails_sent += 1
                
                await db.commit()
                
                logger.info(f"Trial expiration check complete: {checked} users checked, {emails_sent} emails sent")
                
                return {
                    "checked": checked,
                    "expiring_soon": checked,
                    "emails_sent": emails_sent,
                    "completed_at": datetime.utcnow().isoformat(),
                }
                
            except Exception as e:
                logger.error(f"Error checking trial expirations: {e}")
                await db.rollback()
                return {
                    "checked": 0,
                    "expiring_soon": 0,
                    "emails_sent": 0,
                    "error": str(e),
                    "completed_at": datetime.utcnow().isoformat(),
                }
    
    return asyncio.run(_check_trials())


async def _send_trial_expiration_email(email: str, name: str, days_left: int) -> bool:
    """
    Send trial expiration reminder email.
    
    Args:
        email: User's email address
        name: User's name
        days_left: Number of days until trial expires (7, 3, or 1)
    
    Returns:
        bool: True if email sent successfully
    """
    try:
        client = get_resend_client()
        if not client:
            logger.warning("Resend client not available")
            return False
        
        # Customize message based on days left
        if days_left == 7:
            subject = "Your Repruv trial ends in 7 days 🎯"
            urgency = "You have one week left"
        elif days_left == 3:
            subject = "Only 3 days left in your Repruv trial ⚡"
            urgency = "Your trial is ending soon"
        else:  # 1 day
            subject = "Last day of your Repruv trial! 🚨"
            urgency = "This is your final reminder"
        
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">Repruv</h1>
                </div>
                
                <div style="padding: 40px 20px;">
                    <h2 style="color: #333; margin-top: 0;">Hi {name},</h2>
                    
                    <p style="font-size: 16px; color: #555;">
                        {urgency} — your Repruv trial expires in <strong>{days_left} day{"s" if days_left > 1 else ""}</strong>.
                    </p>
                    
                    <p style="font-size: 16px; color: #555;">
                        Don't lose access to:
                    </p>
                    
                    <ul style="font-size: 16px; color: #555;">
                        <li>🤖 AI-powered content assistance</li>
                        <li>📊 Performance analytics</li>
                        <li>⚡ Smart automation workflows</li>
                        <li>💬 Comment management</li>
                    </ul>
                    
                    <div style="text-align: center; margin: 40px 0;">
                        <a href="{settings.FRONTEND_URL}/settings?tab=billing" 
                           style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                  color: white; 
                                  padding: 16px 32px; 
                                  text-decoration: none; 
                                  border-radius: 8px; 
                                  font-weight: bold;
                                  display: inline-block;">
                            Upgrade Now
                        </a>
                    </div>
                    
                    <p style="font-size: 14px; color: #777; margin-top: 40px;">
                        Questions? Reply to this email or contact us at support@repruv.com
                    </p>
                </div>
                
                <div style="background: #f7f7f7; padding: 20px; text-align: center; font-size: 12px; color: #999;">
                    <p>Repruv · AI-Powered Social Media Management</p>
                    <p>© 2025 Repruv. All rights reserved.</p>
                </div>
            </body>
        </html>
        """
        
        params = {
            "from": f"Repruv <{settings.EMAIL_FROM}>",
            "to": [email],
            "subject": subject,
            "html": html_content,
        }
        
        result = client.emails.send(params)
        logger.info(f"Trial expiration email sent to {email} ({days_left} days left): {result}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send trial expiration email to {email}: {e}")
        return False


@celery_app.task(name="app.tasks.email.send_application_submitted_acknowledgment")
def send_application_submitted_acknowledgment(user_email: str, user_name: str, account_type: str) -> bool:
    """
    Send acknowledgment email when user submits their application.
    
    Args:
        user_email: Recipient email address
        user_name: Recipient name
        account_type: Type of account (creator or agency)
    
    Returns:
        bool: Success status
    """
    try:
        account_label = "Creator" if account_type == "creator" else "Agency"
        
        # If SendGrid template is configured, use it
        if settings.SENDGRID_API_KEY and settings.SENDGRID_APPLICATION_ACKNOWLEDGMENT_TEMPLATE_ID:
            try:
                from sendgrid import SendGridAPIClient
                from sendgrid.helpers.mail import Mail, From, To
                
                message = Mail(
                    from_email=From(str(settings.EMAIL_FROM_ADDRESS), settings.EMAIL_FROM_NAME),
                    to_emails=[To(user_email)],
                )
                message.template_id = settings.SENDGRID_APPLICATION_ACKNOWLEDGMENT_TEMPLATE_ID
                message.dynamic_template_data = {
                    "user_name": user_name,
                    "account_type": account_label,
                    "frontend_url": settings.FRONTEND_URL,
                    "year": datetime.utcnow().year,
                }
                
                sg = SendGridAPIClient(settings.SENDGRID_API_KEY)
                resp = sg.send(message)
                logger.info(f"SendGrid acknowledgment email sent to {user_email}, status={resp.status_code}")
                return 200 <= int(resp.status_code) < 300
            except Exception as e:
                logger.error(f"SendGrid acknowledgment send failed for {user_email}: {e}")
                # Fall through to inline HTML
        
        # Fallback to inline HTML
        subject = "We've Received Your Repruv Application"
        html_content = f"""<!doctype html>
<html>
<body style="font-family:Arial,Helvetica,sans-serif;background:#f5f7fb;padding:24px;margin:0;">
    <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
        <div style="text-align:center;margin-bottom:24px;">
            <h1 style="margin:0;color:#0f172a;font-weight:800;font-size:28px;">Application Received</h1>
        </div>
        <p style="margin:0 0 16px;color:#334155;font-size:16px;line-height:24px;">Hi {user_name},</p>
        <p style="margin:0 0 16px;color:#334155;font-size:16px;line-height:24px;">Thank you for applying to join Repruv! We've successfully received your <strong>{account_label}</strong> application and our team is reviewing it.</p>
        <div style="background:#f0f9ff;border-left:4px solid #3b82f6;padding:20px;margin:24px 0;border-radius:8px;">
            <h3 style="margin:0 0 12px;color:#1e40af;font-size:18px;font-weight:700;">What Happens Next?</h3>
            <ul style="margin:0;padding-left:20px;color:#1e3a8a;font-size:14px;line-height:22px;">
                <li style="margin-bottom:8px;">Our team will review your application within 24-48 hours</li>
                <li style="margin-bottom:8px;">We'll verify your social media accounts and audience metrics</li>
                <li style="margin-bottom:8px;">You'll receive an email once we've made a decision</li>
                <li style="margin-bottom:0;">If approved, you'll get immediate access to the platform</li>
            </ul>
        </div>
        <div style="background:#f8fafc;padding:16px;border-radius:8px;margin-top:24px;">
            <p style="margin:0;color:#64748b;font-size:14px;line-height:20px;"><strong style="color:#334155;">Questions about your application?</strong><br>Feel free to reply to this email.</p>
        </div>
        <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;text-align:center;line-height:18px;">You're receiving this email because you submitted an application to Repruv.<br>&copy; {datetime.utcnow().year} Repruv. All rights reserved.</p>
    </div>
</body>
</html>"""
        
        return send_email(user_email, subject, html_content)
        
    except Exception as e:
        logger.error(f"Failed to send application acknowledgment email to {user_email}: {e}")
        return False


@celery_app.task(name="app.tasks.email.send_application_approved_email")
def send_application_approved_email(user_email: str, user_name: str, account_type: str) -> bool:
    """
    Send approval email when application is approved.
    
    Args:
        user_email: Recipient email address
        user_name: Recipient name
        account_type: Type of account (creator or agency)
    
    Returns:
        bool: Success status
    """
    try:
        account_label = "Creator" if account_type == "creator" else "Agency"
        
        # If SendGrid template is configured, use it
        if settings.SENDGRID_API_KEY and settings.SENDGRID_APPLICATION_APPROVED_TEMPLATE_ID:
            try:
                from sendgrid import SendGridAPIClient
                from sendgrid.helpers.mail import Mail, From, To
                
                message = Mail(
                    from_email=From(str(settings.EMAIL_FROM_ADDRESS), settings.EMAIL_FROM_NAME),
                    to_emails=[To(user_email)],
                )
                message.template_id = settings.SENDGRID_APPLICATION_APPROVED_TEMPLATE_ID
                message.dynamic_template_data = {
                    "user_name": user_name,
                    "account_type": account_label,
                    "frontend_url": settings.FRONTEND_URL,
                    "year": datetime.utcnow().year,
                }
                
                sg = SendGridAPIClient(settings.SENDGRID_API_KEY)
                resp = sg.send(message)
                logger.info(f"SendGrid approval email sent to {user_email}, status={resp.status_code}")
                return 200 <= int(resp.status_code) < 300
            except Exception as e:
                logger.error(f"SendGrid approval send failed for {user_email}: {e}")
                # Fall through to inline HTML
        
        # Fallback to inline HTML
        subject = "Welcome to Repruv — Your Application is Approved! 🎉"
        
        html_content = f"""
        <!doctype html>
        <html>
        <body style="font-family:Arial,Helvetica,sans-serif;background:#f5f7fb;padding:24px;margin:0;">
            <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
                <!-- Header -->
                <div style="text-align:center;margin-bottom:24px;">
                    <h1 style="margin:0;color:#0f172a;font-weight:800;font-size:28px;">🎉 Welcome to Repruv!</h1>
                </div>
                
                <!-- Main Content -->
                <p style="margin:0 0 16px;color:#334155;font-size:16px;line-height:24px;">
                    Hi {user_name},
                </p>
                
                <p style="margin:0 0 16px;color:#334155;font-size:16px;line-height:24px;">
                    Great news! Your <strong>{account_label}</strong> application has been approved. You now have full access to Repruv's AI-powered comment management platform.
                </p>
                
                <!-- Benefits Box -->
                <div style="background:#f0fdf4;border-left:4px solid #16a34a;padding:20px;margin:24px 0;border-radius:8px;">
                    <h3 style="margin:0 0 12px;color:#15803d;font-size:18px;font-weight:700;">What's Next?</h3>
                    <ul style="margin:0;padding-left:20px;color:#166534;font-size:14px;line-height:22px;">
                        <li style="margin-bottom:8px;">Connect your social media accounts (YouTube, Instagram, TikTok)</li>
                        <li style="margin-bottom:8px;">Set up your AI comment reply preferences</li>
                        <li style="margin-bottom:8px;">Explore automation workflows</li>
                        <li style="margin-bottom:0;">Start engaging with your community more efficiently</li>
                    </ul>
                </div>
                
                <!-- CTA Button -->
                <div style="text-align:center;margin:32px 0;">
                    <a href="{settings.FRONTEND_URL}/dashboard" 
                       style="background:linear-gradient(to right,#16a34a,#15803d);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;display:inline-block;font-weight:600;font-size:16px;">
                        Get Started →
                    </a>
                </div>
                
                <!-- Support Section -->
                <div style="background:#f8fafc;padding:16px;border-radius:8px;margin-top:24px;">
                    <p style="margin:0;color:#64748b;font-size:14px;line-height:20px;">
                        <strong style="color:#334155;">Need help getting started?</strong><br>
                        Our support team is here to help. Reply to this email or visit our 
                        <a href="{settings.FRONTEND_URL}/help" style="color:#16a34a;text-decoration:none;font-weight:600;">Help Center</a>.
                    </p>
                </div>
                
                <!-- Footer -->
                <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;text-align:center;line-height:18px;">
                    You're receiving this email because your Repruv application was approved.<br>
                    © {datetime.utcnow().year} Repruv. All rights reserved.
                </p>
            </div>
        </body>
        </html>
        """
        
        return send_email(user_email, subject, html_content)
        
    except Exception as e:
        logger.error(f"Failed to send application approved email to {user_email}: {e}")
        return False


@celery_app.task(name="app.tasks.email.send_application_rejected_email")
def send_application_rejected_email(
    user_email: str, 
    user_name: str, 
    account_type: str,
    rejection_reason: str | None = None
) -> bool:
    """
    Send rejection email when application is rejected.
    
    Args:
        user_email: Recipient email address
        user_name: Recipient name
        account_type: Type of account (creator or agency)
        rejection_reason: Optional reason for rejection
    
    Returns:
        bool: Success status
    """
    try:
        subject = "Update on Your Repruv Application"
        
        account_label = "Creator" if account_type == "creator" else "Agency"
        
        reason_html = ""
        if rejection_reason:
            reason_html = f"""
            <div style="background:#fef2f2;border-left:4px solid#ef4444;padding:16px;margin:20px 0;border-radius:8px;">
                <p style="margin:0;color:#991b1b;font-size:14px;line-height:20px;">
                    <strong>Reason:</strong><br>
                    {rejection_reason}
                </p>
            </div>
            """
        
        html_content = f"""
        <!doctype html>
        <html>
        <body style="font-family:Arial,Helvetica,sans-serif;background:#f5f7fb;padding:24px;margin:0;">
            <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
                <!-- Header -->
                <div style="text-align:center;margin-bottom:24px;">
                    <h1 style="margin:0;color:#0f172a;font-weight:700;font-size:24px;">Update on Your Application</h1>
                </div>
                
                <!-- Main Content -->
                <p style="margin:0 0 16px;color:#334155;font-size:16px;line-height:24px;">
                    Hi {user_name},
                </p>
                
                <p style="margin:0 0 16px;color:#334155;font-size:16px;line-height:24px;">
                    Thank you for your interest in Repruv. After careful review, we're unable to approve your <strong>{account_label}</strong> application at this time.
                </p>
                
                {reason_html}
                
                <!-- Next Steps -->
                <div style="background:#f0f9ff;border-left:4px solid #3b82f6;padding:20px;margin:24px 0;border-radius:8px;">
                    <h3 style="margin:0 0 12px;color:#1e40af;font-size:16px;font-weight:600;">What You Can Do</h3>
                    <ul style="margin:0;padding-left:20px;color:#1e3a8a;font-size:14px;line-height:22px;">
                        <li style="margin-bottom:8px;">You're welcome to reapply in the future as our criteria evolve</li>
                        <li style="margin-bottom:8px;">Contact us at support@repruv.com to discuss your application</li>
                        <li style="margin-bottom:0;">Follow us on social media for updates on new opportunities</li>
                    </ul>
                </div>
                
                <!-- Support Section -->
                <div style="background:#f8fafc;padding:16px;border-radius:8px;margin-top:24px;">
                    <p style="margin:0;color:#64748b;font-size:14px;line-height:20px;">
                        <strong style="color:#334155;">Have questions about this decision?</strong><br>
                        Our team is happy to provide more information. Reply to this email or contact us at 
                        <a href="mailto:support@repruv.com" style="color:#16a34a;text-decoration:none;font-weight:600;">support@repruv.com</a>.
                    </p>
                </div>
                
                <!-- Footer -->
                <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;text-align:center;line-height:18px;">
                    We appreciate your interest in Repruv.<br>
                    © {datetime.utcnow().year} Repruv. All rights reserved.
                </p>
            </div>
        </body>
        </html>
        """
        
        return send_email(user_email, subject, html_content)
        
    except Exception as e:
        logger.error(f"Failed to send application rejected email to {user_email}: {e}")
        return False


@celery_app.task(name="app.tasks.email.send_new_application_notification_to_admins")
def send_new_application_notification_to_admins(
    applicant_email: str,
    applicant_name: str,
    account_type: str,
    application_id: str
) -> dict:
    """
    Notify configured admin emails about new application submission.
    
    Args:
        applicant_email: Applicant's email
        applicant_name: Applicant's name
        account_type: Type of account (creator or agency)
        application_id: UUID of the application
    
    Returns:
        dict: Summary of notifications sent
    """
    try:
        from app.models.application import AdminNotificationSettings
        
        async def _send_notifications():
            sent = 0
            failed = 0
            
            async with async_session_maker() as session:
                # Get active admins who want this notification type
                notification_key = f"{account_type}_applications"
                stmt = select(AdminNotificationSettings).where(
                    AdminNotificationSettings.is_active == True  # noqa: E712
                )
                result = await session.execute(stmt)
                admin_settings = result.scalars().all()
                
                for admin in admin_settings:
                    # Check if they want this type of notification
                    if not admin.notification_types.get(notification_key, False):
                        continue
                    
                    try:
                        subject = f"New {account_type.title()} Application — {applicant_name}"
                        account_label = "Creator" if account_type == "creator" else "Agency"
                        
                        html_content = f"""
                        <!doctype html>
                        <html>
                        <body style="font-family:Arial,Helvetica,sans-serif;background:#f5f7fb;padding:20px;margin:0;">
                            <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;padding:24px;">
                                <h2 style="margin:0 0 16px;color:#0f172a;font-size:20px;">New {account_label} Application</h2>
                                
                                <div style="background:#f8fafc;padding:16px;border-radius:6px;margin-bottom:20px;">
                                    <p style="margin:0 0 8px;color:#64748b;font-size:14px;"><strong>Applicant:</strong> {applicant_name}</p>
                                    <p style="margin:0 0 8px;color:#64748b;font-size:14px;"><strong>Email:</strong> {applicant_email}</p>
                                    <p style="margin:0;color:#64748b;font-size:14px;"><strong>Type:</strong> {account_label}</p>
                                </div>
                                
                                <div style="text-align:center;margin-top:24px;">
                                    <a href="{settings.FRONTEND_URL}/admin/applications/{application_id}" 
                                       style="background:#16a34a;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;display:inline-block;font-weight:600;">
                                        Review Application →
                                    </a>
                                </div>
                                
                                <p style="margin:20px 0 0;color:#94a3b8;font-size:12px;text-align:center;">
                                    Repruv Admin Notifications
                                </p>
                            </div>
                        </body>
                        </html>
                        """
                        
                        if send_email(admin.email, subject, html_content):
                            sent += 1
                        else:
                            failed += 1
                            
                    except Exception as e:  # noqa: BLE001
                        logger.error(f"Failed to notify admin {admin.email}: {e}")
                        failed += 1
            
            return {"sent": sent, "failed": failed}
        
        # Run async function
        try:
            result = asyncio.get_event_loop().run_until_complete(_send_notifications())
        except RuntimeError:
            result = asyncio.run(_send_notifications())
        
        logger.info(f"Admin notifications for application {application_id}: sent={result['sent']}, failed={result['failed']}")
        return result
        
    except Exception as e:
        logger.error(f"Failed to send admin notifications for application {application_id}: {e}")
        return {"sent": 0, "failed": 0, "error": str(e)}


# ============================================
# Agency Email Tasks
# ============================================


@celery_app.task(name="app.tasks.email.send_agency_signup_admin_notification")
def send_agency_signup_admin_notification(
    agency_name: str,
    owner_email: str,
    owner_name: str,
) -> dict:
    """
    Notify admins about a new agency signup.

    Agencies are auto-approved, but we still want admins to know
    when new agencies join the platform.

    Args:
        agency_name: Name of the new agency
        owner_email: Email of the agency owner
        owner_name: Name of the agency owner

    Returns:
        dict: Summary of notifications sent
    """
    try:
        from app.models.application import AdminNotificationSettings

        async def _send_notifications():
            sent = 0
            failed = 0

            async with async_session_maker() as session:
                # Get active admins who want agency notifications
                stmt = select(AdminNotificationSettings).where(
                    AdminNotificationSettings.is_active == True  # noqa: E712
                )
                result = await session.execute(stmt)
                admin_settings = result.scalars().all()

                for admin in admin_settings:
                    # Check if they want agency notifications
                    if not admin.notification_types.get("agency_applications", False):
                        continue

                    try:
                        subject = f"🏢 New Agency Signup — {agency_name}"

                        html_content = f"""
                        <!doctype html>
                        <html>
                        <body style="font-family:Arial,Helvetica,sans-serif;background:#f5f7fb;padding:20px;margin:0;">
                            <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;padding:24px;">
                                <h2 style="margin:0 0 16px;color:#0f172a;font-size:20px;">New Agency Joined Repruv</h2>

                                <div style="background:#f0fdf4;border-left:4px solid #22c55e;padding:16px;border-radius:0 6px 6px 0;margin-bottom:20px;">
                                    <p style="margin:0;color:#166534;font-size:14px;font-weight:600;">
                                        Auto-approved and ready to use
                                    </p>
                                </div>

                                <div style="background:#f8fafc;padding:16px;border-radius:6px;margin-bottom:20px;">
                                    <p style="margin:0 0 8px;color:#64748b;font-size:14px;"><strong>Agency:</strong> {agency_name}</p>
                                    <p style="margin:0 0 8px;color:#64748b;font-size:14px;"><strong>Owner:</strong> {owner_name}</p>
                                    <p style="margin:0;color:#64748b;font-size:14px;"><strong>Email:</strong> {owner_email}</p>
                                </div>

                                <p style="margin:20px 0 0;color:#94a3b8;font-size:12px;text-align:center;">
                                    Repruv Admin Notifications
                                </p>
                            </div>
                        </body>
                        </html>
                        """

                        if send_email(admin.email, subject, html_content):
                            sent += 1
                        else:
                            failed += 1

                    except Exception as e:  # noqa: BLE001
                        logger.error(f"Failed to notify admin {admin.email}: {e}")
                        failed += 1

            return {"sent": sent, "failed": failed}

        # Run async function
        try:
            result = asyncio.get_event_loop().run_until_complete(_send_notifications())
        except RuntimeError:
            result = asyncio.run(_send_notifications())

        logger.info(f"Agency signup admin notifications: agency={agency_name}, sent={result['sent']}, failed={result['failed']}")
        return result

    except Exception as e:
        logger.error(f"Failed to send agency signup admin notifications: {e}")
        return {"sent": 0, "failed": 0, "error": str(e)}


@celery_app.task(name="app.tasks.email.send_creator_invitation_email")
def send_creator_invitation_email(
    email: str,
    agency_name: str,
    invitation_token: str,
    inviter_name: str,
    is_team_invite: bool = False,
) -> bool:
    """
    Send invitation email to a creator or team member to join an agency.

    Args:
        email: Recipient email address
        agency_name: Name of the agency sending the invite
        invitation_token: Unique token for accepting the invitation
        inviter_name: Name of the person who sent the invite
        is_team_invite: Whether this is a team member invite (vs creator)

    Returns:
        bool: Success status
    """
    try:
        invite_type = "team member" if is_team_invite else "creator"
        accept_url = f"{settings.FRONTEND_URL}/invite/accept?token={invitation_token}"

        subject = f"You're invited to join {agency_name} on Repruv"

        html_content = f"""
        <!doctype html>
        <html>
        <body style="font-family:Arial,Helvetica,sans-serif;background:#f5f7fb;padding:24px;margin:0;">
            <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
                <div style="text-align:center;margin-bottom:24px;">
                    <h1 style="margin:0;color:#0f172a;font-weight:800;font-size:28px;">You're Invited!</h1>
                </div>

                <p style="margin:0 0 16px;color:#334155;font-size:16px;line-height:24px;">
                    Hi there,
                </p>

                <p style="margin:0 0 16px;color:#334155;font-size:16px;line-height:24px;">
                    <strong>{inviter_name}</strong> has invited you to join <strong>{agency_name}</strong> as a {invite_type} on Repruv.
                </p>

                <div style="background:#f0fdf4;border-left:4px solid #16a34a;padding:20px;margin:24px 0;border-radius:8px;">
                    <h3 style="margin:0 0 12px;color:#15803d;font-size:18px;font-weight:700;">What is Repruv?</h3>
                    <p style="margin:0;color:#166534;font-size:14px;line-height:22px;">
                        Repruv is an AI-powered platform that helps creators and agencies manage their social media presence,
                        engage with their audience, and discover monetization opportunities.
                    </p>
                </div>

                <div style="text-align:center;margin:32px 0;">
                    <a href="{accept_url}"
                       style="background:linear-gradient(to right,#16a34a,#15803d);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;display:inline-block;font-weight:600;font-size:16px;">
                        Accept Invitation
                    </a>
                </div>

                <p style="margin:16px 0;color:#64748b;font-size:14px;text-align:center;">
                    This invitation expires in 7 days.
                </p>

                <div style="background:#f8fafc;padding:16px;border-radius:8px;margin-top:24px;">
                    <p style="margin:0;color:#64748b;font-size:14px;line-height:20px;">
                        <strong style="color:#334155;">Didn't expect this email?</strong><br>
                        If you don't know {inviter_name} or {agency_name}, you can safely ignore this email.
                    </p>
                </div>

                <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;text-align:center;line-height:18px;">
                    © {datetime.utcnow().year} Repruv. All rights reserved.
                </p>
            </div>
        </body>
        </html>
        """

        success = send_email(email, subject, html_content)
        if success:
            logger.info(f"Creator invitation email sent to {email} for agency {agency_name}")
        return success

    except Exception as e:
        logger.error(f"Failed to send creator invitation email to {email}: {e}")
        return False


@celery_app.task(name="app.tasks.email.send_join_request_notification")
def send_join_request_notification(
    agency_admin_email: str,
    agency_admin_name: str,
    agency_name: str,
    creator_name: str,
    creator_email: str,
) -> bool:
    """
    Notify agency admin about a new join request from a creator.

    Args:
        agency_admin_email: Email of the agency admin to notify
        agency_admin_name: Name of the agency admin
        agency_name: Name of the agency
        creator_name: Name of the creator requesting to join
        creator_email: Email of the creator

    Returns:
        bool: Success status
    """
    try:
        review_url = f"{settings.FRONTEND_URL}/agency/creators"

        subject = f"New join request for {agency_name}"

        html_content = f"""
        <!doctype html>
        <html>
        <body style="font-family:Arial,Helvetica,sans-serif;background:#f5f7fb;padding:24px;margin:0;">
            <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
                <div style="text-align:center;margin-bottom:24px;">
                    <h1 style="margin:0;color:#0f172a;font-weight:800;font-size:24px;">New Join Request</h1>
                </div>

                <p style="margin:0 0 16px;color:#334155;font-size:16px;line-height:24px;">
                    Hi {agency_admin_name},
                </p>

                <p style="margin:0 0 16px;color:#334155;font-size:16px;line-height:24px;">
                    A creator has requested to join <strong>{agency_name}</strong>.
                </p>

                <div style="background:#f8fafc;padding:16px;border-radius:8px;margin:24px 0;">
                    <p style="margin:0 0 8px;color:#64748b;font-size:14px;"><strong>Creator:</strong> {creator_name}</p>
                    <p style="margin:0;color:#64748b;font-size:14px;"><strong>Email:</strong> {creator_email}</p>
                </div>

                <div style="text-align:center;margin:32px 0;">
                    <a href="{review_url}"
                       style="background:linear-gradient(to right,#16a34a,#15803d);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;display:inline-block;font-weight:600;font-size:16px;">
                        Review Request
                    </a>
                </div>

                <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;text-align:center;line-height:18px;">
                    © {datetime.utcnow().year} Repruv. All rights reserved.
                </p>
            </div>
        </body>
        </html>
        """

        success = send_email(agency_admin_email, subject, html_content)
        if success:
            logger.info(f"Join request notification sent to {agency_admin_email} for creator {creator_email}")
        return success

    except Exception as e:
        logger.error(f"Failed to send join request notification to {agency_admin_email}: {e}")
        return False


@celery_app.task(name="app.tasks.email.send_join_request_accepted_email")
def send_join_request_accepted_email(
    creator_email: str,
    creator_name: str,
    agency_name: str,
) -> bool:
    """
    Notify creator that their join request was accepted.

    Args:
        creator_email: Email of the creator
        creator_name: Name of the creator
        agency_name: Name of the agency

    Returns:
        bool: Success status
    """
    try:
        dashboard_url = f"{settings.FRONTEND_URL}/dashboard"

        subject = f"Welcome to {agency_name}!"

        html_content = f"""
        <!doctype html>
        <html>
        <body style="font-family:Arial,Helvetica,sans-serif;background:#f5f7fb;padding:24px;margin:0;">
            <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
                <div style="text-align:center;margin-bottom:24px;">
                    <h1 style="margin:0;color:#0f172a;font-weight:800;font-size:28px;">You're In!</h1>
                </div>

                <p style="margin:0 0 16px;color:#334155;font-size:16px;line-height:24px;">
                    Hi {creator_name},
                </p>

                <p style="margin:0 0 16px;color:#334155;font-size:16px;line-height:24px;">
                    Great news! <strong>{agency_name}</strong> has accepted your request to join their roster.
                </p>

                <div style="background:#f0fdf4;border-left:4px solid #16a34a;padding:20px;margin:24px 0;border-radius:8px;">
                    <h3 style="margin:0 0 12px;color:#15803d;font-size:18px;font-weight:700;">What's Next?</h3>
                    <ul style="margin:0;padding-left:20px;color:#166534;font-size:14px;line-height:22px;">
                        <li style="margin-bottom:8px;">Your agency can now send you sponsorship opportunities</li>
                        <li style="margin-bottom:8px;">Access agency-exclusive resources and support</li>
                        <li style="margin-bottom:0;">Collaborate with your agency on brand deals</li>
                    </ul>
                </div>

                <div style="text-align:center;margin:32px 0;">
                    <a href="{dashboard_url}"
                       style="background:linear-gradient(to right,#16a34a,#15803d);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;display:inline-block;font-weight:600;font-size:16px;">
                        Go to Dashboard
                    </a>
                </div>

                <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;text-align:center;line-height:18px;">
                    © {datetime.utcnow().year} Repruv. All rights reserved.
                </p>
            </div>
        </body>
        </html>
        """

        success = send_email(creator_email, subject, html_content)
        if success:
            logger.info(f"Join request accepted email sent to {creator_email} for agency {agency_name}")
        return success

    except Exception as e:
        logger.error(f"Failed to send join request accepted email to {creator_email}: {e}")
        return False


@celery_app.task(name="app.tasks.email.send_opportunity_notification")
def send_opportunity_notification(
    creator_email: str,
    creator_name: str,
    agency_name: str,
    opportunity_title: str,
    brand_name: str,
) -> bool:
    """
    Notify creator about a new sponsorship opportunity from their agency.

    Args:
        creator_email: Email of the creator
        creator_name: Name of the creator
        agency_name: Name of the agency
        opportunity_title: Title of the opportunity
        brand_name: Name of the brand/sponsor

    Returns:
        bool: Success status
    """
    try:
        dashboard_url = f"{settings.FRONTEND_URL}/dashboard/opportunities"

        subject = f"New Opportunity: {brand_name} via {agency_name}"

        html_content = f"""
        <!doctype html>
        <html>
        <body style="font-family:Arial,Helvetica,sans-serif;background:#f5f7fb;padding:24px;margin:0;">
            <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
                <div style="text-align:center;margin-bottom:24px;">
                    <h1 style="margin:0;color:#0f172a;font-weight:800;font-size:28px;">New Opportunity!</h1>
                </div>

                <p style="margin:0 0 16px;color:#334155;font-size:16px;line-height:24px;">
                    Hi {creator_name},
                </p>

                <p style="margin:0 0 16px;color:#334155;font-size:16px;line-height:24px;">
                    <strong>{agency_name}</strong> has sent you a new sponsorship opportunity with <strong>{brand_name}</strong>.
                </p>

                <div style="background:#f8fafc;padding:20px;border-radius:8px;margin:24px 0;">
                    <h3 style="margin:0 0 8px;color:#0f172a;font-size:18px;font-weight:700;">{opportunity_title}</h3>
                    <p style="margin:0;color:#64748b;font-size:14px;">Brand: {brand_name}</p>
                </div>

                <div style="text-align:center;margin:32px 0;">
                    <a href="{dashboard_url}"
                       style="background:linear-gradient(to right,#16a34a,#15803d);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;display:inline-block;font-weight:600;font-size:16px;">
                        View Opportunity
                    </a>
                </div>

                <p style="margin:16px 0;color:#64748b;font-size:14px;text-align:center;">
                    Review the details and respond to let your agency know if you're interested.
                </p>

                <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;text-align:center;line-height:18px;">
                    © {datetime.utcnow().year} Repruv. All rights reserved.
                </p>
            </div>
        </body>
        </html>
        """

        success = send_email(creator_email, subject, html_content)
        if success:
            logger.info(f"Opportunity notification sent to {creator_email} for opportunity: {opportunity_title}")
        return success

    except Exception as e:
        logger.error(f"Failed to send opportunity notification to {creator_email}: {e}")
        return False


@celery_app.task(name="app.tasks.email.send_opportunity_response_notification")
def send_opportunity_response_notification(
    agency_email: str,
    agency_name: str,
    creator_name: str,
    opportunity_title: str,
    brand_name: str,
    response: str,  # "accepted" or "declined"
    notes: str = None,
) -> bool:
    """
    Notify agency about creator's response to an opportunity.

    Args:
        agency_email: Email of the agency admin to notify
        agency_name: Name of the agency
        creator_name: Name of the creator
        opportunity_title: Title of the opportunity
        brand_name: Name of the brand/sponsor
        response: Creator's response ("accepted" or "declined")
        notes: Optional notes from creator

    Returns:
        bool: Success status
    """
    try:
        dashboard_url = f"{settings.FRONTEND_URL}/agency/opportunities"

        if response == "accepted":
            subject = f"{creator_name} accepted the {brand_name} opportunity!"
            status_color = "#16a34a"
            status_text = "Accepted"
            emoji = "🎉"
        else:
            subject = f"{creator_name} declined the {brand_name} opportunity"
            status_color = "#ef4444"
            status_text = "Declined"
            emoji = "😔"

        notes_html = ""
        if notes:
            notes_html = f"""
            <div style="background:#f8fafc;padding:16px;border-radius:8px;margin:16px 0;">
                <p style="margin:0 0 4px;color:#64748b;font-size:12px;font-weight:600;">Creator's Notes:</p>
                <p style="margin:0;color:#334155;font-size:14px;">{notes}</p>
            </div>
            """

        html_content = f"""
        <!doctype html>
        <html>
        <body style="font-family:Arial,Helvetica,sans-serif;background:#f5f7fb;padding:24px;margin:0;">
            <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
                <div style="text-align:center;margin-bottom:24px;">
                    <h1 style="margin:0;color:#0f172a;font-weight:800;font-size:28px;">{emoji} Opportunity Response</h1>
                </div>

                <p style="margin:0 0 16px;color:#334155;font-size:16px;line-height:24px;">
                    Hi,
                </p>

                <p style="margin:0 0 16px;color:#334155;font-size:16px;line-height:24px;">
                    <strong>{creator_name}</strong> has responded to the <strong>{brand_name}</strong> opportunity.
                </p>

                <div style="background:#f8fafc;padding:20px;border-radius:8px;margin:24px 0;">
                    <h3 style="margin:0 0 8px;color:#0f172a;font-size:18px;font-weight:700;">{opportunity_title}</h3>
                    <p style="margin:0 0 12px;color:#64748b;font-size:14px;">Brand: {brand_name}</p>
                    <div style="display:inline-block;background:{status_color};color:#ffffff;padding:4px 12px;border-radius:4px;font-size:14px;font-weight:600;">
                        {status_text}
                    </div>
                </div>

                {notes_html}

                <div style="text-align:center;margin:32px 0;">
                    <a href="{dashboard_url}"
                       style="background:linear-gradient(to right,#16a34a,#15803d);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;display:inline-block;font-weight:600;font-size:16px;">
                        View in Dashboard
                    </a>
                </div>

                <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;text-align:center;line-height:18px;">
                    © {datetime.utcnow().year} Repruv. All rights reserved.
                </p>
            </div>
        </body>
        </html>
        """

        success = send_email(agency_email, subject, html_content)
        if success:
            logger.info(f"Opportunity response notification sent to {agency_email}: {response}")
        return success

    except Exception as e:
        logger.error(f"Failed to send opportunity response notification to {agency_email}: {e}")
        return False