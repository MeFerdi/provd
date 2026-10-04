from secrets import token_urlsafe
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db_session, require_permissions
from app.models.api_key import ApiKey
from app.models.client import Client
from app.schemas.auth import AuthContext
from app.schemas.client import ApiKeyCreateRequest, ApiKeyCreateResponse, ApiKeyResponse
from app.services.hasher import sha256_hex

router = APIRouter(prefix="/keys", tags=["keys"])


def _to_response(api_key: ApiKey) -> ApiKeyResponse:
	return ApiKeyResponse(
		id=api_key.id,
		name=api_key.name,
		prefix=api_key.prefix,
		scopes=api_key.scopes,
		created_at=api_key.created_at,
		active=api_key.active,
		environment=getattr(api_key, "environment", None) or "live",
	)


@router.get("", response_model=list[ApiKeyResponse], summary="List API keys")
async def list_api_keys(
	db: AsyncSession = Depends(get_db_session),
	_: AuthContext = Depends(require_permissions(["keys:read"], allowed_roles=["admin"])),
) -> list[ApiKeyResponse]:
	result = await db.execute(select(ApiKey).order_by(ApiKey.created_at.desc()))
	return [_to_response(api_key) for api_key in result.scalars().all()]


@router.post("", response_model=ApiKeyCreateResponse, status_code=status.HTTP_201_CREATED, summary="Create API key")
async def create_api_key(
	payload: ApiKeyCreateRequest,
	db: AsyncSession = Depends(get_db_session),
	_: AuthContext = Depends(require_permissions(["keys:write"], allowed_roles=["admin"])),
) -> ApiKeyCreateResponse:
	if payload.client_id and await db.get(Client, payload.client_id) is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
	key_id = str(uuid4())
	# Sandbox keys are recognisable at a glance (and by secret scanners); live keys stay opaque.
	raw_key = ("sbx_" if payload.environment == "sandbox" else "") + token_urlsafe(32)
	key_hash = sha256_hex(raw_key)
	prefix = raw_key[:8]

	api_key = ApiKey(
		id=key_id,
		name=payload.name,
		prefix=prefix,
		key_hash=key_hash,
		scopes=payload.scopes,
		client_id=payload.client_id,
		active=True,
		environment=payload.environment,
	)
	db.add(api_key)
	await db.commit()
	await db.refresh(api_key)

	return ApiKeyCreateResponse(
		id=api_key.id,
		name=payload.name,
		prefix=api_key.prefix,
		scopes=payload.scopes,
		created_at=api_key.created_at,
		active=True,
		environment=api_key.environment,
		api_key=raw_key,
	)


@router.delete("/{key_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Deactivate API key")
async def deactivate_api_key(
	key_id: str,
	db: AsyncSession = Depends(get_db_session),
	_: AuthContext = Depends(require_permissions(["keys:write"], allowed_roles=["admin"])),
) -> None:
	result = await db.execute(select(ApiKey).where(ApiKey.id == key_id))
	api_key = result.scalar_one_or_none()
	if not api_key:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="API key not found")
	api_key.active = False
	await db.commit()
