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


def test_compute_trust_score_uses_ml_when_enabled(monkeypatch):
    class _Settings:
        ml_inference_enabled = True
        ml_service_url = "http://ml:8085"
        ml_inference_timeout_seconds = 1.0

    class _FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {
                "score": 0.91,
                "risk_level": "low",
                "signals": [
                    {"name": "ml_signal_a", "value": 0.9, "weight": 0.6},
                    {"name": "ml_signal_b", "value": 0.7, "weight": 0.4},
                ],
            }

    class _FakeClient:
        def __init__(self, timeout: float):
            self.timeout = timeout

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def post(self, url: str, json: dict):
            assert url.endswith("/predict")
            assert json["entity_id"] == "entity-x"
            return _FakeResponse()

    monkeypatch.setattr("app.services.scoring.get_settings", lambda: _Settings)
    monkeypatch.setattr("app.services.scoring.httpx.Client", _FakeClient)

    req = TrustScoreRequest(entity_id="entity-x", amount=10, currency="USDT")
    score, risk_level, signals = compute_trust_score(req)

    assert round(score, 4) == 0.91
    assert risk_level == "low"
    assert [signal.name for signal in signals] == ["ml_signal_a", "ml_signal_b"]


def test_compute_trust_score_falls_back_when_ml_unavailable(monkeypatch):
    class _Settings:
        ml_inference_enabled = True
        ml_service_url = "http://ml:8085"
        ml_inference_timeout_seconds = 1.0

    class _FailingClient:
        def __init__(self, timeout: float):
            self.timeout = timeout

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def post(self, url: str, json: dict):
            raise RuntimeError("ml down")

    monkeypatch.setattr("app.services.scoring.get_settings", lambda: _Settings)
    monkeypatch.setattr("app.services.scoring.httpx.Client", _FailingClient)

    req = TrustScoreRequest(entity_id="entity-x", amount=10, currency="USDT")

    score_1, level_1, signals_1 = compute_trust_score(req)
    score_2, level_2, signals_2 = compute_trust_score(req)

    assert round(score_1, 6) == round(score_2, 6)
    assert level_1 == level_2
    assert [s.model_dump() for s in signals_1] == [s.model_dump() for s in signals_2]
