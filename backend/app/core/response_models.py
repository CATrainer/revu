"""
Standardized response models for API endpoints.

This module provides consistent response structures across the application.
"""

from typing import Any, Dict, Generic, List, Optional, TypeVar
from pydantic import BaseModel, Field

T = TypeVar('T')


class BaseResponse(BaseModel, Generic[T]):
    """Base response model with consistent structure."""
    
    success: bool = Field(default=True, description="Whether the request was successful")
    message: Optional[str] = Field(default=None, description="Human-readable message")
    data: Optional[T] = Field(default=None, description="Response data")
    errors: Optional[List[str]] = Field(default=None, description="List of error messages")
    meta: Optional[Dict[str, Any]] = Field(default=None, description="Additional metadata")


class PaginatedResponse(BaseResponse[List[T]]):
    """Response model for paginated data."""
    
    pagination: Dict[str, Any] = Field(
        description="Pagination metadata",
        default_factory=lambda: {
            "page": 1,
            "per_page": 20,
            "total": 0,
            "pages": 0,
            "has_next": False,
            "has_prev": False
        }
    )


class SuccessResponse(BaseResponse[T]):
    """Response model for successful operations."""
    
    def __init__(self, data: Optional[T] = None, message: Optional[str] = None, **kwargs):
        super().__init__(
            success=True,
            data=data,
            message=message,
            **kwargs
        )


class ErrorResponse(BaseResponse[None]):
    """Response model for error responses."""
    
    def __init__(self, message: str, errors: Optional[List[str]] = None, **kwargs):
        super().__init__(
            success=False,
            message=message,
            errors=errors or [],
            data=None,
            **kwargs
        )


def success_response(
    data: Optional[T] = None,
    message: Optional[str] = None,
    meta: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Create a success response dictionary."""
    response = {
        "success": True,
        "data": data,
    }
    
    if message:
        response["message"] = message
    
    if meta:
        response["meta"] = meta
    
    return response


def error_response(
    message: str,
    errors: Optional[List[str]] = None,
    meta: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Create an error response dictionary."""
    response = {
        "success": False,
        "message": message,
        "data": None,
    }
    
    if errors:
        response["errors"] = errors
    
    if meta:
        response["meta"] = meta
    
    return response


def paginated_response(
    data: List[T],
    page: int = 1,
    per_page: int = 20,
    total: int = 0,
    message: Optional[str] = None
) -> Dict[str, Any]:
    """Create a paginated response dictionary."""
    pages = (total + per_page - 1) // per_page if per_page > 0 else 0
    
    return {
        "success": True,
        "data": data,
        "message": message,
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "pages": pages,
            "has_next": page < pages,
            "has_prev": page > 1,
        }
    }
