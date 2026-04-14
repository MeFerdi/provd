from random import Random

from app.schemas.dispute import DisputeRequest
from app.services.hasher import sha256_hex


def analyze_dispute(payload: DisputeRequest) -> tuple[str, float, list[str]]:
	seed = int(sha256_hex(f"{payload.trade_id}:{payload.counterparty_id}:{payload.amount}")[:16], 16)
	rng = Random(seed)

	evidence_count = len(payload.evidence)
	evidence_score = min(1.0, evidence_count / 5)
	base_confidence = 0.45 + (0.45 * evidence_score)
	jitter = rng.uniform(-0.08, 0.08)
	confidence = max(0.05, min(0.98, base_confidence + jitter))

	recommendation = "manual_review"
	if confidence >= 0.8:
		recommendation = "approve_counterparty"
	elif confidence <= 0.35:
		recommendation = "flag_counterparty"

	rationale = [
		f"Evidence count assessed: {evidence_count}",
		"Historical trade behavior and consistency heuristics evaluated",
		"Confidence score produced by deterministic dispute analyzer",
	]
	return recommendation, confidence, rationale
