import asyncio
from datetime import datetime, timezone

from app.schemas.trust import TrustScoreRequest
from app.services.cache import set_cached
from app.services.scoring import compute_trust_score
from app.tasks.celery_app import celery_app


async def _refresh_cache(cache_key: str, payload: dict, ttl_seconds: int) -> None:
    await set_cached(cache_key, payload, ttl_seconds=ttl_seconds)


@celery_app.task(name="score.refresh")
def refresh_scores(entities: list[dict], ttl_seconds: int = 300) -> dict:
    """Recompute trust scores for a list of entities and refresh cache."""
    processed = 0
    results: list[dict] = []
    cache_jobs: list[tuple[str, dict]] = []

    for entity in entities:
        entity_id = str(entity.get("entity_id", "")).strip()
        if not entity_id:
            continue

        request = TrustScoreRequest(
            entity_id=entity_id,
            amount=float(entity.get("amount", 0.0)),
            currency=str(entity.get("currency", "USDT")),
            context=entity.get("context") if isinstance(entity.get("context"), dict) else None,
        )
        score, risk_level, signals = compute_trust_score(request)

        cache_key = f"trust:{request.entity_id}:{request.amount}:{request.currency}"
        payload = {
            "entity_id": request.entity_id,
            "score": round(score, 4),
            "risk_level": risk_level,
            "signals": [signal.model_dump() for signal in signals],
        }
        cache_jobs.append((cache_key, payload))

        processed += 1
        results.append({"entity_id": request.entity_id, "score": payload["score"], "risk_level": risk_level})

    if cache_jobs:
        async def _run_cache_jobs() -> None:
            for cache_key, payload in cache_jobs:
                await _refresh_cache(cache_key, payload, ttl_seconds)

        asyncio.run(_run_cache_jobs())

    return {
        "processed": processed,
        "ttl_seconds": ttl_seconds,
        "refreshed_at": datetime.now(timezone.utc).isoformat(),
        "results": results,
    }
