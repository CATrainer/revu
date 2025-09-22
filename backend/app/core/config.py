"""
Core configuration module using Pydantic Settings.
"""

from functools import lru_cache
from pathlib import Path
from typing import List, Optional, Union
import os
from urllib.parse import urlparse, urlunparse

from pydantic import field_validator, EmailStr
from pydantic_settings import BaseSettings, SettingsConfigDict

# Load .env files for local development
_BACKEND_ROOT = Path(__file__).resolve().parents[2]
_ENV_FILES = (
    _BACKEND_ROOT / ".env",
    _BACKEND_ROOT / ".env.local",
)

def make_redis_url_with_db(base_url: str, db: int) -> str:
    """
    Create a Redis URL with a specific database number.
    Handles cases where base_url might already have a database.
    """
    if not base_url:
        return f"redis://localhost:6379/{db}"
    
    parsed = urlparse(base_url)
    # Replace path with just the database number
    return urlunparse((
        parsed.scheme,
        parsed.netloc,  # includes auth and host:port
        f'/{db}',       # new path with db number
        parsed.params,
        parsed.query,
        parsed.fragment
    ))


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
    LOG_LEVEL: str = "INFO"  # ← ADD THIS LINE!
    FRONTEND_URL: str = "http://localhost:3000"
    BACKEND_BASE_URL: Optional[str] = None
    API_V1_PREFIX: str = "/api/v1"

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000"]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            return [i.strip() for i in v.split(",")]
        return v

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

    # Redis - Only this one is from env, with fallback
    REDIS_URL: str = "redis://localhost:6379/0"

    # Cache TTL
    REDIS_CACHE_TTL: int = 3600  # 1 hour default

    # These are computed properties, NOT from environment
    @property
    def REDIS_CACHE_URL(self) -> str:
        """Redis URL for cache (database 2)."""
        return make_redis_url_with_db(self.REDIS_URL, 2)
    
    @property
    def CELERY_BROKER_URL(self) -> str:
        """Redis URL for Celery broker (database 0)."""
        return make_redis_url_with_db(self.REDIS_URL, 0)
    
    @property
    def CELERY_RESULT_BACKEND(self) -> str:
        """Redis URL for Celery result backend (database 1)."""
        return make_redis_url_with_db(self.REDIS_URL, 1)

    # Supabase
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str
    SUPABASE_ENABLE_CLIENT: bool = False

    # OpenAI
    OPENAI_API_KEY: str
    OPENAI_MODEL: str = "gpt-4-turbo-preview"
    OPENAI_MAX_TOKENS: int = 500
    OPENAI_TEMPERATURE: float = 0.7

    # Claude (optional)
    CLAUDE_API_KEY: Optional[str] = None
    CLAUDE_MODEL: Optional[str] = "claude-3-opus-20240229"
    CLAUDE_MAX_TOKENS: int = 500

    # YouTube / OAuth (optional)
    YOUTUBE_API_KEY: Optional[str] = None
    OAUTH_REDIRECT_URI: Optional[str] = None

    # Email
    RESEND_API_KEY: str
    EMAIL_FROM_ADDRESS: EmailStr
    EMAIL_FROM_NAME: str = "Repruv"

    # SendGrid (optional)
    SENDGRID_API_KEY: Optional[str] = None
    SENDGRID_WELCOME_TEMPLATE_ID: Optional[str] = None

    # Calendly
    CALENDLY_ACCESS_TOKEN: str

    # Crypto
    ENCRYPTION_KEY: Optional[str] = None

    # File Storage
    S3_BUCKET_NAME: str = "repruv-files"
    S3_REGION: str = "auto"
    S3_ENDPOINT_URL: Optional[str] = None
    S3_ACCESS_KEY_ID: Optional[str] = None
    S3_SECRET_ACCESS_KEY: Optional[str] = None

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
        return self.ENVIRONMENT == "production"

    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT == "development"

    @property
    def is_testing(self) -> bool:
        return self.ENVIRONMENT == "testing"

    @property
    def database_url_sync(self) -> str:
        """Synchronous database URL for Alembic."""
        return self.DATABASE_URL.replace("+asyncpg", "")


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


# Global settings instance
settings = get_settings()