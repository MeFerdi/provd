from random import Random

from app.schemas.trust import TrustScoreRequest, TrustSignal
from app.services.hasher import sha256_hex


def _risk_level(score: float) -> str:
	if score >= 0.8:
		return "low"
	if score >= 0.5:
		return "medium"
	return "high"


def compute_trust_score(payload: TrustScoreRequest) -> tuple[float, str, list[TrustSignal]]:
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
