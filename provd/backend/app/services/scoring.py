import logging
from random import Random

import httpx

from app.config import get_settings
from app.schemas.trust import TrustScoreRequest, TrustSignal
from app.services.hasher import sha256_hex


logger = logging.getLogger(__name__)


def _risk_level(score: float) -> str:
	if score >= 0.8:
		return "low"
	if score >= 0.5:
		return "medium"
	return "high"


def _heuristic_trust_score(payload: TrustScoreRequest) -> tuple[float, str, list[TrustSignal]]:
	seed = int(sha256_hex(f"{payload.entity_id}:{payload.amount}:{payload.currency}")[:16], 16)
	rng = Random(seed)

	trade_consistency = rng.uniform(0.3, 0.95)
	dispute_history = rng.uniform(0.2, 0.95)
	graph_reputation = rng.uniform(0.25, 0.98)

	signals = [
		TrustSignal(name="trade_consistency", value=trade_consistency, weight=0.4),
		TrustSignal(name="dispute_history", value=dispute_history, weight=0.3),
		TrustSignal(name="graph_reputation", value=graph_reputation, weight=0.3),
	]
	score = sum(signal.value * signal.weight for signal in signals)
	return score, _risk_level(score), signals


def _parse_ml_signals(raw_signals: object, fallback_score: float) -> list[TrustSignal]:
	if not isinstance(raw_signals, list):
		return [TrustSignal(name="ml_model_score", value=fallback_score, weight=1.0)]

	parsed: list[TrustSignal] = []
	for signal in raw_signals:
		if not isinstance(signal, dict):
			continue

		name = str(signal.get("name", "unknown_signal"))
		try:
			value = float(signal.get("value", 0.0))
		except (TypeError, ValueError):
			value = 0.0

		try:
			weight = float(signal.get("weight", 0.0))
		except (TypeError, ValueError):
			weight = 0.0

		parsed.append(TrustSignal(name=name, value=value, weight=weight))

	if not parsed:
		return [TrustSignal(name="ml_model_score", value=fallback_score, weight=1.0)]

	return parsed


def _ml_trust_score(payload: TrustScoreRequest) -> tuple[float, str, list[TrustSignal]] | None:
	settings = get_settings()
	if not settings.ml_inference_enabled:
		return None

	url = f"{settings.ml_service_url.rstrip('/')}/predict"
	request_payload = {
		"entity_id": payload.entity_id,
		"amount": payload.amount,
		"currency": payload.currency,
		"context": payload.context or {},
	}

	try:
		with httpx.Client(timeout=settings.ml_inference_timeout_seconds) as client:
			response = client.post(url, json=request_payload)
			response.raise_for_status()
			data = response.json()
	except Exception as exc:
		logger.warning("ML inference unavailable; using heuristic scoring", exc_info=exc)
		return None

	if not isinstance(data, dict):
		return None

	try:
		raw_score = float(data.get("score", 0.0))
	except (TypeError, ValueError):
		return None

	score = max(0.0, min(1.0, raw_score))
	risk_level = str(data.get("risk_level") or _risk_level(score)).lower()
	if risk_level not in {"low", "medium", "high"}:
		risk_level = _risk_level(score)

	signals = _parse_ml_signals(data.get("signals"), fallback_score=score)
	return score, risk_level, signals


def compute_trust_score(payload: TrustScoreRequest) -> tuple[float, str, list[TrustSignal]]:
	ml_result = _ml_trust_score(payload)
	if ml_result is not None:
		return ml_result

	return _heuristic_trust_score(payload)
