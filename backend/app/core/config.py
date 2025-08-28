"""
Core configuration module using Pydantic Settings.

This module defines all configuration parameters for the application,
loading from environment variables and providing validation.
"""

from functools import lru_cache
from pathlib import Path
from typing import List, Optional, Union

from pydantic import AnyHttpUrl, EmailStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


 # Resolve project root (backend folder) to load .env reliably regardless of CWD
_BACKEND_ROOT = Path(__file__).resolve().parents[2]
_ENV_FILES = (
    _BACKEND_ROOT / ".env",
    _BACKEND_ROOT / ".env.local",
    Path.cwd() / ".env",
    Path.cwd() / ".env.local",
)


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=_ENV_FILES,
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    APP_NAME: str = "Repruv"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"
    FRONTEND_URL: str = "http://localhost:3000"
    BACKEND_BASE_URL: Optional[str] = None

    # API Configuration
    API_V1_PREFIX: str = "/api/v1"

    # CORS
    BACKEND_CORS_ORIGINS: List[AnyHttpUrl] = []

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, str) and v.startswith("["):
            # Parse JSON string
            import json
            try:
                origins = json.loads(v)
                # Ensure they're strings without trailing slashes
                return [origin.rstrip('/') for origin in origins]
            except:
                return []
        elif isinstance(v, list):
            # Ensure they're strings without trailing slashes
            return [str(origin).rstrip('/') for origin in v]
        return []

    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Database
    DATABASE_URL: str
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 40
    DATABASE_ECHO: bool = False

    # Redis
    REDIS_URL: str
    REDIS_CACHE_URL: str
    REDIS_CACHE_TTL: int = 3600  # 1 hour default

    # Celery
    CELERY_BROKER_URL: str
    CELERY_RESULT_BACKEND: str

    # Supabase
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str
    # Toggle use of Supabase Python client (use direct HTTP by default to avoid env proxy issues)
    SUPABASE_ENABLE_CLIENT: bool = False

    # OpenAI
    OPENAI_API_KEY: str
    OPENAI_MODEL: str = "gpt-4-turbo-preview"
    OPENAI_MAX_TOKENS: int = 500
    OPENAI_TEMPERATURE: float = 0.7

    # YouTube / OAuth (optional)
    YOUTUBE_API_KEY: Optional[str] = None
    OAUTH_REDIRECT_URI: Optional[str] = None

    # Calendly
    CALENDLY_ACCESS_TOKEN: str

    # Email
    RESEND_API_KEY: str
    EMAIL_FROM_ADDRESS: EmailStr
    EMAIL_FROM_NAME: str = "Repruv"

    # File Storage
    S3_ENDPOINT_URL: Optional[str] = None
    S3_ACCESS_KEY_ID: Optional[str] = None
    S3_SECRET_ACCESS_KEY: Optional[str] = None
    S3_BUCKET_NAME: str = "Repruv-files"
    S3_REGION: str = "auto"

    # External APIs
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_REDIRECT_URI: Optional[str] = None

    # Stripe
    STRIPE_SECRET_KEY: Optional[str] = None
    STRIPE_WEBHOOK_SECRET: Optional[str] = None
    STRIPE_PUBLISHABLE_KEY: Optional[str] = None

    # Monitoring
    SENTRY_DSN: Optional[str] = None

    # Crypto
    ENCRYPTION_KEY: Optional[str] = None

    # Feature Flags
    ENABLE_SOCIAL_MONITORING: bool = False
    ENABLE_COMPETITOR_TRACKING: bool = True
    ENABLE_AI_RESPONSES: bool = True

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    RATE_LIMIT_PER_HOUR: int = 1000

    # Computed Properties
    @property
    def is_production(self) -> bool:
        """Check if running in production environment."""
        return self.ENVIRONMENT == "production"

    @property
    def is_development(self) -> bool:
        """Check if running in development environment."""
        return self.ENVIRONMENT == "development"

    @property
    def is_testing(self) -> bool:
        """Check if running in test environment."""
        return self.ENVIRONMENT == "testing"

    @property
    def database_url_sync(self) -> str:
        """Get synchronous database URL for Alembic."""
        return self.DATABASE_URL.replace("+asyncpg", "")


@lru_cache
def get_settings() -> Settings:
    """
    Get cached settings instance.

    This function uses LRU cache to ensure settings are only loaded once
    and reused throughout the application lifecycle.
    """
    return Settings()


# Create a global settings instance
settings = get_settings()
