"""Tests for client CRUD endpoints."""
from tests.conftest import FakeAsyncSession, build_client

from app.api.v1.clients import router as clients_router


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
