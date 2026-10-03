from functools import lru_cache
from pathlib import Path

from pydantic import AliasChoices, Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # backend/.env, found regardless of the directory the process starts in.
    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[1] / ".env", env_file_encoding="utf-8", extra="ignore"
    )

    app_env: str = Field(default="development", validation_alias=AliasChoices("APP_ENV", "ENVIRONMENT"))

    app_name: str = "Provd API"
    app_version: str = "0.1.0"
    api_v1_prefix: str = "/api/v1"

    secret_key: str = Field(default="", validation_alias=AliasChoices("SECRET_KEY", "JWT_SECRET_KEY"))
    jwt_algorithm: str = Field(default="HS256", validation_alias=AliasChoices("JWT_ALGORITHM"))
    access_token_expire_minutes: int = Field(default=60, validation_alias=AliasChoices("JWT_EXPIRE_MINUTES"))
    enable_test_auth: bool = Field(default=False, validation_alias=AliasChoices("ENABLE_TEST_AUTH"))

    database_url: str = Field(default="postgresql+asyncpg://provd:provd@postgres:5432/provd")
    redis_url: str = Field(default="redis://redis:6379/0")

    dev_client_id: str = Field(default="", validation_alias=AliasChoices("DEV_CLIENT_ID"))
    dev_client_secret: str = Field(default="", validation_alias=AliasChoices("DEV_CLIENT_SECRET"))
    dev_client_role: str = Field(default="service")
    dev_client_scopes: list[str] = Field(default_factory=lambda: ["ratings:read"])
    bootstrap_admin_client_id: str = Field(default="", validation_alias=AliasChoices("BOOTSTRAP_ADMIN_CLIENT_ID"))
    bootstrap_admin_client_secret: str = Field(default="", validation_alias=AliasChoices("BOOTSTRAP_ADMIN_CLIENT_SECRET"))
    bootstrap_admin_role: str = Field(default="admin", validation_alias=AliasChoices("BOOTSTRAP_ADMIN_ROLE"))
    bootstrap_admin_scopes_raw: str = Field(
        default="keys:read,keys:write,ratings:read,alerts:manage",
        validation_alias=AliasChoices("BOOTSTRAP_ADMIN_SCOPES"),
    )
    bootstrap_client_client_id: str = Field(default="", validation_alias=AliasChoices("BOOTSTRAP_CLIENT_CLIENT_ID"))
    bootstrap_client_client_secret: str = Field(default="", validation_alias=AliasChoices("BOOTSTRAP_CLIENT_CLIENT_SECRET"))
    bootstrap_client_role: str = Field(default="client", validation_alias=AliasChoices("BOOTSTRAP_CLIENT_ROLE"))
    bootstrap_client_scopes_raw: str = Field(
        default="ratings:read",
        validation_alias=AliasChoices("BOOTSTRAP_CLIENT_SCOPES"),
    )

    sentry_dsn: str = Field(default="", validation_alias=AliasChoices("SENTRY_DSN"))

    ml_inference_enabled: bool = Field(default=False, validation_alias=AliasChoices("ML_INFERENCE_ENABLED"))
    ml_service_url: str = Field(default="http://127.0.0.1:8085", validation_alias=AliasChoices("ML_SERVICE_URL", "ML_INFERENCE_URL"))
    ml_inference_timeout_seconds: float = Field(default=2.0, validation_alias=AliasChoices("ML_INFERENCE_TIMEOUT_SECONDS"))

    cors_origins: list[str] = Field(default_factory=lambda: ["*"])

    rate_limit_backend: str = Field(default="memory", validation_alias=AliasChoices("RATE_LIMIT_BACKEND"))
    trust_proxy_headers: bool = Field(default=False, validation_alias=AliasChoices("TRUST_PROXY_HEADERS"))

    scan_rate_limit_per_minute: int = Field(default=10, validation_alias=AliasChoices("SCAN_RATE_LIMIT_PER_MINUTE"))
    early_access_rate_limit_per_hour: int = Field(default=5, validation_alias=AliasChoices("EARLY_ACCESS_RATE_LIMIT_PER_HOUR"))

    # Comma-separated JSON-RPC URLs per chain, tried in order. No chain endpoint is hardcoded in code.
    ethereum_rpc_urls_raw: str = Field(
        default="https://ethereum-rpc.publicnode.com,https://eth.drpc.org,https://eth.merkle.io",
        validation_alias=AliasChoices("ETHEREUM_RPC_URLS"),
    )
    rpc_timeout_seconds: float = Field(default=20.0, validation_alias=AliasChoices("RPC_TIMEOUT_SECONDS"))
    monitor_interval_seconds: int = Field(default=900, validation_alias=AliasChoices("MONITOR_INTERVAL_SECONDS"))

    # Where change alerts go. Both optional; with neither set, alerts are only logged and stored.
    alert_webhook_url: str = Field(default="", validation_alias=AliasChoices("ALERT_WEBHOOK_URL"))
    telegram_bot_token: str = Field(default="", validation_alias=AliasChoices("TELEGRAM_BOT_TOKEN"))
    telegram_alert_chat_id: str = Field(default="", validation_alias=AliasChoices("TELEGRAM_ALERT_CHAT_ID"))
    public_site_url: str = Field(default="https://provd.tech", validation_alias=AliasChoices("PUBLIC_SITE_URL"))

    @property
    def ethereum_rpc_urls(self) -> list[str]:
        return [url.strip() for url in self.ethereum_rpc_urls_raw.split(",") if url.strip()]

    @property
    def bootstrap_admin_scopes(self) -> list[str]:
        return [scope.strip() for scope in self.bootstrap_admin_scopes_raw.split(",") if scope.strip()]

    @property
    def bootstrap_client_scopes(self) -> list[str]:
        return [scope.strip() for scope in self.bootstrap_client_scopes_raw.split(",") if scope.strip()]

    @property
    def is_non_production(self) -> bool:
        return self.app_env.lower() in {"dev", "development", "local", "test", "testing"}

    @model_validator(mode="after")
    def validate_security_posture(self) -> "Settings":
        if not self.secret_key or len(self.secret_key) < 32:
            raise ValueError("JWT secret key must be configured with at least 32 characters")

        if self.enable_test_auth:
            if not self.is_non_production:
                raise ValueError("ENABLE_TEST_AUTH may only be enabled in non-production environments")
            if not self.dev_client_id or not self.dev_client_secret:
                raise ValueError("DEV_CLIENT_ID and DEV_CLIENT_SECRET must be set when ENABLE_TEST_AUTH=true")

        if not self.is_non_production:
            if not self.bootstrap_admin_client_id or not self.bootstrap_admin_client_secret:
                raise ValueError("Bootstrap admin credentials must be configured outside non-production environments")
            if not self.bootstrap_client_client_id or not self.bootstrap_client_client_secret:
                raise ValueError("Bootstrap client credentials must be configured outside non-production environments")

        return self


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
