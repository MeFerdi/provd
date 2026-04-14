from datetime import datetime, timezone
from secrets import token_urlsafe
from uuid import uuid4

from fastapi import APIRouter, HTTPException, status

from app.schemas.client import ApiKeyCreateRequest, ApiKeyCreateResponse, ApiKeyResponse
from app.services.hasher import sha256_hex

router = APIRouter(prefix="/keys", tags=["keys"])

_KEY_STORE: dict[str, dict] = {}


@router.get("", response_model=list[ApiKeyResponse], summary="List API keys")
def list_api_keys() -> list[ApiKeyResponse]:
	return [ApiKeyResponse(**value) for value in _KEY_STORE.values()]


@router.post("", response_model=ApiKeyCreateResponse, status_code=status.HTTP_201_CREATED, summary="Create API key")
def create_api_key(payload: ApiKeyCreateRequest) -> ApiKeyCreateResponse:
	key_id = str(uuid4())
	raw_key = token_urlsafe(32)
	key_hash = sha256_hex(raw_key)
	created_at = datetime.now(timezone.utc)
	prefix = raw_key[:8]

	persisted = {
		"id": key_id,
		"name": payload.name,
		"prefix": prefix,
		"scopes": payload.scopes,
		"created_at": created_at,
		"active": True,
		"key_hash": key_hash,
	}
	_KEY_STORE[key_id] = persisted

	return ApiKeyCreateResponse(
		id=key_id,
		name=payload.name,
		prefix=prefix,
		scopes=payload.scopes,
		created_at=created_at,
		active=True,
		api_key=raw_key,
	)


@router.delete("/{key_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Deactivate API key")
def deactivate_api_key(key_id: str) -> None:
	record = _KEY_STORE.get(key_id)
	if not record:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="API key not found")
	record["active"] = False
