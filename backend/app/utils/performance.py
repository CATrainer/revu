"""
Performance monitoring and optimization utilities.

This module provides tools for measuring and optimizing application performance.
"""

import time
import functools
from typing import Any, Callable, Dict, Optional
from contextlib import contextmanager
from app.core.logging import get_logger

logger = get_logger("performance")


class PerformanceTimer:
    """Context manager for timing operations."""
    
    def __init__(self, operation_name: str, log_result: bool = True):
        self.operation_name = operation_name
        self.log_result = log_result
        self.start_time: Optional[float] = None
        self.end_time: Optional[float] = None
    
    def __enter__(self):
        self.start_time = time.perf_counter()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.end_time = time.perf_counter()
        duration = self.duration
        
        if self.log_result:
            if duration > 1.0:
                logger.warning(f"{self.operation_name} took {duration:.2f}s (slow)")
            else:
                logger.debug(f"{self.operation_name} took {duration:.3f}s")
    
    @property
    def duration(self) -> float:
        """Get the duration in seconds."""
        if self.start_time is None or self.end_time is None:
            return 0.0
        return self.end_time - self.start_time


def timed_operation(operation_name: Optional[str] = None):
    """Decorator to time function execution."""
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            name = operation_name or f"{func.__module__}.{func.__name__}"
            with PerformanceTimer(name):
                return await func(*args, **kwargs)
        
        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            name = operation_name or f"{func.__module__}.{func.__name__}"
            with PerformanceTimer(name):
                return func(*args, **kwargs)
        
        # Return appropriate wrapper based on function type
        if hasattr(func, '__code__') and func.__code__.co_flags & 0x80:  # CO_COROUTINE
            return async_wrapper
        return sync_wrapper
    
    return decorator


@contextmanager
def measure_time(operation_name: str):
    """Context manager for measuring execution time."""
    with PerformanceTimer(operation_name) as timer:
        yield timer


class QueryOptimizer:
    """Utilities for optimizing database queries."""
    
    @staticmethod
    def batch_size_for_count(total_count: int, max_batch_size: int = 1000) -> int:
        """Calculate optimal batch size based on total count."""
        if total_count <= 100:
            return total_count
        elif total_count <= 1000:
            return min(100, total_count)
        else:
            return min(max_batch_size, max(100, total_count // 10))
    
    @staticmethod
    def should_use_pagination(count: int, threshold: int = 500) -> bool:
        """Determine if pagination should be used based on count."""
        return count > threshold


class CacheManager:
    """Simple in-memory cache with TTL support."""
    
    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache if not expired."""
        if key not in self._cache:
            return None
        
        entry = self._cache[key]
        if time.time() > entry['expires_at']:
            del self._cache[key]
            return None
        
        return entry['value']
    
    def set(self, key: str, value: Any, ttl_seconds: int = 300):
        """Set value in cache with TTL."""
        self._cache[key] = {
            'value': value,
            'expires_at': time.time() + ttl_seconds
        }
    
    def clear(self):
        """Clear all cached values."""
        self._cache.clear()
    
    def size(self) -> int:
        """Get number of cached items."""
        return len(self._cache)


# Global cache instance
cache = CacheManager()
