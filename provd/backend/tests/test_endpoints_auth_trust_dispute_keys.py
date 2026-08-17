from secrets import token_urlsafe

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.v1.auth import router as auth_router
from app.api.v1.dispute import router as dispute_router
from app.api.v1.keys import router as keys_router
from app.api.v1.trust import router as trust_router
from app.config import Settings
from app.dependencies import get_app_settings
from tests.conftest import FakeAsyncSession, build_client


def test_auth_token_issued_for_dev_credentials(monkeypatch):
    dev_client_id = "dev-client"
    dev_client_secret = token_urlsafe(24)
    jwt_secret = token_urlsafe(32)

    # pydantic-settings v2 gives env vars higher priority than init kwargs,
    # so we inject via env and let Settings() read from there.
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.setenv("SECRET_KEY", jwt_secret)
    monkeypatch.setenv("ENABLE_TEST_AUTH", "true")
    monkeypatch.setenv("DEV_CLIENT_ID", dev_client_id)
    monkeypatch.setenv("DEV_CLIENT_SECRET", dev_client_secret)
    monkeypatch.delenv("BOOTSTRAP_ADMIN_CLIENT_ID", raising=False)
    monkeypatch.delenv("BOOTSTRAP_ADMIN_CLIENT_SECRET", raising=False)
    monkeypatch.delenv("BOOTSTRAP_CLIENT_CLIENT_ID", raising=False)
    monkeypatch.delenv("BOOTSTRAP_CLIENT_CLIENT_SECRET", raising=False)

    app = FastAPI()
    app.include_router(auth_router, prefix="/api/v1")

    def _settings_override():
        return Settings()

    app.dependency_overrides[get_app_settings] = _settings_override  # type: ignore
    client = TestClient(app)
    response = client.post(
        "/api/v1/auth/token",
        json={"client_id": dev_client_id, "client_secret": dev_client_secret},
    )

    assert response.status_code == 200
    body = response.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"


def test_auth_token_issued_for_bootstrap_admin_credentials(monkeypatch):
    admin_client_id = "staging-admin"
    admin_client_secret = token_urlsafe(24)
    client_client_id = "staging-client"
    client_client_secret = token_urlsafe(24)
    jwt_secret = token_urlsafe(32)

    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("SECRET_KEY", jwt_secret)
    monkeypatch.setenv("BOOTSTRAP_ADMIN_CLIENT_ID", admin_client_id)
    monkeypatch.setenv("BOOTSTRAP_ADMIN_CLIENT_SECRET", admin_client_secret)
    monkeypatch.setenv("BOOTSTRAP_CLIENT_CLIENT_ID", client_client_id)
    monkeypatch.setenv("BOOTSTRAP_CLIENT_CLIENT_SECRET", client_client_secret)
    monkeypatch.delenv("ENABLE_TEST_AUTH", raising=False)
    monkeypatch.delenv("DEV_CLIENT_ID", raising=False)
    monkeypatch.delenv("DEV_CLIENT_SECRET", raising=False)

    app = FastAPI()
    app.include_router(auth_router, prefix="/api/v1")

    def _settings_override():
        return Settings()

    app.dependency_overrides[get_app_settings] = _settings_override  # type: ignore
    client = TestClient(app)
    response = client.post(
        "/api/v1/auth/token",
        json={"client_id": admin_client_id, "client_secret": admin_client_secret},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["role"] == "admin"
    assert "keys:write" in body["scopes"]


def test_auth_token_issued_for_bootstrap_client_credentials(monkeypatch):
    admin_client_id = "staging-admin"
    admin_client_secret = token_urlsafe(24)
    client_id = "partner-client"
    client_secret = token_urlsafe(24)
    jwt_secret = token_urlsafe(32)

    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("SECRET_KEY", jwt_secret)
    monkeypatch.setenv("BOOTSTRAP_ADMIN_CLIENT_ID", admin_client_id)
    monkeypatch.setenv("BOOTSTRAP_ADMIN_CLIENT_SECRET", admin_client_secret)
    monkeypatch.setenv("BOOTSTRAP_CLIENT_CLIENT_ID", client_id)
    monkeypatch.setenv("BOOTSTRAP_CLIENT_CLIENT_SECRET", client_secret)
    monkeypatch.delenv("ENABLE_TEST_AUTH", raising=False)
    monkeypatch.delenv("DEV_CLIENT_ID", raising=False)
    monkeypatch.delenv("DEV_CLIENT_SECRET", raising=False)

    app = FastAPI()
    app.include_router(auth_router, prefix="/api/v1")

    def _settings_override():
        return Settings()

    app.dependency_overrides[get_app_settings] = _settings_override  # type: ignore
    client = TestClient(app)
    response = client.post(
        "/api/v1/auth/token",
        json={"client_id": client_id, "client_secret": client_secret},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["role"] == "client"
    assert body["scopes"] == ["trust:read"]


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
    client, db = build_client(dispute_router, db=FakeAsyncSession())

    response = client.post(
        "/api/v1/dispute/analyze",
        json={
            "trade_id": "T-001",
            "counterparty_id": "entity-a",
            "amount": 25.0,
            "evidence": ["receipt"],
        },
    )

    # endpoint now returns 201 Created and persists the dispute
    assert response.status_code == 201
    body = response.json()
    assert body["trade_id"] == "T-001"
    assert "recommendation" in body
    assert 0 <= body["confidence"] <= 1
    assert len(db.disputes) == 1
