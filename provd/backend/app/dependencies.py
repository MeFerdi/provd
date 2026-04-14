from uuid import uuid4

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings, get_settings
from app.db.postgres import get_postgres_session
from app.models.api_key import ApiKey
from app.schemas.auth import AuthContext
from app.services.hasher import sha256_hex

_bearer_scheme = HTTPBearer(auto_error=False)


def get_app_settings() -> Settings:
	return get_settings()


def get_request_id(x_request_id: str | None = Header(default=None)) -> str:
	return x_request_id or str(uuid4())


def _scope_match(required: str, granted: list[str]) -> bool:
	if "*" in granted or required in granted:
		return True
	if ":" in required:
		prefix = required.split(":", maxsplit=1)[0]
		if f"{prefix}:*" in granted:
			return True
	return False


async def get_auth_context(
	credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
	x_api_key: str | None = Header(default=None, alias="X-API-Key"),
	settings: Settings = Depends(get_app_settings),
	db: AsyncSession = Depends(get_postgres_session),
) -> AuthContext:
	if credentials is not None:
		if credentials.scheme.lower() != "bearer":
			raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unsupported auth scheme")

		try:
			payload = jwt.decode(credentials.credentials, settings.secret_key, algorithms=[settings.jwt_algorithm])
		except JWTError as exc:
			raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid bearer token") from exc

		raw_scopes = payload.get("scopes", [])
		if raw_scopes is None:
			scopes: list[str] = []
		elif isinstance(raw_scopes, str):
			scopes = [raw_scopes]
		elif isinstance(raw_scopes, list):
			scopes = [str(scope) for scope in raw_scopes]
		else:
			raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid scopes claim in token")

		return AuthContext(
			principal_id=str(payload.get("sub", "unknown")),
			auth_type="bearer",
			scopes=scopes,
			role=str(payload.get("role", "user")),
		)

	if x_api_key is not None and x_api_key.strip():
		key_hash = sha256_hex(x_api_key.strip())
		result = await db.execute(select(ApiKey).where(ApiKey.key_hash == key_hash, ApiKey.active.is_(True)))
		api_key = result.scalar_one_or_none()
		if api_key is None:
			raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")

		return AuthContext(
			principal_id=api_key.id,
			auth_type="api_key",
			scopes=api_key.scopes or [],
			role="service",
		)

	raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")


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
