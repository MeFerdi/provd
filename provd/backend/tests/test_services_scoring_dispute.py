from app.schemas.dispute import DisputeRequest
from app.schemas.trust import TrustScoreRequest
from app.services.dispute_analysis import analyze_dispute
from app.services.scoring import compute_trust_score


def test_compute_trust_score_is_deterministic():
    req = TrustScoreRequest(entity_id="entity-x", amount=10, currency="USDT")

    score_1, level_1, signals_1 = compute_trust_score(req)
    score_2, level_2, signals_2 = compute_trust_score(req)

    assert round(score_1, 6) == round(score_2, 6)
    assert level_1 == level_2
    assert [s.model_dump() for s in signals_1] == [s.model_dump() for s in signals_2]


def test_analyze_dispute_returns_bounded_confidence():
    req = DisputeRequest(trade_id="D-1", counterparty_id="entity-y", amount=20, evidence=["proof"])
    recommendation, confidence, rationale = analyze_dispute(req)

    assert recommendation in {"manual_review", "approve_counterparty", "flag_counterparty"}
    assert 0 <= confidence <= 1
    assert isinstance(rationale, list)
    assert len(rationale) >= 1
