"""Error handling middleware and exception handlers for YouTube-related errors."""
from __future__ import annotations

from typing import Any, Optional

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from loguru import logger

from app.utils.errors import (
    YouTubeConnectionError,
    TokenRefreshError,
    QuotaExceededError,
)


def _payload(code: str, message: str, detail: Optional[Any] = None) -> dict[str, Any]:
    body: dict[str, Any] = {
        "success": False,
        "error": {
            "code": code,
            "message": message,
        },
    }
    if detail is not None:
        body["error"]["detail"] = detail
    return body


async def _handle_youtube_connection_error(request: Request, exc: YouTubeConnectionError) -> JSONResponse:
    logger.warning(f"YouTube connection error on {request.method} {request.url.path}: {exc}")
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content=_payload(
            "YOUTUBE_CONNECTION_ERROR",
            "There was a problem with your YouTube connection. Please reconnect and try again.",
        ),
    )


async def _handle_token_refresh_error(request: Request, exc: TokenRefreshError) -> JSONResponse:
    logger.info(f"Token refresh failed on {request.method} {request.url.path}: {exc}")
    return JSONResponse(
        status_code=status.HTTP_401_UNAUTHORIZED,
        content=_payload(
            "TOKEN_REFRESH_FAILED",
            "Your YouTube session has expired. Please reconnect your YouTube account.",
        ),
    )


async def _handle_quota_exceeded_error(request: Request, exc: QuotaExceededError) -> JSONResponse:
    logger.warning(f"Quota exceeded on {request.method} {request.url.path}: {exc}")
    # Include a Retry-After header to hint clients
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content=_payload(
            "YOUTUBE_QUOTA_EXCEEDED",
            "YouTube API quota has been exceeded. Please try again later.",
        ),
        headers={"Retry-After": "3600"},
    )


def register_error_handlers(app: FastAPI) -> None:
    """Register exception handlers for specific YouTube errors."""
    app.add_exception_handler(YouTubeConnectionError, _handle_youtube_connection_error)
    app.add_exception_handler(TokenRefreshError, _handle_token_refresh_error)
    app.add_exception_handler(QuotaExceededError, _handle_quota_exceeded_error)


def add_error_handling_middleware(app: FastAPI) -> None:
    """Install middleware that catches YouTube-specific errors early and formats responses."""

    @app.middleware("http")
    async def youtube_error_middleware(request: Request, call_next):  # type: ignore[override]
        try:
            return await call_next(request)
        except YouTubeConnectionError as e:
            return await _handle_youtube_connection_error(request, e)
        except TokenRefreshError as e:
            return await _handle_token_refresh_error(request, e)
        except QuotaExceededError as e:
            return await _handle_quota_exceeded_error(request, e)
