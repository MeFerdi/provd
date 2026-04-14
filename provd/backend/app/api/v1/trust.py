from uuid import uuid4

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import require_permissions
from app.db.postgres import get_postgres_session
from app.models.score_log import ScoreLog
from app.schemas.auth import AuthContext
from app.schemas.trust import TrustScoreRequest, TrustScoreResponse
from app.services.cache import get_cached, set_cached
from app.services.scoring import compute_trust_score

router = APIRouter(prefix="/trust", tags=["trust"])


@router.post("/score", response_model=TrustScoreResponse, summary="Compute trust score")
async def score_counterparty(
	payload: TrustScoreRequest,
	db: AsyncSession = Depends(get_postgres_session),
	_: AuthContext = Depends(require_permissions(["trust:read"], allowed_roles=["admin"])),
) -> TrustScoreResponse:
	cache_key = f"trust:{payload.entity_id}:{payload.amount}:{payload.currency}"
	cached_result = await get_cached(cache_key)
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
	await set_cached(cache_key, response.model_dump(exclude={"cached"}), ttl_seconds=300)
	score_log = ScoreLog(
		id=str(uuid4()),
		entity_id=payload.entity_id,
		score=response.score,
		risk_level=response.risk_level,
		signals=[signal.model_dump() for signal in signals],
		cached=False,
	)
	db.add(score_log)
	await db.commit()
	return response
