import time
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.chains.evm import RpcError
from app.config import get_settings
from app.dependencies import get_db_session
from app.models.posture import EarlyAccessRequest as EarlyAccessRow
from app.posture.layerzero import NotAnOApp
from app.schemas.posture import (
	EarlyAccessCreated,
	EarlyAccessRequest,
	Posture,
	ProtocolDetail,
	ProtocolList,
	ScanRequest,
)
from app.services import posture as service
from app.services.rate_limit import rate_limit

router = APIRouter(tags=["ratings"])

_SCAN_TTL_SECONDS = 600
_scan_cache: dict[tuple[str, str], tuple[float, Posture]] = {}


@router.get("/protocols", response_model=ProtocolList, summary="Public security-posture ratings")
async def list_protocols(db: AsyncSession = Depends(get_db_session)) -> ProtocolList:
	items = await service.list_protocols(db)
	return ProtocolList(generated_at=max((i.checked_at for i in items), default=datetime.now(timezone.utc)), items=items)


@router.get("/protocols/{slug}", response_model=ProtocolDetail, summary="Rating, findings, routes and change history for one protocol")
async def get_protocol(slug: str, db: AsyncSession = Depends(get_db_session)) -> ProtocolDetail:
	detail = await service.protocol_detail(db, slug)
	if detail is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Protocol not found")
	return detail


@router.post(
	"/scan",
	response_model=Posture,
	summary="Read and rate any LayerZero V2 OApp on Ethereum",
	dependencies=[Depends(rate_limit("scan", lambda: get_settings().scan_rate_limit_per_minute, 60))],
)
async def scan(payload: ScanRequest) -> Posture:
	key = (payload.chain, payload.address.lower())
	cached = _scan_cache.get(key)
	if cached and time.monotonic() - cached[0] < _SCAN_TTL_SECONDS:
		return cached[1]
	try:
		posture = await service.scan_contract(service.evm_client(payload.chain), payload.address, payload.chain)
	except NotAnOApp as exc:
		raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
	except RpcError as exc:
		raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Couldn't reach the chain right now. Try again shortly.") from exc
	if len(_scan_cache) > 1000:
		_scan_cache.clear()
	_scan_cache[key] = (time.monotonic(), posture)
	return posture


@router.post(
	"/early-access",
	response_model=EarlyAccessCreated,
	status_code=status.HTTP_201_CREATED,
	summary="Request early access to monitoring and alerts",
	dependencies=[Depends(rate_limit("early-access", lambda: get_settings().early_access_rate_limit_per_hour, 3600))],
)
async def early_access(payload: EarlyAccessRequest, db: AsyncSession = Depends(get_db_session)) -> EarlyAccessCreated:
	db.add(
		EarlyAccessRow(
			id=str(uuid4()),
			email=payload.email.lower(),
			organization=payload.organization,
			role=payload.role,
			message=payload.message,
		)
	)
	await db.commit()
	return EarlyAccessCreated()

