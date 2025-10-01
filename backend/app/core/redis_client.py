"""
Redis client configuration for caching and pub/sub
"""
import redis
from app.core.config import settings

# Initialize Redis client
_redis_client = None


def get_redis() -> redis.Redis:
    """
    Get Redis client instance (singleton).
    
    Returns:
        redis.Redis: Redis client for caching and pub/sub
    """
    global _redis_client
    
    if _redis_client is None:
        # Parse Redis URL from settings
        redis_url = settings.REDIS_CACHE_URL or settings.REDIS_URL
        
        _redis_client = redis.from_url(
            redis_url,
            decode_responses=True,  # Decode responses to strings
            socket_connect_timeout=5,
            socket_timeout=5,
        )
    
    return _redis_client


def close_redis():
    """Close Redis connection."""
    global _redis_client
    if _redis_client:
        _redis_client.close()
        _redis_client = None
