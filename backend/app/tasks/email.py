"""Email sending tasks."""

from datetime import datetime, timedelta
from typing import Dict, List

from celery import shared_task
from loguru import logger

from app.core.celery import celery_app
from app.core.config import settings


@celery_app.task(name="app.tasks.email.send_email")
def send_email(
    to: str,
    subject: str,
    html_content: str,
    from_email: str = None,
) -> bool:
    """
    Send an email using Resend.
    
    Args:
        to: Recipient email address
        subject: Email subject
        html_content: HTML content of the email
        from_email: Sender email (defaults to settings)
        
    Returns:
        bool: Success status
    """
    try:
        import resend
        
        resend.api_key = settings.RESEND_API_KEY
        
        params = {
            "from": from_email or f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM_ADDRESS}>",
            "to": [to],
            "subject": subject,
            "html": html_content,
        }
        
        email = resend.Emails.send(params)
        logger.info(f"Email sent successfully to {to}: {email['id']}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send email to {to}: {e}")
        return False


@celery_app.task(name="app.tasks.email.send_welcome_email")
def send_welcome_email(user_email: str, user_name: str) -> bool:
    """
    Send welcome email to new user.
    
    Args:
        user_email: User's email address
        user_name: User's full name
        
    Returns:
        bool: Success status
    """
    subject = "Welcome to Revu! Let's supercharge your reviews 🚀"
    
    html_content = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #6366F1;">Welcome to Revu, {user_name}!</h1>
                
                <p>You're about to save hours every week while building a stronger online reputation.</p>
                
                <h2>Your next steps:</h2>
                <ol>
                    <li>Connect your Google Business Profile (2 min)</li>
                    <li>Set up your AI brand voice (5 min)</li>
                    <li>Configure your first automation rule (3 min)</li>
                </ol>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{settings.FRONTEND_URL}/dashboard" 
                       style="background-color: #6366F1; color: white; padding: 12px 30px; 
                              text-decoration: none; border-radius: 6px; display: inline-block;">
                        Access Your Dashboard
                    </a>
                </div>
                
                <p>Need help? Reply to this email or book a quick onboarding call.</p>
                
                <hr style="border: 1px solid #eee; margin: 30px 0;">
                
                <p style="color: #666; font-size: 14px;">
                    Best regards,<br>
                    The Revu Team
                </p>
            </div>
        </body>
    </html>
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