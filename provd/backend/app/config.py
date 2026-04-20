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
    neo4j_uri: str = Field(default="bolt://neo4j:7687", validation_alias=AliasChoices("NEO4J_URI"))
    neo4j_user: str = Field(default="neo4j", validation_alias=AliasChoices("NEO4J_USER"))
    neo4j_password: str = Field(default="", validation_alias=AliasChoices("NEO4J_PASSWORD"))
    redis_url: str = Field(default="redis://redis:6379/0")

    dev_client_id: str = Field(default="provd-dev-client")
    dev_client_secret: str = Field(default="provd-dev-secret")
    dev_client_role: str = Field(default="service")
    dev_client_scopes: list[str] = Field(default_factory=lambda: ["trust:read"])

    celery_broker_url: str = Field(default="redis://redis:6379/0", validation_alias=AliasChoices("CELERY_BROKER_URL"))
    celery_result_backend: str = Field(default="redis://redis:6379/1", validation_alias=AliasChoices("CELERY_RESULT_BACKEND"))
    celery_score_refresh_interval_seconds: int = Field(default=900, validation_alias=AliasChoices("CELERY_SCORE_REFRESH_INTERVAL_SECONDS"))
    celery_community_scrape_interval_seconds: int = Field(default=1800, validation_alias=AliasChoices("CELERY_COMMUNITY_SCRAPE_INTERVAL_SECONDS"))
    celery_task_max_retries: int = Field(default=3, validation_alias=AliasChoices("CELERY_TASK_MAX_RETRIES"))
    celery_task_retry_backoff: int = Field(default=2, validation_alias=AliasChoices("CELERY_TASK_RETRY_BACKOFF"))
    celery_task_time_limit_seconds: int = Field(default=120, validation_alias=AliasChoices("CELERY_TASK_TIME_LIMIT_SECONDS"))
    celery_task_soft_time_limit_seconds: int = Field(default=90, validation_alias=AliasChoices("CELERY_TASK_SOFT_TIME_LIMIT_SECONDS"))
    community_scrape_seed_urls: str = Field(default="", validation_alias=AliasChoices("COMMUNITY_SCRAPE_SEED_URLS"))
    sentry_dsn: str = Field(default="", validation_alias=AliasChoices("SENTRY_DSN"))

    ml_inference_enabled: bool = Field(default=False, validation_alias=AliasChoices("ML_INFERENCE_ENABLED"))
    ml_service_url: str = Field(default="http://127.0.0.1:8085", validation_alias=AliasChoices("ML_SERVICE_URL", "ML_INFERENCE_URL"))
    ml_inference_timeout_seconds: float = Field(default=2.0, validation_alias=AliasChoices("ML_INFERENCE_TIMEOUT_SECONDS"))

    cors_origins: list[str] = Field(default_factory=lambda: ["*"])


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
