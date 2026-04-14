from functools import lru_cache

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_env: str = Field(default="development", validation_alias=AliasChoices("APP_ENV", "ENVIRONMENT"))

    app_name: str = "Provd API"
    app_version: str = "0.1.0"
    api_v1_prefix: str = "/api/v1"

    secret_key: str = Field(default="change-me", validation_alias=AliasChoices("SECRET_KEY", "JWT_SECRET_KEY"))
    jwt_algorithm: str = Field(default="HS256", validation_alias=AliasChoices("JWT_ALGORITHM"))
    access_token_expire_minutes: int = Field(default=60, validation_alias=AliasChoices("JWT_EXPIRE_MINUTES"))

    database_url: str = Field(default="postgresql+asyncpg://provd:provd@postgres:5432/provd")
    redis_url: str = Field(default="redis://redis:6379/0")

    dev_client_id: str = Field(default="provd-dev-client")
    dev_client_secret: str = Field(default="provd-dev-secret")
    dev_client_role: str = Field(default="service")
    dev_client_scopes: list[str] = Field(default_factory=lambda: ["trust:read"])

    celery_broker_url: str = Field(default="redis://redis:6379/0")
    celery_result_backend: str = Field(default="redis://redis:6379/1")

    cors_origins: list[str] = Field(default_factory=lambda: ["*"])


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
