from __future__ import annotations

from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.dependencies import get_auth_context, get_db_session
from app.schemas.auth import AuthContext


class _ScalarList:
    def __init__(self, values):
        self._values = values

    def all(self):
        return self._values


class _ExecResult:
    def __init__(self, values):
        self._values = values

    def scalars(self):
        return _ScalarList(self._values)

    def scalar_one_or_none(self):
        return self._values[0] if self._values else None


class FakeAsyncSession:
    def __init__(self):
        self.api_keys: list = []
        self.score_logs: list = []
        self.disputes: list = []
        self.clients: list = []

    async def execute(self, statement):
        query = str(statement).lower()
        params = statement.compile().params

        if "from api_keys" in query:
            if not params:
                return _ExecResult(list(reversed(self.api_keys)))

            key_id = next((v for k, v in params.items() if k == "id_1"), None)
            if key_id is not None:
                item = next((x for x in self.api_keys if x.id == key_id), None)
                return _ExecResult([item] if item else [])

            key_hash = next((v for k, v in params.items() if "key_hash" in k), None)
            if key_hash is not None:
                item = next((x for x in self.api_keys if x.key_hash == key_hash and x.active), None)
                return _ExecResult([item] if item else [])

            return _ExecResult([])

        if "from disputes" in query:
            dispute_id = next((v for k, v in params.items() if "id" in k), None)
            if dispute_id is not None:
                item = next((x for x in self.disputes if x.id == dispute_id), None)
                return _ExecResult([item] if item else [])
            return _ExecResult(list(self.disputes))

        if "from clients" in query:
            client_name = next((v for k, v in params.items() if "name" in k), None)
            if client_name is not None:
                item = next((x for x in self.clients if x.name == client_name), None)
                return _ExecResult([item] if item else [])
            client_id = next((v for k, v in params.items() if "id" in k), None)
            if client_id is not None:
                item = next((x for x in self.clients if x.id == client_id), None)
                return _ExecResult([item] if item else [])
            return _ExecResult(list(reversed(self.clients)))

        if "from score_logs" in query:
            entity_id = next((v for k, v in params.items() if "entity_id" in k), None)
            logs = self.score_logs
            if entity_id is not None:
                logs = [x for x in logs if x.entity_id == entity_id]
            return _ExecResult(list(reversed(logs)))

        return _ExecResult([])

    def add(self, item):
        cls = item.__class__.__name__
        if getattr(item, "created_at", None) is None:
            item.created_at = datetime.now(timezone.utc)
        if cls == "ApiKey":
            self.api_keys.append(item)
        elif cls == "Dispute":
            self.disputes.append(item)
        elif cls == "Client":
            if not hasattr(item, "updated_at") or item.updated_at is None:
                item.updated_at = item.created_at
            self.clients.append(item)
        else:
            self.score_logs.append(item)

    async def commit(self):
        return None

    async def refresh(self, _item):
        return None


async def _auth_override() -> AuthContext:
    return AuthContext(principal_id="test-admin", auth_type="bearer", scopes=["*"], role="admin")


def build_client(router, db: FakeAsyncSession | None = None) -> tuple[TestClient, FakeAsyncSession]:
    app = FastAPI()
    app.include_router(router, prefix="/api/v1")
    db_session = db or FakeAsyncSession()

    async def _db_override():
        return db_session

    app.dependency_overrides[get_db_session] = _db_override
    app.dependency_overrides[get_auth_context] = _auth_override
    return TestClient(app), db_session

