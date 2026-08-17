"""Tests for: dispute persistence, score history, and client CRUD endpoints."""
from tests.conftest import FakeAsyncSession, build_client

from app.api.v1.clients import router as clients_router
from app.api.v1.dispute import router as dispute_router
from app.api.v1.trust import router as trust_router


# ---------------------------------------------------------------------------
# Dispute persistence
# ---------------------------------------------------------------------------

def test_dispute_analyze_persists_to_db():
    client, db = build_client(dispute_router, db=FakeAsyncSession())

    response = client.post(
        "/api/v1/dispute/analyze",
        json={
            "trade_id": "T-100",
            "counterparty_id": "entity-b",
            "amount": 50.0,
            "evidence": ["invoice", "screenshot"],
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["trade_id"] == "T-100"
    assert body["counterparty_id"] == "entity-b"
    assert body["amount"] == 50.0
    assert "id" in body
    assert "created_at" in body
    assert 0 <= body["confidence"] <= 1
    assert isinstance(body["rationale"], list)

    # confirm the dispute was written to the fake store
    assert len(db.disputes) == 1
    assert db.disputes[0].trade_id == "T-100"
    assert db.disputes[0].raw_evidence == ["invoice", "screenshot"]


def test_dispute_get_returns_recorded_dispute():
    client, db = build_client(dispute_router, db=FakeAsyncSession())

    created = client.post(
        "/api/v1/dispute/analyze",
        json={
            "trade_id": "T-200",
            "counterparty_id": "entity-c",
            "amount": 0.0,
            "evidence": [],
        },
    )
    dispute_id = created.json()["id"]

    fetched = client.get(f"/api/v1/dispute/{dispute_id}")
    assert fetched.status_code == 200
    assert fetched.json()["id"] == dispute_id
    assert fetched.json()["trade_id"] == "T-200"


def test_dispute_get_returns_404_for_unknown_id():
    client, _ = build_client(dispute_router)
    response = client.get("/api/v1/dispute/does-not-exist")
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# Score history
# ---------------------------------------------------------------------------

def test_trust_history_returns_logs_for_entity(monkeypatch):
    client, db = build_client(trust_router, db=FakeAsyncSession())

    _cache: dict = {}

    async def _get_cached(key: str):
        return _cache.get(key)

    async def _set_cached(key: str, value, ttl_seconds: int = 300):
        _cache[key] = value

    monkeypatch.setattr("app.api.v1.trust.get_cached", _get_cached)
    monkeypatch.setattr("app.api.v1.trust.set_cached", _set_cached)

    # generate two score logs for entity-x, one for entity-y
    payload_x = {"entity_id": "entity-x", "amount": 10.0, "currency": "USDT"}
    payload_y = {"entity_id": "entity-y", "amount": 5.0, "currency": "USDT"}
    client.post("/api/v1/trust/score", json=payload_x)
    client.post("/api/v1/trust/score", json=payload_y)
    # second call for entity-x (cached, so no new log)
    client.post("/api/v1/trust/score", json=payload_x)

    history = client.get("/api/v1/trust/history", params={"entity_id": "entity-x"})
    assert history.status_code == 200
    body = history.json()
    assert body["entity_id"] == "entity-x"
    assert body["total"] == 1
    assert body["items"][0]["entity_id"] == "entity-x"


def test_trust_history_returns_empty_for_unknown_entity(monkeypatch):
    client, _ = build_client(trust_router, db=FakeAsyncSession())

    async def _get_cached(_key):
        return None

    async def _set_cached(_key, _val, ttl_seconds=300):
        pass

    monkeypatch.setattr("app.api.v1.trust.get_cached", _get_cached)
    monkeypatch.setattr("app.api.v1.trust.set_cached", _set_cached)

    history = client.get("/api/v1/trust/history", params={"entity_id": "nobody"})
    assert history.status_code == 200
    body = history.json()
    assert body["total"] == 0
    assert body["items"] == []


# ---------------------------------------------------------------------------
# Client CRUD
# ---------------------------------------------------------------------------

def test_clients_create_and_list():
    client, db = build_client(clients_router, db=FakeAsyncSession())

    create = client.post("/api/v1/clients", json={"name": "partner-alpha"})
    assert create.status_code == 201
    body = create.json()
    assert body["name"] == "partner-alpha"
    assert body["active"] is True
    assert "id" in body
    assert "created_at" in body

    listed = client.get("/api/v1/clients")
    assert listed.status_code == 200
    assert len(listed.json()) == 1
    assert listed.json()[0]["name"] == "partner-alpha"


def test_clients_get_by_id():
    client, db = build_client(clients_router, db=FakeAsyncSession())

    created = client.post("/api/v1/clients", json={"name": "partner-beta"})
    client_id = created.json()["id"]

    fetched = client.get(f"/api/v1/clients/{client_id}")
    assert fetched.status_code == 200
    assert fetched.json()["id"] == client_id


def test_clients_get_returns_404_for_unknown():
    client, _ = build_client(clients_router)
    response = client.get("/api/v1/clients/no-such-id")
    assert response.status_code == 404


def test_clients_deactivate():
    client, db = build_client(clients_router, db=FakeAsyncSession())

    created = client.post("/api/v1/clients", json={"name": "partner-gamma"})
    client_id = created.json()["id"]

    deleted = client.delete(f"/api/v1/clients/{client_id}")
    assert deleted.status_code == 204
    assert any(c.id == client_id and c.active is False for c in db.clients)


def test_clients_duplicate_name_returns_409():
    client, _ = build_client(clients_router, db=FakeAsyncSession())

    client.post("/api/v1/clients", json={"name": "same-name"})
    second = client.post("/api/v1/clients", json={"name": "same-name"})
    assert second.status_code == 409
