from functools import lru_cache
from pathlib import Path

from pydantic import AliasChoices, Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.secret_store import SECRETS, load_secret_files, looks_like_placeholder

class Settings(BaseSettings):
    # Secrets are declared in app/secret_store.py and come from the environment, NAME_FILE files or, in
    # development only, backend/.env (found regardless of the directory the process starts in). No secret has
    # a default value here.
    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[1] / ".env", env_file_encoding="utf-8", extra="ignore"
    )

    app_env: str = Field(default="development", validation_alias=AliasChoices("APP_ENV", "ENVIRONMENT"))

    app_name: str = "Provd API"
    app_version: str = "0.1.0"
    api_v1_prefix: str = "/v1"

    secret_key: str = Field(default="", validation_alias=AliasChoices("SECRET_KEY", "JWT_SECRET_KEY"))
    jwt_algorithm: str = Field(default="HS256", validation_alias=AliasChoices("JWT_ALGORITHM"))
    jwt_issuer: str = Field(default="provd-api", validation_alias=AliasChoices("JWT_ISSUER"))
    jwt_audience: str = Field(default="provd-api", validation_alias=AliasChoices("JWT_AUDIENCE"))
    access_token_expire_minutes: int = Field(default=60, validation_alias=AliasChoices("JWT_EXPIRE_MINUTES"))
    enable_test_auth: bool = Field(default=False, validation_alias=AliasChoices("ENABLE_TEST_AUTH"))

    # Credentials come from the environment; the default has none.
    database_url: str = Field(default="postgresql+asyncpg://localhost:5432/provd", validation_alias=AliasChoices("DATABASE_URL"))
    # Connection pool per process. Behind PgBouncer (transaction mode) set DB_PGBOUNCER=true: the app then
    # opens no pool of its own and disables asyncpg's prepared-statement cache.
    db_pool_size: int = Field(default=5, ge=1, le=50, validation_alias=AliasChoices("DB_POOL_SIZE"))
    db_max_overflow: int = Field(default=5, ge=0, le=50, validation_alias=AliasChoices("DB_MAX_OVERFLOW"))
    db_pool_recycle_seconds: int = Field(default=1800, validation_alias=AliasChoices("DB_POOL_RECYCLE_SECONDS"))
    db_pool_timeout_seconds: int = Field(default=10, validation_alias=AliasChoices("DB_POOL_TIMEOUT_SECONDS"))
    db_pgbouncer: bool = Field(default=False, validation_alias=AliasChoices("DB_PGBOUNCER"))
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

    # HTTP surface. Browsers only need the public endpoints (scanner, pricing, proof keys); API-key calls are
    # server-to-server, so CORS never sends credentials.
    cors_origins_raw: str = Field(
        default="http://localhost:3000,http://127.0.0.1:3000", validation_alias=AliasChoices("CORS_ORIGINS")
    )
    allowed_hosts_raw: str = Field(default="*", validation_alias=AliasChoices("ALLOWED_HOSTS"))
    expose_api_docs: bool | None = Field(default=None, validation_alias=AliasChoices("EXPOSE_API_DOCS"))
    max_request_body_bytes: int = Field(default=65_536, validation_alias=AliasChoices("MAX_REQUEST_BODY_BYTES"))
    log_format: str = Field(default="text", validation_alias=AliasChoices("LOG_FORMAT"))  # text | json

    # Rate limiting. "auto" = redis in production, memory elsewhere.
    rate_limit_backend: str = Field(default="auto", validation_alias=AliasChoices("RATE_LIMIT_BACKEND"))
    allow_in_memory_rate_limit: bool = Field(default=False, validation_alias=AliasChoices("ALLOW_IN_MEMORY_RATE_LIMIT"))
    # Worker processes per instance (gunicorn reads the same variable). In-memory counters are per process,
    # so they're only allowed with a single worker.
    web_concurrency: int = Field(default=1, ge=1, validation_alias=AliasChoices("WEB_CONCURRENCY"))
    # Client IP behind proxies: a header set by the edge (e.g. CF-Connecting-IP) or the Nth address from the
    # right of X-Forwarded-For (N = trusted proxy hops). Never trust the leftmost X-Forwarded-For value.
    trust_proxy_headers: bool = Field(default=False, validation_alias=AliasChoices("TRUST_PROXY_HEADERS"))
    client_ip_header: str = Field(default="", validation_alias=AliasChoices("CLIENT_IP_HEADER"))
    trusted_proxy_hops: int = Field(default=1, ge=1, le=5, validation_alias=AliasChoices("TRUSTED_PROXY_HOPS"))

    scanner_rate_limit_per_minute: int = Field(default=20, validation_alias=AliasChoices("SCANNER_RATE_LIMIT_PER_MINUTE"))
    public_rate_limit_per_minute: int = Field(default=120, validation_alias=AliasChoices("PUBLIC_RATE_LIMIT_PER_MINUTE"))
    api_key_rate_limit_per_minute: int = Field(default=600, validation_alias=AliasChoices("API_KEY_RATE_LIMIT_PER_MINUTE"))
    sandbox_rate_limit_per_minute: int = Field(default=60, validation_alias=AliasChoices("SANDBOX_RATE_LIMIT_PER_MINUTE"))
    # Self-serve sandbox keys from the website. Sandbox keys can't spend money or read live data, so signup needs
    # no review; these caps bound abuse (per visitor IP per hour, and across everyone per day).
    self_serve_signup_enabled: bool = Field(default=True, validation_alias=AliasChoices("SELF_SERVE_SIGNUP_ENABLED"))
    signup_per_ip_per_hour: int = Field(default=5, validation_alias=AliasChoices("SIGNUP_PER_IP_PER_HOUR"))
    signup_daily_cap: int = Field(default=200, validation_alias=AliasChoices("SIGNUP_DAILY_CAP"))
    auth_rate_limit_per_minute: int = Field(default=10, validation_alias=AliasChoices("AUTH_RATE_LIMIT_PER_MINUTE"))
    auth_lockout_failures: int = Field(default=5, validation_alias=AliasChoices("AUTH_LOCKOUT_FAILURES"))
    auth_lockout_minutes: int = Field(default=15, validation_alias=AliasChoices("AUTH_LOCKOUT_MINUTES"))
    invalid_credentials_per_minute: int = Field(default=20, validation_alias=AliasChoices("INVALID_CREDENTIALS_PER_MINUTE"))
    webhook_rate_limit_per_minute: int = Field(default=300, validation_alias=AliasChoices("WEBHOOK_RATE_LIMIT_PER_MINUTE"))
    global_rate_limit_per_minute: int = Field(default=3000, validation_alias=AliasChoices("GLOBAL_RATE_LIMIT_PER_MINUTE"))

    # Tron access (TronGrid). The API key is optional; without one TronGrid rate-limits hard.
    trongrid_url: str = Field(default="https://api.trongrid.io", validation_alias=AliasChoices("TRONGRID_URL"))
    trongrid_api_key: str = Field(default="", validation_alias=AliasChoices("TRONGRID_API_KEY"))
    usdt_trc20_contract: str = Field(default="TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t", validation_alias=AliasChoices("USDT_TRC20_CONTRACT"))
    http_timeout_seconds: float = Field(default=10.0, validation_alias=AliasChoices("HTTP_TIMEOUT_SECONDS"))
    history_cache_seconds: int = Field(default=600, validation_alias=AliasChoices("HISTORY_CACHE_SECONDS"))

    # Solana. Free public RPCs keep about a day of history (enough for lookalike detection); use a Helius or
    # Alchemy URL for full history. The index RPC serves getProgramAccounts (issuer-frozen accounts) for the worker.
    solana_rpc_url: str = Field(default="https://solana-rpc.publicnode.com", validation_alias=AliasChoices("SOLANA_RPC_URL"))
    solana_index_rpc_url: str = Field(default="https://api.mainnet-beta.solana.com", validation_alias=AliasChoices("SOLANA_INDEX_RPC_URL"))
    solana_history_window_limited: bool = Field(default=True, validation_alias=AliasChoices("SOLANA_HISTORY_WINDOW_LIMITED"))
    solana_max_transactions: int = Field(default=30, ge=5, le=200, validation_alias=AliasChoices("SOLANA_MAX_TRANSACTIONS"))

    # Token safety (GoPlus). Optional; on outage or missing key the signal degrades with a coverage flag.
    goplus_url: str = Field(default="https://api.gopluslabs.io", validation_alias=AliasChoices("GOPLUS_URL"))
    goplus_api_key: str = Field(default="", validation_alias=AliasChoices("GOPLUS_API_KEY"))

    # Pay-as-you-go
    free_monthly_checks: int = Field(default=300, validation_alias=AliasChoices("FREE_MONTHLY_CHECKS"))
    usdt_deposit_address: str = Field(default="", validation_alias=AliasChoices("USDT_DEPOSIT_ADDRESS"))
    mpesa_paybill: str = Field(default="", validation_alias=AliasChoices("MPESA_PAYBILL"))
    public_site_url: str = Field(default="https://provd.tech", validation_alias=AliasChoices("PUBLIC_SITE_URL"))
    # Card and M-Pesa top-ups (Paystack Checkout). Empty key = card off and M-Pesa falls back to the manual
    # paybill. PAYSTACK_CURRENCY applies to cards (KES, or USD once Paystack approves it); M-Pesa is always KES.
    paystack_secret_key: str = Field(default="", validation_alias=AliasChoices("PAYSTACK_SECRET_KEY"))
    paystack_url: str = Field(default="https://api.paystack.co", validation_alias=AliasChoices("PAYSTACK_URL"))
    paystack_currency: str = Field(default="KES", validation_alias=AliasChoices("PAYSTACK_CURRENCY"))
    # Optional allow-list of Paystack webhook source IPs (comma-separated). Signatures are always verified.
    paystack_webhook_ips_raw: str = Field(default="", validation_alias=AliasChoices("PAYSTACK_WEBHOOK_IPS"))


    indexer_interval_seconds: int = Field(default=60, validation_alias=AliasChoices("INDEXER_INTERVAL_SECONDS"))
    # Run the background worker inside the API process (hosts with no separate worker, e.g. Render free).
    run_worker_in_api: bool = Field(default=False, validation_alias=AliasChoices("RUN_WORKER_IN_API"))

    # Proof layer. The signing key is a 32-byte secp256k1 private key in hex; required outside development.
    decision_signing_key: str = Field(default="", validation_alias=AliasChoices("DECISION_SIGNING_KEY"))
    anchor_method: str = Field(default="opentimestamps", validation_alias=AliasChoices("ANCHOR_METHOD"))  # opentimestamps | none
    ots_calendars: str = Field(
        default="https://a.pool.opentimestamps.org,https://b.pool.opentimestamps.org,https://a.pool.eternitywall.com",
        validation_alias=AliasChoices("OTS_CALENDARS"),
    )
    # Release attestations (on-chain verifiable). A separate secp256k1 key from decision records, so the two
    # signature formats can never be confused. Required outside development.
    attestation_signing_key: str = Field(default="", validation_alias=AliasChoices("ATTESTATION_SIGNING_KEY"))
    attestation_max_ttl_seconds: int = Field(default=3600, ge=60, le=86400, validation_alias=AliasChoices("ATTESTATION_MAX_TTL_SECONDS"))
    attestation_max_decision_age_seconds: int = Field(default=86400, ge=60, validation_alias=AliasChoices("ATTESTATION_MAX_DECISION_AGE_SECONDS"))
    batch_interval_seconds: int = Field(default=300, validation_alias=AliasChoices("BATCH_INTERVAL_SECONDS"))
    batch_max_decisions: int = Field(default=10000, validation_alias=AliasChoices("BATCH_MAX_DECISIONS"))

    @property
    def bootstrap_admin_scopes(self) -> list[str]:
        return [scope.strip() for scope in self.bootstrap_admin_scopes_raw.split(",") if scope.strip()]

    @property
    def bootstrap_client_scopes(self) -> list[str]:
        return [scope.strip() for scope in self.bootstrap_client_scopes_raw.split(",") if scope.strip()]

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.cors_origins_raw.split(",") if o.strip()]

    @property
    def allowed_hosts(self) -> list[str]:
        return [h.strip() for h in self.allowed_hosts_raw.split(",") if h.strip()]

    @property
    def paystack_webhook_ips(self) -> set[str]:
        return {ip.strip() for ip in self.paystack_webhook_ips_raw.split(",") if ip.strip()}

    @property
    def api_docs_enabled(self) -> bool:
        return self.is_non_production if self.expose_api_docs is None else self.expose_api_docs

    @property
    def effective_rate_limit_backend(self) -> str:
        if self.rate_limit_backend == "auto":
            return "memory" if self.is_non_production else "redis"
        return self.rate_limit_backend

    @property
    def is_non_production(self) -> bool:
        return self.app_env.lower() in {"dev", "development", "local", "test", "testing"}

    @model_validator(mode="after")
    def validate_security_posture(self) -> "Settings":
        if not self.secret_key or len(self.secret_key) < 32:
            raise ValueError("JWT secret key must be configured with at least 32 characters")
        if self.jwt_algorithm not in {"HS256", "HS384", "HS512"}:
            raise ValueError("JWT_ALGORITHM must be HS256, HS384 or HS512")
        if self.rate_limit_backend not in {"auto", "memory", "redis"}:
            raise ValueError("RATE_LIMIT_BACKEND must be auto, memory or redis")

        if self.enable_test_auth:
            if not self.is_non_production:
                raise ValueError("ENABLE_TEST_AUTH may only be enabled in non-production environments")
            if not self.dev_client_id or not self.dev_client_secret:
                raise ValueError("DEV_CLIENT_ID and DEV_CLIENT_SECRET must be set when ENABLE_TEST_AUTH=true")

        if not self.is_non_production:
            if len(self.decision_signing_key) != 64:
                raise ValueError("DECISION_SIGNING_KEY (32-byte hex) must be set outside non-production environments")
            if len(self.attestation_signing_key) != 64 or self.attestation_signing_key == self.decision_signing_key:
                raise ValueError("ATTESTATION_SIGNING_KEY (32-byte hex, different from DECISION_SIGNING_KEY) must be set in production")
            if not self.bootstrap_admin_client_id or not self.bootstrap_admin_client_secret:
                raise ValueError("Bootstrap admin credentials must be configured outside non-production environments")
            if not self.bootstrap_client_client_id or not self.bootstrap_client_client_secret:
                raise ValueError("Bootstrap client credentials must be configured outside non-production environments")
            if not self.cors_origins or "*" in self.cors_origins:
                raise ValueError("CORS_ORIGINS must list explicit origins in production (no '*')")
            if not self.allowed_hosts or "*" in self.allowed_hosts:
                raise ValueError("ALLOWED_HOSTS must list explicit hostnames in production (no '*')")
            if self.effective_rate_limit_backend == "memory":
                if not self.allow_in_memory_rate_limit:
                    raise ValueError("Use RATE_LIMIT_BACKEND=redis in production (or ALLOW_IN_MEMORY_RATE_LIMIT=true for a single instance)")
                if self.web_concurrency > 1:
                    raise ValueError("In-memory rate limits are per process; with WEB_CONCURRENCY > 1 use RATE_LIMIT_BACKEND=redis")
            for name in ("bootstrap_admin_client_secret", "bootstrap_client_client_secret"):
                if len(getattr(self, name)) < 24:
                    raise ValueError(f"{name.upper()} must be at least 24 characters in production")
            if "database_url" not in self.model_fields_set:
                raise ValueError("DATABASE_URL must be set from the secret store in production")
            for secret in SECRETS:
                value = getattr(self, secret.name.lower(), "")
                if isinstance(value, str) and value and looks_like_placeholder(value):
                    raise ValueError(f"{secret.name} is an example or placeholder value; set a real one in the secret store")

        return self


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    load_secret_files()
    return Settings()
