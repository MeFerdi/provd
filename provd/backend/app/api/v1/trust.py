from uuid import uuid4

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db_session, require_permissions
from app.models.score_log import ScoreLog
from app.schemas.auth import AuthContext
from app.schemas.trust import (
	ScoreHistoryItem,
	ScoreHistoryResponse,
	TrustScoreRequest,
	TrustScoreResponse,
	TrustSignal,
)
from app.services.cache import get_cached, set_cached
from app.services.scoring import compute_trust_score

router = APIRouter(prefix="/trust", tags=["trust"])


@router.post("/score", response_model=TrustScoreResponse, summary="Compute trust score")
async def score_counterparty(
	payload: TrustScoreRequest,
	db: AsyncSession = Depends(get_db_session),
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


@router.get("/history", response_model=ScoreHistoryResponse, summary="Query score history for an entity")
async def get_score_history(
	entity_id: str = Query(min_length=2, max_length=128, description="Entity ID to query history for"),
	limit: int = Query(default=20, ge=1, le=100, description="Maximum number of records to return"),
	db: AsyncSession = Depends(get_db_session),
	_: AuthContext = Depends(require_permissions(["trust:read"], allowed_roles=["admin"])),
) -> ScoreHistoryResponse:
	stmt = (
		select(ScoreLog)
		.where(ScoreLog.entity_id == entity_id)
		.order_by(ScoreLog.created_at.desc())
		.limit(limit)
	)
	result = await db.execute(stmt)
	logs = list(result.scalars().all())

	items = [
		ScoreHistoryItem(
			id=log.id,
			entity_id=log.entity_id,
			score=log.score,
			risk_level=log.risk_level,
			signals=[TrustSignal(**s) for s in log.signals],
			cached=log.cached,
			created_at=log.created_at,
		)
		for log in logs
	]
	return ScoreHistoryResponse(entity_id=entity_id, total=len(items), items=items)

