"""
Custom exception classes for the application.

This module provides standardized exception handling across the application.
"""

from typing import Any, Dict, Optional
from fastapi import HTTPException, status


class RepruvrError(Exception):
    """Base exception class for Repruv application errors."""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        self.message = message
        self.details = details or {}
        super().__init__(self.message)


class ValidationError(RepruvrError):
    """Raised when input validation fails."""
    pass


class AuthenticationError(RepruvrError):
    """Raised when authentication fails."""
    pass


class AuthorizationError(RepruvrError):
    """Raised when user lacks required permissions."""
    pass


class ResourceNotFoundError(RepruvrError):
    """Raised when a requested resource is not found."""
    pass


class ServiceUnavailableError(RepruvrError):
    """Raised when an external service is unavailable."""
    pass


class RateLimitError(RepruvrError):
    """Raised when rate limits are exceeded."""
    pass


def create_http_exception(
    status_code: int,
    message: str,
    details: Optional[Dict[str, Any]] = None
) -> HTTPException:
    """Create a standardized HTTP exception."""
    return HTTPException(
        status_code=status_code,
        detail={
            "message": message,
            "details": details or {},
            "success": False
        }
    )


def validation_exception(message: str, details: Optional[Dict[str, Any]] = None) -> HTTPException:
    """Create a validation error HTTP exception."""
    return create_http_exception(status.HTTP_400_BAD_REQUEST, message, details)


def not_found_exception(message: str = "Resource not found") -> HTTPException:
    """Create a not found HTTP exception."""
    return create_http_exception(status.HTTP_404_NOT_FOUND, message)


def unauthorized_exception(message: str = "Authentication required") -> HTTPException:
    """Create an unauthorized HTTP exception."""
    return create_http_exception(status.HTTP_401_UNAUTHORIZED, message)


def forbidden_exception(message: str = "Insufficient permissions") -> HTTPException:
    """Create a forbidden HTTP exception."""
    return create_http_exception(status.HTTP_403_FORBIDDEN, message)


def service_unavailable_exception(message: str = "Service temporarily unavailable") -> HTTPException:
    """Create a service unavailable HTTP exception."""
    return create_http_exception(status.HTTP_503_SERVICE_UNAVAILABLE, message)
