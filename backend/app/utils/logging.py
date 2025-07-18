"""
Logging configuration and utilities.

This module sets up structured logging using Loguru with
proper formatting, rotation, and integration with Sentry.
"""

import json
import sys
from pathlib import Path
from typing import Any, Dict

from loguru import logger

from app.core.config import settings


def setup_logging() -> None:
    """
    Configure logging for the application.
    """
    # Remove default handler
    logger.remove()

    # Simple console handler for both dev and prod
    logger.add(
        sys.stdout,
        format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} | {message}",
        level=settings.LOG_LEVEL,
        colorize=settings.is_development,
        enqueue=True,
    )

    # File handler for production
    if not settings.is_testing and settings.is_production:
        log_path = Path("logs")
        log_path.mkdir(exist_ok=True)

        logger.add(
            log_path / "revu_{time:YYYY-MM-DD}.log",
            rotation="1 day",
            retention="30 days",
            compression="gz",
            enqueue=True,
            level="INFO",
        )

    # Configure Sentry if available
    if settings.SENTRY_DSN and not settings.is_development:
        try:
            import sentry_sdk
            from sentry_sdk.integrations.fastapi import FastApiIntegration
            from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
            
            sentry_sdk.init(
                dsn=settings.SENTRY_DSN,
                environment=settings.ENVIRONMENT,
                integrations=[
                    FastApiIntegration(transaction_style="endpoint"),
                    SqlalchemyIntegration(),
                ],
                traces_sample_rate=0.1 if settings.is_production else 1.0,
                attach_stacktrace=True,
                send_default_pii=False,
            )
            logger.info("Sentry error tracking initialized")
        except ImportError:
            logger.warning("Sentry SDK not installed")

    # Log startup info
    logger.info(
        f"Logging initialized | "
        f"Environment: {settings.ENVIRONMENT} | "
        f"Level: {settings.LOG_LEVEL}"
    )


# Utility functions for structured logging
def log_request(
    method: str, path: str, status_code: int, duration_ms: float, **kwargs
) -> None:
    """
    Log HTTP request with structured data.
    """
    logger.info(
        f"{method} {path} - {status_code} ({duration_ms:.2f}ms)",
        http_method=method,
        http_path=path,
        http_status=status_code,
        duration_ms=duration_ms,
        **kwargs,
    )


def log_error(error_type: str, error_message: str, **kwargs) -> None:
    """
    Log error with structured data.
    """
    logger.error(
        f"{error_type}: {error_message}",
        error_type=error_type,
        error_message=error_message,
        **kwargs,
    )


def get_logger(name: str):
    """
    Get a logger instance with a specific name.
    """
    return logger.bind(name=name)