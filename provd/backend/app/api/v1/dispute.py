from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db_session, require_permissions
from app.models.dispute import Dispute
from app.schemas.auth import AuthContext
from app.schemas.dispute import DisputeRequest, DisputeResponse, DisputeRecord
from app.services.dispute_analysis import analyze_dispute

router = APIRouter(prefix="/dispute", tags=["dispute"])


@router.post(
	"/analyze",
	response_model=DisputeRecord,
	status_code=status.HTTP_201_CREATED,
	summary="Analyze dispute and persist result",
)
async def analyze_trade_dispute(
	payload: DisputeRequest,
	db: AsyncSession = Depends(get_db_session),
	_: AuthContext = Depends(require_permissions(["dispute:analyze"], allowed_roles=["admin"])),
) -> DisputeRecord:
	recommendation, confidence, rationale = analyze_dispute(payload)
	dispute = Dispute(
		id=str(uuid4()),
		trade_id=payload.trade_id,
		counterparty_id=payload.counterparty_id,
		amount=payload.amount,
		recommendation=recommendation,
		confidence=round(confidence, 4),
		rationale=rationale,
		raw_evidence=payload.evidence,
	)
	db.add(dispute)
	await db.commit()
	await db.refresh(dispute)
	return DisputeRecord(
		id=dispute.id,
		trade_id=dispute.trade_id,
		counterparty_id=dispute.counterparty_id,
		amount=dispute.amount,
		recommendation=dispute.recommendation,
		confidence=dispute.confidence,
		rationale=dispute.rationale,
		created_at=dispute.created_at,
	)


@router.get(
	"/{dispute_id}",
	response_model=DisputeRecord,
	summary="Retrieve a recorded dispute by ID",
)
async def get_dispute(
	dispute_id: str,
	db: AsyncSession = Depends(get_db_session),
	_: AuthContext = Depends(require_permissions(["dispute:analyze"], allowed_roles=["admin"])),
) -> DisputeRecord:
	result = await db.execute(select(Dispute).where(Dispute.id == dispute_id))
	dispute = result.scalar_one_or_none()
	if dispute is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dispute not found")
	return DisputeRecord(
		id=dispute.id,
		trade_id=dispute.trade_id,
		counterparty_id=dispute.counterparty_id,
		amount=dispute.amount,
		recommendation=dispute.recommendation,
		confidence=dispute.confidence,
		rationale=dispute.rationale,
		created_at=dispute.created_at,
	)

