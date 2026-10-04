import re
from uuid import uuid4

from fastapi import Depends, Header, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings, get_settings
from app.db.postgres import get_postgres_session
from app.models.api_key import ApiKey
from app.schemas.auth import AuthContext
from app.services.hasher import sha256_hex
from app.services.rate_limit import client_ip, enforce, guard_bad_credentials, record_bad_credentials

_bearer_scheme = HTTPBearer(auto_error=False)
# Keys are issued as secrets.token_urlsafe(32) (43 characters); anything else is rejected without a lookup.
_API_KEY_SHAPE = re.compile(r"^[A-Za-z0-9_-]{20,128}$")


def get_app_settings() -> Settings:
	return get_settings()


def get_request_id(x_request_id: str | None = Header(default=None)) -> str:
	return x_request_id or str(uuid4())


async def get_db_session(db: AsyncSession = Depends(get_postgres_session)) -> AsyncSession:
	return db


def _scope_match(required: str, granted: list[str]) -> bool:
	if "*" in granted or required in granted:
		return True
	if ":" in required:
		prefix = required.split(":", maxsplit=1)[0]
		if f"{prefix}:*" in granted:
			return True
	return False


async def _reject(ip: str, detail: str) -> HTTPException:
	await record_bad_credentials(ip)
	return HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail, headers={"WWW-Authenticate": "Bearer"})


async def get_auth_context(
	request: Request,
	credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
	x_api_key: str | None = Header(default=None, alias="X-API-Key"),
	settings: Settings = Depends(get_app_settings),
	db: AsyncSession = Depends(get_db_session),
) -> AuthContext:
	ip = client_ip(request)
	if credentials is not None or (x_api_key is not None and x_api_key.strip()):
		await guard_bad_credentials(ip)

	if credentials is not None:
		if credentials.scheme.lower() != "bearer" or len(credentials.credentials) > 4096:
			raise await _reject(ip, "Invalid bearer token")

		try:
			payload = jwt.decode(
				credentials.credentials,
				settings.secret_key,
				algorithms=[settings.jwt_algorithm],
				audience=settings.jwt_audience,
				issuer=settings.jwt_issuer,
				# python-jose skips the audience/issuer check when the claim is absent unless required.
				options={"require_exp": True, "require_iat": True, "require_sub": True, "require_aud": True, "require_iss": True},
			)
		except JWTError as exc:
			raise await _reject(ip, "Invalid bearer token") from exc

		raw_scopes = payload.get("scopes", [])
		if raw_scopes is None:
			scopes: list[str] = []
		elif isinstance(raw_scopes, str):
			scopes = [raw_scopes]
		elif isinstance(raw_scopes, list):
			scopes = [str(scope) for scope in raw_scopes]
		else:
			raise await _reject(ip, "Invalid bearer token")

		await enforce(f"sub:{payload.get('sub')}", settings.api_key_rate_limit_per_minute, 60)
		return AuthContext(
			principal_id=str(payload.get("sub", "unknown")),
			auth_type="bearer",
			scopes=scopes,
			role=str(payload.get("role", "user")),
		)

	if x_api_key is not None and x_api_key.strip():
		raw = x_api_key.strip()
		if not _API_KEY_SHAPE.match(raw):
			raise await _reject(ip, "Invalid API key")
		result = await db.execute(select(ApiKey).where(ApiKey.key_hash == sha256_hex(raw), ApiKey.active.is_(True)))
		api_key = result.scalar_one_or_none()
		if api_key is None:
			raise await _reject(ip, "Invalid API key")
		environment = getattr(api_key, "environment", None) or "live"
		if environment == "live" and request.headers.get("origin"):
			# Browsers always send Origin on cross-site calls; servers don't. A live key in a web page can be
			# copied by anyone who opens it, so live keys only work server-to-server. Use a sandbox key in the browser.
			raise HTTPException(
				status_code=status.HTTP_403_FORBIDDEN,
				detail="Live API keys can't be used from a browser. Call Provd from your server, or use a sandbox key in the playground.",
			)
		limit = settings.sandbox_rate_limit_per_minute if environment == "sandbox" else settings.api_key_rate_limit_per_minute
		await enforce(f"key:{api_key.id}", limit, 60)

		return AuthContext(
			principal_id=api_key.id,
			auth_type="api_key",
			scopes=api_key.scopes or [],
			role="service",
			client_id=api_key.client_id,
			environment=environment,
		)

	raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required", headers={"WWW-Authenticate": "Bearer"})


def require_permissions(required_scopes: list[str], allowed_roles: list[str] | None = None):
	async def _checker(ctx: AuthContext = Depends(get_auth_context)) -> AuthContext:
		if allowed_roles and ctx.role in allowed_roles:
			return ctx

		missing = [scope for scope in required_scopes if not _scope_match(scope, ctx.scopes)]
		if missing:
			raise HTTPException(
				status_code=status.HTTP_403_FORBIDDEN,
				detail=f"Missing required scopes: {', '.join(missing)}",
			)
		return ctx

	return _checker


def account_id(ctx: AuthContext) -> str:
	"""The account a request acts for. Sandbox keys act for a separate sandbox account, so test decisions,
	outcomes and attestations never mix with live ones."""
	from app.services import sandbox

	base = ctx.client_id or ctx.principal_id
	return sandbox.account_id(base) if ctx.environment == "sandbox" else base
