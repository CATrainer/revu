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
    FRONTEND_URL: str = "http://localhost:3000"
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
    DATABASE_ECHO: bool = False

    # Redis - Only this one is from env
    REDIS_URL: str

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

    # OpenAI
    OPENAI_API_KEY: str
    OPENAI_MODEL: str = "gpt-4-turbo-preview"
    OPENAI_MAX_TOKENS: int = 500
    OPENAI_TEMPERATURE: float = 0.7

    # Claude (optional)
    CLAUDE_API_KEY: Optional[str] = None
    CLAUDE_MODEL: Optional[str] = "claude-3-opus-20240229"

    # Email
    RESEND_API_KEY: str
    EMAIL_FROM_ADDRESS: EmailStr
    EMAIL_FROM_NAME: str = "Repruv"

    # Calendly
    CALENDLY_ACCESS_TOKEN: str

    # Optional services
    YOUTUBE_API_KEY: Optional[str] = None
    STRIPE_SECRET_KEY: Optional[str] = None
    STRIPE_WEBHOOK_SECRET: Optional[str] = None
    SENTRY_DSN: Optional[str] = None

    # File Storage
    S3_BUCKET_NAME: str = "repruv-files"
    S3_REGION: str = "auto"
    S3_ENDPOINT_URL: Optional[str] = None
    S3_ACCESS_KEY_ID: Optional[str] = None
    S3_SECRET_ACCESS_KEY: Optional[str] = None

    # Feature Flags
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
    def database_url_sync(self) -> str:
        """Synchronous database URL for Alembic."""
        return self.DATABASE_URL.replace("+asyncpg", "")


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


# Global settings instance
settings = get_settings()

# Debug output when module loads (remove in production)
if os.environ.get("DEBUG_CONFIG"):
    print(f"REDIS_URL: {settings.REDIS_URL}")
    print(f"CELERY_BROKER_URL: {settings.CELERY_BROKER_URL}")
    print(f"CELERY_RESULT_BACKEND: {settings.CELERY_RESULT_BACKEND}")
    print(f"REDIS_CACHE_URL: {settings.REDIS_CACHE_URL}")