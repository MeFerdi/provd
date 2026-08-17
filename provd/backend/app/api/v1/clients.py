from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db_session, require_permissions
from app.models.client import Client
from app.schemas.auth import AuthContext
from app.schemas.client import ClientCreateRequest, ClientResponse

router = APIRouter(prefix="/clients", tags=["clients"])


def _to_response(client: Client) -> ClientResponse:
	return ClientResponse(
		id=client.id,
		name=client.name,
		active=client.active,
		created_at=client.created_at,
		updated_at=client.updated_at,
	)


@router.get("", response_model=list[ClientResponse], summary="List all clients")
async def list_clients(
	db: AsyncSession = Depends(get_db_session),
	_: AuthContext = Depends(require_permissions(["keys:read"], allowed_roles=["admin"])),
) -> list[ClientResponse]:
	result = await db.execute(select(Client).order_by(Client.created_at.desc()))
	return [_to_response(c) for c in result.scalars().all()]


@router.post("", response_model=ClientResponse, status_code=status.HTTP_201_CREATED, summary="Register a new client")
async def create_client(
	payload: ClientCreateRequest,
	db: AsyncSession = Depends(get_db_session),
	_: AuthContext = Depends(require_permissions(["keys:write"], allowed_roles=["admin"])),
) -> ClientResponse:
	existing = await db.execute(select(Client).where(Client.name == payload.name))
	if existing.scalar_one_or_none() is not None:
		raise HTTPException(
			status_code=status.HTTP_409_CONFLICT,
			detail=f"A client named '{payload.name}' already exists",
		)
	client = Client(id=str(uuid4()), name=payload.name, active=True)
	db.add(client)
	await db.commit()
	await db.refresh(client)
	return _to_response(client)


@router.get("/{client_id}", response_model=ClientResponse, summary="Get client by ID")
async def get_client(
	client_id: str,
	db: AsyncSession = Depends(get_db_session),
	_: AuthContext = Depends(require_permissions(["keys:read"], allowed_roles=["admin"])),
) -> ClientResponse:
	result = await db.execute(select(Client).where(Client.id == client_id))
	client = result.scalar_one_or_none()
	if client is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
	return _to_response(client)


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Deactivate a client")
async def deactivate_client(
	client_id: str,
	db: AsyncSession = Depends(get_db_session),
	_: AuthContext = Depends(require_permissions(["keys:write"], allowed_roles=["admin"])),
) -> None:
	result = await db.execute(select(Client).where(Client.id == client_id))
	client = result.scalar_one_or_none()
	if client is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
	client.active = False
	await db.commit()
