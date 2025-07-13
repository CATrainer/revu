"""
Logging configuration and utilities.

This module sets up structured logging using Loguru with
proper formatting, rotation, and integration with Sentry.
"""

import json
import sys
from pathlib import Path
from typing import Any, Dict

import sentry_sdk
from loguru import logger
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

from app.core.config import settings


def serialize_record(record: Dict[str, Any]) -> str:
    """
    Serialize log record to JSON format for production.

    Args:
        record: Loguru record dictionary

    Returns:
        str: JSON formatted log entry
    """
    subset = {
        "timestamp": record["time"].isoformat(),
        "level": record["level"].name,
        "message": record["message"],
        "module": record["module"],
        "function": record["function"],
        "line": record["line"],
    }

    # Add extra fields
    if record.get("extra"):
        subset.update(record["extra"])

    # Add exception info if present
    if record.get("exception"):
        subset["exception"] = {
            "type": record["exception"].type.__name__,
            "value": str(record["exception"].value),
            "traceback": record["exception"].traceback.raw,
        }

    return json.dumps(subset)


def format_record(record: Dict[str, Any]) -> str:
    """
    Format log record for development (human-readable).

    Args:
        record: Loguru record dictionary

    Returns:
        str: Formatted log entry
    """
    # Color codes for different levels
    level_colors = {
        "TRACE": "<fg #999999>",
        "DEBUG": "<fg #00bfff>",
        "INFO": "<fg #00ff00>",
        "SUCCESS": "<fg #00ff00><bold>",
        "WARNING": "<fg #ffff00><bold>",
        "ERROR": "<fg #ff0000><bold>",
        "CRITICAL": "<fg #ff0000><bg #ffff00><bold>",
    }

    level = record["level"].name
    color = level_colors.get(level, "")

    # Format the log message
    format_string = (
        f"{color}{{time:YYYY-MM-DD HH:mm:ss.SSS}}</> | "
        f"{color}{{level: <8}}</> | "
        f"<cyan>{{name}}</cyan>:<cyan>{{function}}</cyan>:<cyan>{{line}}</cyan> | "
        f"{color}{{message}}</>"
    )

    return format_string


def setup_logging() -> None:
    """
    Configure logging for the application.

    Sets up:
    - Console logging with appropriate formatting
    - File logging with rotation
    - Sentry integration for error tracking
    - Custom log levels
    """
    # Remove default handler
    logger.remove()

    # Console handler
    if settings.is_development:
        # Human-readable format for development
        logger.add(
            sys.stdout,
            format=format_record,
            level=settings.LOG_LEVEL,
            colorize=True,
            enqueue=True,  # Thread-safe logging
        )
    else:
        # JSON format for production
        logger.add(
            sys.stdout,
            format=serialize_record,
            level=settings.LOG_LEVEL,
            colorize=False,
            enqueue=True,
            serialize=True,
        )

    # File handler (always JSON format)
    if not settings.is_testing:
        log_path = Path("logs")
        log_path.mkdir(exist_ok=True)

        logger.add(
            log_path / "revu_{time:YYYY-MM-DD}.log",
            rotation="1 day",
            retention="30 days",
            compression="gz",
            enqueue=True,
            serialize=True,
            level="INFO",
        )

        # Separate error log
        logger.add(
            log_path / "errors_{time:YYYY-MM-DD}.log",
            rotation="1 day",
            retention="90 days",
            compression="gz",
            enqueue=True,
            serialize=True,
            level="ERROR",
        )

    # Configure Sentry
    if settings.SENTRY_DSN and not settings.is_development:
        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            environment=settings.ENVIRONMENT,
            integrations=[
                FastApiIntegration(transaction_style="endpoint"),
                SqlalchemyIntegration(),
            ],
            traces_sample_rate=0.1 if settings.is_production else 1.0,
            profiles_sample_rate=0.1 if settings.is_production else 1.0,
            attach_stacktrace=True,
            send_default_pii=False,  # Don't send personally identifiable information
        )
        logger.info("Sentry error tracking initialized")

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

    Args:
        method: HTTP method
        path: Request path
        status_code: Response status code
        duration_ms: Request duration in milliseconds
        **kwargs: Additional fields to log
    """
    logger.info(
        f"{method} {path} - {status_code} ({duration_ms:.2f}ms)",
        extra={
            "http_method": method,
            "http_path": path,
            "http_status": status_code,
            "duration_ms": duration_ms,
            **kwargs,
        },
    )


def log_error(error_type: str, error_message: str, **kwargs) -> None:
    """
    Log error with structured data.

    Args:
        error_type: Type of error
        error_message: Error message
        **kwargs: Additional fields to log
    """
    logger.error(
        f"{error_type}: {error_message}",
        extra={
            "error_type": error_type,
            "error_message": error_message,
            **kwargs,
        },
    )


# Create logger instances for different modules
def get_logger(name: str) -> logger:
    """
    Get a logger instance with a specific name.

    Args:
        name: Logger name (usually __name__)

    Returns:
        Logger instance
    """
    return logger.bind(name=name)
