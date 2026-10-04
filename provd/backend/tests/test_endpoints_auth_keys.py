from secrets import token_urlsafe

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.v1.auth import router as auth_router
from app.api.v1.keys import router as keys_router
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
    monkeypatch.setenv("DECISION_SIGNING_KEY", "11" * 32)
    monkeypatch.setenv("CORS_ORIGINS", "https://provd.tech")
    monkeypatch.setenv("ALLOWED_HOSTS", "api.provd.tech,testserver")
    monkeypatch.setenv("RATE_LIMIT_BACKEND", "memory")
    monkeypatch.setenv("ALLOW_IN_MEMORY_RATE_LIMIT", "true")
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
    monkeypatch.setenv("DECISION_SIGNING_KEY", "11" * 32)
    monkeypatch.setenv("CORS_ORIGINS", "https://provd.tech")
    monkeypatch.setenv("ALLOWED_HOSTS", "api.provd.tech,testserver")
    monkeypatch.setenv("RATE_LIMIT_BACKEND", "memory")
    monkeypatch.setenv("ALLOW_IN_MEMORY_RATE_LIMIT", "true")
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
    assert body["scopes"] == ["actions:evaluate"]


def test_keys_crud_flow():
    client, db = build_client(keys_router, db=FakeAsyncSession())

    create = client.post("/api/v1/keys", json={"name": "k1", "scopes": ["actions:evaluate"]})
    assert create.status_code == 201
    key_id = create.json()["id"]

    listed = client.get("/api/v1/keys")
    assert listed.status_code == 200
    assert any(item["id"] == key_id for item in listed.json())

    deleted = client.delete(f"/api/v1/keys/{key_id}")
    assert deleted.status_code == 204
    assert any(item.id == key_id and item.active is False for item in db.api_keys)
