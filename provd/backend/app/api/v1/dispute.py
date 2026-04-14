from fastapi import APIRouter, Depends

from app.dependencies import require_permissions
from app.schemas.auth import AuthContext
from app.schemas.dispute import DisputeRequest, DisputeResponse
from app.services.dispute_analysis import analyze_dispute

router = APIRouter(prefix="/dispute", tags=["dispute"])


@router.post("/analyze", response_model=DisputeResponse, summary="Analyze dispute")
def analyze_trade_dispute(
	payload: DisputeRequest,
	_: AuthContext = Depends(require_permissions(["dispute:analyze"], allowed_roles=["admin"])),
) -> DisputeResponse:
	recommendation, confidence, rationale = analyze_dispute(payload)
	return DisputeResponse(
		trade_id=payload.trade_id,
		recommendation=recommendation,
		confidence=round(confidence, 4),
		rationale=rationale,
	)
