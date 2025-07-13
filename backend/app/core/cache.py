"""
Redis cache configuration and utilities.

This module provides caching functionality for frequently accessed data
like review counts, analytics, and API responses.
"""

import json
from datetime import timedelta
from functools import wraps
from typing import Any, Callable, Optional, Union

import redis.asyncio as redis
from loguru import logger

from app.core.config import settings

# Create Redis clients
redis_client = redis.from_url(
    settings.REDIS_CACHE_URL,
    encoding="utf-8",
    decode_responses=True,
)


class CacheKeys:
    """Centralized cache key definitions."""
    
    # Review cache keys
    REVIEW_COUNT = "review_count:{location_id}"
    REVIEW_STATS = "review_stats:{location_id}"
    RECENT_REVIEWS = "recent_reviews:{location_id}:{page}"
    
    # Analytics cache keys
    ANALYTICS_DASHBOARD = "analytics_dashboard:{location_id}:{date_range}"
    SENTIMENT_BREAKDOWN = "sentiment_breakdown:{location_id}"
    RATING_DISTRIBUTION = "rating_distribution:{location_id}"
    
    # User cache keys
    USER_PERMISSIONS = "user_permissions:{user_id}:{org_id}"
    USER_LOCATIONS = "user_locations:{user_id}"
    
    # AI cache keys
    AI_RESPONSE_SUGGESTION = "ai_response:{review_id}"
    BRAND_VOICE = "brand_voice:{location_id}"


async def get_cache(key: str) -> Optional[Any]:
    """
    Get value from cache.
    
    Args:
        key: Cache key
        
    Returns:
        Cached value or None if not found
    """
    try:
        value = await redis_client.get(key)
        if value:
            return json.loads(value)
        return None
    except Exception as e:
        logger.error(f"Cache get error for key {key}: {e}")
        return None


async def set_cache(
    key: str,
    value: Any,
    ttl: Optional[int] = None,
) -> bool:
    """
    Set value in cache.
    
    Args:
        key: Cache key
        value: Value to cache
        ttl: Time to live in seconds (default from settings)
        
    Returns:
        bool: Success status
    """
    try:
        serialized = json.dumps(value)
        if ttl is None:
            ttl = settings.REDIS_CACHE_TTL
        
        await redis_client.setex(key, ttl, serialized)
        return True
    except Exception as e:
        logger.error(f"Cache set error for key {key}: {e}")
        return False


async def delete_cache(pattern: str) -> int:
    """
    Delete cache keys matching pattern.
    
    Args:
        pattern: Key pattern to match (supports wildcards)
        
    Returns:
        int: Number of keys deleted
    """
    try:
        keys = []
        async for key in redis_client.scan_iter(match=pattern):
            keys.append(key)
        
        if keys:
            return await redis_client.delete(*keys)
        return 0
    except Exception as e:
        logger.error(f"Cache delete error for pattern {pattern}: {e}")
        return 0


async def invalidate_location_cache(location_id: str) -> None:
    """
    Invalidate all cache entries for a specific location.
    
    Args:
        location_id: UUID of the location
    """
    patterns = [
        f"review_count:{location_id}",
        f"review_stats:{location_id}",
        f"recent_reviews:{location_id}:*",
        f"analytics_dashboard:{location_id}:*",
        f"sentiment_breakdown:{location_id}",
        f"rating_distribution:{location_id}",
        f"brand_voice:{location_id}",
    ]
    
    for pattern in patterns:
        await delete_cache(pattern)


async def invalidate_user_cache(user_id: str) -> None:
    """
    Invalidate all cache entries for a specific user.
    
    Args:
        user_id: UUID of the user
    """
    patterns = [
        f"user_permissions:{user_id}:*",
        f"user_locations:{user_id}",
    ]
    
    for pattern in patterns:
        await delete_cache(pattern)


def cache_result(
    key_pattern: str,
    ttl: Optional[int] = None,
    key_builder: Optional[Callable] = None,
):
    """
    Decorator to cache function results.
    
    Args:
        key_pattern: Cache key pattern with placeholders
        ttl: Time to live in seconds
        key_builder: Custom function to build cache key from args
        
    Example:
        @cache_result("user_locations:{user_id}", ttl=3600)
        async def get_user_locations(user_id: str):
            # Expensive database query
            return locations
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Build cache key
            if key_builder:
                cache_key = key_builder(*args, **kwargs)
            else:
                # Simple key building from first argument
                cache_key = key_pattern.format(**kwargs) if kwargs else key_pattern.format(args[0] if args else "")
            
            # Try to get from cache
            cached = await get_cache(cache_key)
            if cached is not None:
                logger.debug(f"Cache hit for key: {cache_key}")
                return cached
            
            # Execute function and cache result
            result = await func(*args, **kwargs)
            await set_cache(cache_key, result, ttl)
            logger.debug(f"Cache miss for key: {cache_key}, cached result")
            
            return result
        
        return wrapper
    return decorator


# Rate limiting using Redis
class RateLimiter:
    """Rate limiter using Redis for API endpoints."""
    
    @staticmethod
    async def check_rate_limit(
        key: str,
        limit: int,
        window: int = 60,
    ) -> tuple[bool, int]:
        """
        Check if rate limit is exceeded.
        
        Args:
            key: Rate limit key (e.g., "api:user_id:endpoint")
            limit: Maximum requests allowed
            window: Time window in seconds
            
        Returns:
            tuple: (is_allowed, remaining_requests)
        """
        try:
            pipe = redis_client.pipeline()
            now = int(timedelta(seconds=window).total_seconds())
            
            pipe.incr(key)
            pipe.expire(key, window)
            results = await pipe.execute()
            
            current_requests = results[0]
            
            if current_requests > limit:
                return False, 0
            
            return True, limit - current_requests
        except Exception as e:
            logger.error(f"Rate limit check error: {e}")
            # Allow request on error
            return True, limit