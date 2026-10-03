from contextlib import asynccontextmanager
from datetime import timedelta
from uuid import uuid4

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.api.v1 import posture as posture_api
from app.chains.evm import RpcError
from app.dependencies import get_db_session
from app.models.posture import EarlyAccessRequest, PostureChange, PostureSnapshot, Protocol
from app.posture.layerzero import NotAnOApp
from app.posture.rules import evaluate
from app.services import posture as service
from app.services.rate_limit import reset_rate_limits
from tests.posture_fixtures import CHECKED_AT, LZ_LABS, NETHERMIND, raw, route

TABLES = (Protocol, PostureSnapshot, PostureChange, EarlyAccessRequest)


@pytest.fixture()
def env(monkeypatch):
	reset_rate_limits()
	posture_api._scan_cache.clear()
	engine = create_async_engine("sqlite+aiosqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False})
	sessions = async_sessionmaker(engine, expire_on_commit=False)
	alerts: list = []

	async def fake_alerts(protocol, events):
		alerts.append((protocol.slug, [e.kind for e in events]))

	monkeypatch.setattr(service, "send_alerts", fake_alerts)

	@asynccontextmanager
	async def lifespan(_):
		async with engine.begin() as conn:
			await conn.run_sync(lambda sync: [t.__table__.create(sync) for t in TABLES])
		yield
		await engine.dispose()

	app = FastAPI(lifespan=lifespan)
	app.include_router(posture_api.router, prefix="/api/v1")

	async def _db():
		async with sessions() as session:
			yield session

	app.dependency_overrides[get_db_session] = _db
	with TestClient(app) as client:
		portal = client.portal  # run helpers on the app's event loop

		def run(coro):
			return portal.call(lambda: coro)

		yield client, sessions, run, alerts


async def _add_protocol(sessions, slug, published, posture):
	async with sessions() as db:
		contract = "0x" + uuid4().hex + "00000000"
		protocol = Protocol(id=str(uuid4()), slug=slug, name=slug.title(), category="bridge", chain="ethereum", contract=contract, published=published)
		db.add(protocol)
		await db.commit()
		await service.record_posture(db, protocol, posture)
		return protocol


def test_only_published_protocols_are_listed_and_detailed(env):
	client, sessions, run, _ = env
	strong = evaluate(raw([route(30110, LZ_LABS, NETHERMIND)]))
	run(_add_protocol(sessions, "public-one", True, strong))
	run(_add_protocol(sessions, "embargoed", False, strong))

	body = client.get("/api/v1/protocols").json()
	assert [i["slug"] for i in body["items"]] == ["public-one"]
	assert body["items"][0]["grade"] == "A"
	assert client.get("/api/v1/protocols/embargoed").status_code == 404
	detail = client.get("/api/v1/protocols/public-one").json()
	assert detail["pathways"][0]["receive"]["required_dvns"][0]["name"] == "LayerZero Labs"
	assert detail["changes"] == []


def test_configuration_change_is_recorded_and_alerted(env):
	client, sessions, run, alerts = env
	before = evaluate(raw([route(30110, LZ_LABS, NETHERMIND)]))
	protocol = run(_add_protocol(sessions, "bridge-x", True, before))

	after_raw = raw([route(30110, LZ_LABS)])
	after_raw["checked_at"] = CHECKED_AT + timedelta(hours=1)
	after = evaluate(after_raw)

	async def refresh():
		async with sessions() as db:
			p = await db.get(Protocol, protocol.id)
			events = await service.record_posture(db, p, after)
			await service.send_alerts(p, events)
			# Re-reading an unchanged posture records nothing new.
			assert await service.record_posture(db, p, after) == []

	run(refresh())
	assert alerts == [("bridge-x", ["CHG-VERIFIER-REDUCED"])]
	detail = client.get("/api/v1/protocols/bridge-x").json()
	assert detail["grade"] == "D"
	assert detail["changes"][0]["kind"] == "CHG-VERIFIER-REDUCED"
	assert detail["last_change_at"] is not None


def test_scan_returns_posture_and_caches(env, monkeypatch):
	client, *_ = env
	calls = []

	async def fake_scan(_client, address, chain="ethereum"):
		calls.append(address)
		return evaluate(raw([route(30320, LZ_LABS)]))

	monkeypatch.setattr(service, "scan_contract", fake_scan)
	address = "0x85d456B2DfF1fd8245387C0BfB64Dfb700e98Ef3"
	first = client.post("/api/v1/scan", json={"address": address})
	second = client.post("/api/v1/scan", json={"address": address.lower()})
	assert first.status_code == 200 and second.json() == first.json()
	assert first.json()["findings"][0]["rule_id"] == "LZ-SINGLE-VERIFIER"
	assert len(calls) == 1


@pytest.mark.parametrize(
	"error,status",
	[(NotAnOApp("This contract is not a LayerZero V2 OApp"), 422), (RpcError("down"), 502)],
)
def test_scan_errors(env, monkeypatch, error, status):
	client, *_ = env

	async def failing(*_args, **_kwargs):
		raise error

	monkeypatch.setattr(service, "scan_contract", failing)
	response = client.post("/api/v1/scan", json={"address": "0x" + "ab" * 20})
	assert response.status_code == status
	assert response.json()["detail"]


def test_scan_validates_address(env):
	client, *_ = env
	assert client.post("/api/v1/scan", json={"address": "not-an-address"}).status_code == 422


def test_early_access_stores_request_and_validates_email(env):
	client, sessions, run, _ = env
	ok = client.post("/api/v1/early-access", json={"email": "Curator@Example.com", "organization": "Vault Co", "role": "curator"})
	assert ok.status_code == 201 and ok.json() == {"ok": True}
	assert client.post("/api/v1/early-access", json={"email": "nope"}).status_code == 422

	async def stored():
		async with sessions() as db:
			return [r.email for r in (await db.execute(select(EarlyAccessRequest))).scalars()]

	assert run(stored()) == ["curator@example.com"]


def test_unchanged_configuration_still_picks_up_rule_updates(env):
	client, sessions, run, alerts = env
	posture = evaluate(raw([route(30320, LZ_LABS)]))
	protocol = run(_add_protocol(sessions, "reworded", True, posture))
	reworded = posture.model_copy(update={"findings": [posture.findings[0].model_copy(update={"summary": "New wording."})]})

	async def rerecord():
		async with sessions() as db:
			return await service.record_posture(db, await db.get(Protocol, protocol.id), reworded)

	assert run(rerecord()) == []
	detail = client.get("/api/v1/protocols/reworded").json()
	assert detail["findings"][0]["summary"] == "New wording."
	assert detail["changes"] == [] and alerts == []
