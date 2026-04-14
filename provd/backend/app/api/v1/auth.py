from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from jose import jwt

from app.config import Settings
from app.dependencies import get_app_settings
from app.schemas.auth import TokenRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/token", response_model=TokenResponse, summary="Issue bearer token")
def issue_token(payload: TokenRequest, settings: Settings = Depends(get_app_settings)) -> TokenResponse:
	if payload.client_id != settings.dev_client_id or payload.client_secret != settings.dev_client_secret:
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED,
			detail="Invalid client credentials",
		)

	expires_delta = timedelta(minutes=settings.access_token_expire_minutes)
	expires_at = datetime.now(timezone.utc) + expires_delta
	token = jwt.encode(
		{
			"sub": payload.client_id,
			"exp": int(expires_at.timestamp()),
		},
		settings.secret_key,
		algorithm="HS256",
	)

	return TokenResponse(
		access_token=token,
		expires_in=int(expires_delta.total_seconds()),
	)
