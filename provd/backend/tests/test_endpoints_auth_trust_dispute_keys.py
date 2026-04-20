from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.v1.auth import router as auth_router
from app.api.v1.dispute import router as dispute_router
from app.api.v1.keys import router as keys_router
from app.api.v1.trust import router as trust_router
from app.config import Settings
from app.dependencies import get_app_settings
from tests.conftest import FakeAsyncSession, build_client


def test_auth_token_issued_for_dev_credentials():
    app = FastAPI()
    app.include_router(auth_router, prefix="/api/v1")

    def _settings_override():
        return Settings(app_env="development", secret_key="test-secret")

    app.dependency_overrides[get_app_settings] = _settings_override # type: ignore
    client = TestClient(app)
    response = client.post(
        "/api/v1/auth/token",
        json={"client_id": "provd-dev-client", "client_secret": "provd-dev-secret"},
    )

    assert response.status_code == 200
    body = response.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"


def test_keys_crud_flow():
    client, db = build_client(keys_router, db=FakeAsyncSession())

    create = client.post("/api/v1/keys", json={"name": "k1", "scopes": ["trust:read"]})
    assert create.status_code == 201
    key_id = create.json()["id"]

    listed = client.get("/api/v1/keys")
    assert listed.status_code == 200
    assert any(item["id"] == key_id for item in listed.json())

    deleted = client.delete(f"/api/v1/keys/{key_id}")
    assert deleted.status_code == 204
    assert any(item.id == key_id and item.active is False for item in db.api_keys)


def test_trust_score_endpoint_logs_score(monkeypatch):
    client, db = build_client(trust_router, db=FakeAsyncSession())

    _cache = {}

    async def _get_cached(key: str):
        return _cache.get(key)

    async def _set_cached(key: str, value, ttl_seconds: int = 300):
        _cache[key] = value

    monkeypatch.setattr("app.api.v1.trust.get_cached", _get_cached)
    monkeypatch.setattr("app.api.v1.trust.set_cached", _set_cached)

    payload = {"entity_id": "entity-a", "amount": 12.0, "currency": "USDT"}
    first = client.post("/api/v1/trust/score", json=payload)
    second = client.post("/api/v1/trust/score", json=payload)

    assert first.status_code == 200
    assert first.json()["cached"] is False
    assert second.status_code == 200
    assert second.json()["cached"] is True
    assert len(db.score_logs) == 1


def test_dispute_endpoint_returns_recommendation():
    client, _ = build_client(dispute_router)

    response = client.post(
        "/api/v1/dispute/analyze",
        json={
            "trade_id": "T-001",
            "counterparty_id": "entity-a",
            "amount": 25.0,
            "evidence": ["receipt"],
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["trade_id"] == "T-001"
    assert "recommendation" in body
    assert 0 <= body["confidence"] <= 1
