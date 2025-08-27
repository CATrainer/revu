"""Custom exception types used across YouTube integration and sync logic."""
from __future__ import annotations


class BaseAppError(Exception):
    """Base application exception that stores a message attribute."""

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


class YouTubeConnectionError(BaseAppError):
    """Raised when establishing or using a YouTube connection fails."""


class TokenRefreshError(BaseAppError):
    """Raised when refreshing an OAuth token fails."""


class QuotaExceededError(BaseAppError):
    """Raised when YouTube Data API quota has been exceeded."""


class InvalidTokenError(BaseAppError):
    """Raised when an access/refresh token is invalid or expired."""


class SyncError(BaseAppError):
    """Raised for generic synchronization failures."""
