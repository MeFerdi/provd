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
        self.api_keys = []
        self.score_logs = []

    async def execute(self, statement):
        query = str(statement).lower()
        params = statement.compile().params

        if "from api_keys" in query:
            if not params:
                return _ExecResult(list(reversed(self.api_keys)))

            key_id = next((v for k, v in params.items() if "id" in k), None)
            if key_id is not None:
                item = next((x for x in self.api_keys if x.id == key_id), None)
                return _ExecResult([item] if item else [])

            key_hash = next((v for k, v in params.items() if "key_hash" in k), None)
            if key_hash is not None:
                item = next((x for x in self.api_keys if x.key_hash == key_hash and x.active), None)
                return _ExecResult([item] if item else [])

            return _ExecResult([])

        return _ExecResult([])

    def add(self, item):
        if item.__class__.__name__ == "ApiKey":
            if getattr(item, "created_at", None) is None:
                item.created_at = datetime.now(timezone.utc)
            self.api_keys.append(item)
        else:
            if getattr(item, "created_at", None) is None:
                item.created_at = datetime.now(timezone.utc)
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
