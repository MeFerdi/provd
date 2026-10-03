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
    api_v1_prefix: str = "/v1"

    secret_key: str = Field(default="", validation_alias=AliasChoices("SECRET_KEY", "JWT_SECRET_KEY"))
    jwt_algorithm: str = Field(default="HS256", validation_alias=AliasChoices("JWT_ALGORITHM"))
    access_token_expire_minutes: int = Field(default=60, validation_alias=AliasChoices("JWT_EXPIRE_MINUTES"))
    enable_test_auth: bool = Field(default=False, validation_alias=AliasChoices("ENABLE_TEST_AUTH"))

    database_url: str = Field(default="postgresql+asyncpg://provd:provd@postgres:5432/provd")
    redis_url: str = Field(default="redis://redis:6379/0")

    dev_client_id: str = Field(default="", validation_alias=AliasChoices("DEV_CLIENT_ID"))
    dev_client_secret: str = Field(default="", validation_alias=AliasChoices("DEV_CLIENT_SECRET"))
    dev_client_role: str = Field(default="service")
    dev_client_scopes: list[str] = Field(default_factory=lambda: ["actions:evaluate"])
    bootstrap_admin_client_id: str = Field(default="", validation_alias=AliasChoices("BOOTSTRAP_ADMIN_CLIENT_ID"))
    bootstrap_admin_client_secret: str = Field(default="", validation_alias=AliasChoices("BOOTSTRAP_ADMIN_CLIENT_SECRET"))
    bootstrap_admin_role: str = Field(default="admin", validation_alias=AliasChoices("BOOTSTRAP_ADMIN_ROLE"))
    bootstrap_admin_scopes_raw: str = Field(
        default="keys:read,keys:write,actions:evaluate,billing:admin",
        validation_alias=AliasChoices("BOOTSTRAP_ADMIN_SCOPES"),
    )
    bootstrap_client_client_id: str = Field(default="", validation_alias=AliasChoices("BOOTSTRAP_CLIENT_CLIENT_ID"))
    bootstrap_client_client_secret: str = Field(default="", validation_alias=AliasChoices("BOOTSTRAP_CLIENT_CLIENT_SECRET"))
    bootstrap_client_role: str = Field(default="client", validation_alias=AliasChoices("BOOTSTRAP_CLIENT_ROLE"))
    bootstrap_client_scopes_raw: str = Field(
        default="actions:evaluate",
        validation_alias=AliasChoices("BOOTSTRAP_CLIENT_SCOPES"),
    )

    sentry_dsn: str = Field(default="", validation_alias=AliasChoices("SENTRY_DSN"))

    ml_inference_enabled: bool = Field(default=False, validation_alias=AliasChoices("ML_INFERENCE_ENABLED"))
    ml_service_url: str = Field(default="http://127.0.0.1:8085", validation_alias=AliasChoices("ML_SERVICE_URL", "ML_INFERENCE_URL"))
    ml_inference_timeout_seconds: float = Field(default=2.0, validation_alias=AliasChoices("ML_INFERENCE_TIMEOUT_SECONDS"))

    cors_origins: list[str] = Field(default_factory=lambda: ["*"])

    rate_limit_backend: str = Field(default="memory", validation_alias=AliasChoices("RATE_LIMIT_BACKEND"))
    trust_proxy_headers: bool = Field(default=False, validation_alias=AliasChoices("TRUST_PROXY_HEADERS"))

    scanner_rate_limit_per_minute: int = Field(default=20, validation_alias=AliasChoices("SCANNER_RATE_LIMIT_PER_MINUTE"))

    # Tron access (TronGrid). The API key is optional; without one TronGrid rate-limits hard.
    trongrid_url: str = Field(default="https://api.trongrid.io", validation_alias=AliasChoices("TRONGRID_URL"))
    trongrid_api_key: str = Field(default="", validation_alias=AliasChoices("TRONGRID_API_KEY"))
    usdt_trc20_contract: str = Field(default="TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t", validation_alias=AliasChoices("USDT_TRC20_CONTRACT"))
    http_timeout_seconds: float = Field(default=10.0, validation_alias=AliasChoices("HTTP_TIMEOUT_SECONDS"))
    history_cache_seconds: int = Field(default=600, validation_alias=AliasChoices("HISTORY_CACHE_SECONDS"))

    # Token safety (GoPlus). Optional; on outage or missing key the signal degrades with a coverage flag.
    goplus_url: str = Field(default="https://api.gopluslabs.io", validation_alias=AliasChoices("GOPLUS_URL"))
    goplus_api_key: str = Field(default="", validation_alias=AliasChoices("GOPLUS_API_KEY"))

    # Pay-as-you-go
    free_daily_checks: int = Field(default=100, validation_alias=AliasChoices("FREE_DAILY_CHECKS"))
    usdt_deposit_address: str = Field(default="", validation_alias=AliasChoices("USDT_DEPOSIT_ADDRESS"))
    mpesa_paybill: str = Field(default="", validation_alias=AliasChoices("MPESA_PAYBILL"))
    public_site_url: str = Field(default="https://provd.tech", validation_alias=AliasChoices("PUBLIC_SITE_URL"))

    indexer_interval_seconds: int = Field(default=60, validation_alias=AliasChoices("INDEXER_INTERVAL_SECONDS"))

    # Proof layer. The signing key is a 32-byte secp256k1 private key in hex; required outside development.
    decision_signing_key: str = Field(default="", validation_alias=AliasChoices("DECISION_SIGNING_KEY"))
    anchor_method: str = Field(default="opentimestamps", validation_alias=AliasChoices("ANCHOR_METHOD"))  # opentimestamps | none
    ots_calendars: str = Field(
        default="https://a.pool.opentimestamps.org,https://b.pool.opentimestamps.org,https://a.pool.eternitywall.com",
        validation_alias=AliasChoices("OTS_CALENDARS"),
    )
    batch_interval_seconds: int = Field(default=300, validation_alias=AliasChoices("BATCH_INTERVAL_SECONDS"))
    batch_max_decisions: int = Field(default=10000, validation_alias=AliasChoices("BATCH_MAX_DECISIONS"))

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
            if len(self.decision_signing_key) != 64:
                raise ValueError("DECISION_SIGNING_KEY (32-byte hex) must be set outside non-production environments")
            if not self.bootstrap_admin_client_id or not self.bootstrap_admin_client_secret:
                raise ValueError("Bootstrap admin credentials must be configured outside non-production environments")
            if not self.bootstrap_client_client_id or not self.bootstrap_client_client_secret:
                raise ValueError("Bootstrap client credentials must be configured outside non-production environments")

        return self


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
