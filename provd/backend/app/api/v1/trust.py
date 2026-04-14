from fastapi import APIRouter

from app.schemas.trust import TrustScoreRequest, TrustScoreResponse
from app.services.cache import get_cached, set_cached
from app.services.scoring import compute_trust_score

router = APIRouter(prefix="/trust", tags=["trust"])


@router.post("/score", response_model=TrustScoreResponse, summary="Compute trust score")
def score_counterparty(payload: TrustScoreRequest) -> TrustScoreResponse:
	cache_key = f"trust:{payload.entity_id}:{payload.amount}:{payload.currency}"
	cached_result = get_cached(cache_key)
	if cached_result:
		return TrustScoreResponse(**cached_result, cached=True)

	score, risk_level, signals = compute_trust_score(payload)
	response = TrustScoreResponse(
		entity_id=payload.entity_id,
		score=round(score, 4),
		risk_level=risk_level,
		signals=signals,
		cached=False,
	)
	set_cached(cache_key, response.model_dump(exclude={"cached"}), ttl_seconds=300)
	return response
