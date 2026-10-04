from datetime import datetime, timedelta, timezone
from hmac import compare_digest

from fastapi import APIRouter, Depends, HTTPException, Request, status
from jose import jwt

from app.config import Settings
from app.dependencies import get_app_settings
from app.schemas.auth import TokenRequest, TokenResponse
from app.services.rate_limit import auth_limit, check_login_lockout, client_ip, record_login_failure

router = APIRouter(prefix="/auth", tags=["auth"], dependencies=[Depends(auth_limit)])


def resolve_client_credentials(payload: TokenRequest, settings: Settings) -> tuple[str, list[str]] | None:
	if (
		settings.bootstrap_admin_client_id
		and settings.bootstrap_admin_client_secret
		and compare_digest(payload.client_id, settings.bootstrap_admin_client_id)
		and compare_digest(payload.client_secret, settings.bootstrap_admin_client_secret)
	):
		return settings.bootstrap_admin_role, settings.bootstrap_admin_scopes

	if (
		settings.bootstrap_client_client_id
		and settings.bootstrap_client_client_secret
		and compare_digest(payload.client_id, settings.bootstrap_client_client_id)
		and compare_digest(payload.client_secret, settings.bootstrap_client_client_secret)
	):
		return settings.bootstrap_client_role, settings.bootstrap_client_scopes

	if not settings.enable_test_auth:
		return None

	if (
		settings.dev_client_id
		and settings.dev_client_secret
		and compare_digest(payload.client_id, settings.dev_client_id)
		and compare_digest(payload.client_secret, settings.dev_client_secret)
	):
		return settings.dev_client_role, settings.dev_client_scopes

	return None


@router.post("/token", response_model=TokenResponse, summary="Issue bearer token")
async def issue_token(request: Request, payload: TokenRequest, settings: Settings = Depends(get_app_settings)) -> TokenResponse:
	ip = client_ip(request)
	await check_login_lockout(payload.client_id, ip)
	matched_principal = resolve_client_credentials(payload, settings)
	if matched_principal is None:
		await record_login_failure(payload.client_id, ip)
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED,
			detail="Invalid client credentials",
		)

	role, scopes = matched_principal
	expires_delta = timedelta(minutes=settings.access_token_expire_minutes)
	expires_at = datetime.now(timezone.utc) + expires_delta
	token = jwt.encode(
		{
			"sub": payload.client_id,
			"iss": settings.jwt_issuer,
			"aud": settings.jwt_audience,
			"iat": int(datetime.now(timezone.utc).timestamp()),
			"exp": int(expires_at.timestamp()),
			"role": role,
			"scopes": scopes,
		},
		settings.secret_key,
		algorithm=settings.jwt_algorithm,
	)

	return TokenResponse(
		access_token=token,
		expires_in=int(expires_delta.total_seconds()),
		scopes=scopes,
		role=role,
	)
