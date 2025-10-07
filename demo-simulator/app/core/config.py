"""Configuration for demo simulator service."""
import os
from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""
    
    # Application
    APP_NAME: str = "Repruv Demo Simulator"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # API Keys
    CLAUDE_API_KEY: str
    
    # Main App Integration
    MAIN_APP_URL: str
    MAIN_APP_WEBHOOK_SECRET: str
    
    # Database
    DATABASE_URL: str
    DB_ECHO: bool = False
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Celery
    CELERY_BROKER_URL: Optional[str] = None
    CELERY_RESULT_BACKEND: Optional[str] = None
    
    # Demo Configuration
    DEMO_MODE_ENABLED: bool = True
    MAX_DEMO_PROFILES_PER_USER: int = 1
    MAX_INTERACTIONS_PER_DAY: int = 1000
    
    # Content Generation
    DEFAULT_COMMENTS_PER_VIDEO: int = 100
    DEFAULT_DMS_PER_DAY: int = 20
    CONTENT_CACHE_TTL: int = 86400  # 24 hours
    
    # Engagement Patterns
    VIRAL_THRESHOLD_MULTIPLIER: float = 5.0  # 5x normal engagement
    COMMENT_DECAY_RATE: float = 0.3  # 30% reduction per hour
    
    # Cost Controls
    MAX_AI_CALLS_PER_HOUR: int = 500
    USE_GENERATION_CACHE: bool = True
    
    class Config:
        env_file = ".env"
        case_sensitive = True
    
    @property
    def celery_broker(self) -> str:
        """Get Celery broker URL."""
        return self.CELERY_BROKER_URL or self.REDIS_URL
    
    @property
    def celery_backend(self) -> str:
        """Get Celery result backend URL."""
        return self.CELERY_RESULT_BACKEND or self.REDIS_URL


settings = Settings()
