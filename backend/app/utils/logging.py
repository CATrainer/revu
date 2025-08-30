"""
Structured logging setup using Python's logging module, with dev/prod formatters,
log levels, rotation, and a bridge from Loguru to standard logging so existing
code continues to work.
"""
from __future__ import annotations

import json
import logging
import logging.config
import os
from datetime import datetime
from logging.handlers import TimedRotatingFileHandler
from pathlib import Path
from typing import Any, Dict

from loguru import logger as loguru_logger

from app.core.config import settings


class JsonFormatter(logging.Formatter):
    """Minimal JSON formatter for production logs."""

    def format(self, record: logging.LogRecord) -> str:  # noqa: D401
        payload: Dict[str, Any] = {
            "ts": datetime.utcfromtimestamp(record.created).isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info:
            payload["exc_info"] = self.formatException(record.exc_info)
        # Include any extra structured fields if present
        for key, value in record.__dict__.items():
            if key not in payload and key not in (
                "name",
                "msg",
                "args",
                "levelno",
                "levelname",
                "pathname",
                "filename",
                "module",
                "exc_info",
                "exc_text",
                "stack_info",
                "lineno",
                "funcName",
                "created",
                "msecs",
                "relativeCreated",
                "thread",
                "threadName",
                "processName",
                "process",
            ):
                try:
                    json.dumps({key: value})
                    payload[key] = value
                except Exception:
                    payload[key] = str(value)
        return json.dumps(payload)


def _configure_standard_logging() -> None:
    level = getattr(logging, str(settings.LOG_LEVEL).upper(), logging.INFO)

    root = logging.getLogger()
    root.setLevel(level)

    # Console handler
    console = logging.StreamHandler()
    if settings.is_development:
        console.setFormatter(
            logging.Formatter(
                fmt="%(asctime)s | %(levelname)-8s | %(name)s:%(funcName)s:%(lineno)d | %(message)s",
                datefmt="%Y-%m-%d %H:%M:%S",
            )
        )
    else:
        console.setFormatter(JsonFormatter())
    console.setLevel(level)
    root.addHandler(console)

    # File rotation in production
    if settings.is_production and not settings.is_testing:
        log_dir = Path("logs")
        log_dir.mkdir(exist_ok=True)
        file_handler = TimedRotatingFileHandler(
            filename=str(log_dir / "app.log"), when="midnight", backupCount=30, encoding="utf-8"
        )
        file_handler.setLevel(logging.INFO)
        file_handler.setFormatter(JsonFormatter())
        root.addHandler(file_handler)

    # Quiet noisy third-party loggers a bit
    for noisy in ("uvicorn", "uvicorn.error", "uvicorn.access", "httpx", "sqlalchemy.engine"):
        logging.getLogger(noisy).setLevel(max(logging.WARNING, level))


def _bridge_loguru_to_logging() -> None:
    """Forward Loguru logs into standard logging so existing code keeps working."""

    class StdLoggingSink:
        def __init__(self) -> None:
            self._logger_cache: Dict[str, logging.Logger] = {}

        def __call__(self, message):  # loguru Message
            record = message.record
            name = record.get("name") or "app"
            std_logger = self._logger_cache.get(name)
            if std_logger is None:
                std_logger = logging.getLogger(name)
                self._logger_cache[name] = std_logger
            std_logger.log(record["level"].no, record["message"])  # type: ignore[index]

    # Remove default loguru handlers and add bridge
    loguru_logger.remove()
    loguru_logger.add(StdLoggingSink(), enqueue=True)


def setup_logging() -> None:
    """Initialize application logging using Python logging with Loguru bridge."""
    _configure_standard_logging()
    _bridge_loguru_to_logging()

    # Optional Sentry
    if settings.SENTRY_DSN and not settings.is_development:
        try:
            import sentry_sdk
            from sentry_sdk.integrations.fastapi import FastApiIntegration
            from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

            sentry_sdk.init(
                dsn=settings.SENTRY_DSN,
                environment=settings.ENVIRONMENT,
                integrations=[FastApiIntegration(transaction_style="endpoint"), SqlalchemyIntegration()],
                traces_sample_rate=0.1 if settings.is_production else 1.0,
                attach_stacktrace=True,
                send_default_pii=False,
            )
            logging.getLogger(__name__).info("Sentry error tracking initialized")
        except ImportError:
            logging.getLogger(__name__).warning("Sentry SDK not installed")

    logging.getLogger(__name__).info(
        "Logging initialized", extra={"environment": settings.ENVIRONMENT, "level": settings.LOG_LEVEL}
    )


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)


def log_request(method: str, path: str, status_code: int, duration_ms: float, **kwargs) -> None:
    logging.getLogger("http").info(
        "%s %s - %s (%.2fms)", method, path, status_code, duration_ms, extra=kwargs
    )


def log_error(error_type: str, error_message: str, **kwargs) -> None:
    logging.getLogger("errors").error("%s: %s", error_type, error_message, extra=kwargs)