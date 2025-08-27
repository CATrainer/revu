"""
Application metrics collection and export.

This module provides Prometheus metrics for YouTube API usage,
sync performance, error rates, and response times. It also
supports optional forwarding to an external monitoring service.
"""
from __future__ import annotations

import os
import time
from contextlib import contextmanager
from typing import Dict, Optional

from prometheus_client import Counter, Histogram, CollectorRegistry, generate_latest, CONTENT_TYPE_LATEST

# Create a dedicated registry to avoid double-registration in tests
REGISTRY = CollectorRegistry(auto_describe=True)

# --- Metric definitions ---
YOUTUBE_API_CALLS = Counter(
    "youtube_api_calls_total",
    "Total number of YouTube API calls made",
    ["operation", "status"],
    registry=REGISTRY,
)

YOUTUBE_API_QUOTA = Counter(
    "youtube_api_quota_units_total",
    "Total YouTube API quota units consumed (estimated)",
    ["operation"],
    registry=REGISTRY,
)

YOUTUBE_API_LATENCY = Histogram(
    "youtube_api_call_seconds",
    "Latency for YouTube API calls in seconds",
    ["operation"],
    registry=REGISTRY,
    buckets=(0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5, 10),
)

SYNC_DURATION = Histogram(
    "youtube_sync_duration_seconds",
    "Duration of sync jobs in seconds",
    ["sync_type"],
    registry=REGISTRY,
    buckets=(1, 2, 5, 10, 30, 60, 120, 300, 600),
)

SYNC_ERRORS = Counter(
    "youtube_sync_errors_total",
    "Total sync errors",
    ["sync_type", "error"],
    registry=REGISTRY,
)

REQUEST_ERRORS = Counter(
    "service_errors_total",
    "Total service errors by type",
    ["error_type"],
    registry=REGISTRY,
)


def record_youtube_api_call(operation: str, status: str, duration_seconds: float, quota_units: int = 0) -> None:
    """Record a YouTube API call result.

    Args:
        operation: e.g., "videos.list", "commentThreads.list"
        status: "ok" or an error class, e.g., "InvalidTokenError", "HttpError"
        duration_seconds: seconds elapsed
        quota_units: estimated units consumed for the call
    """
    op = operation or "unknown"
    st = status or "unknown"
    YOUTUBE_API_CALLS.labels(operation=op, status=st).inc()
    YOUTUBE_API_LATENCY.labels(operation=op).observe(max(0.0, float(duration_seconds)))
    if quota_units > 0:
        YOUTUBE_API_QUOTA.labels(operation=op).inc(quota_units)


@contextmanager
def track_sync(sync_type: str):
    """Context manager to time a sync block and record duration.

    Usage:
        with track_sync("full_videos"):
            ... work ...
    """
    t0 = time.perf_counter()
    try:
        yield
    except Exception as e:  # noqa: BLE001
        SYNC_ERRORS.labels(sync_type=sync_type, error=type(e).__name__).inc()
        raise
    finally:
        dt = time.perf_counter() - t0
        SYNC_DURATION.labels(sync_type=sync_type).observe(dt)


def export_prometheus_text() -> bytes:
    """Return Prometheus exposition text for scraping."""
    return generate_latest(REGISTRY)


def content_type() -> str:
    return CONTENT_TYPE_LATEST


def notify_monitoring_service(event: str, payload: Optional[Dict] = None) -> None:
    """Optional hook to forward metrics/events to an external service.

    No-op by default; can be wired to a service like Sentry, Datadog, etc.
    """
    # Placeholder: integrate with your monitoring vendor here
    _ = (event, payload, os.getenv("MONITORING_WEBHOOK_URL"))
    return
