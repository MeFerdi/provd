import hashlib
import json
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app import indexer
from app.adapters.base import AdapterUnavailable, NormalizedAsset, NormalizedEvent, NormalizedHistory, NormalizedTransfer
from app.adapters.tron import validate_tron_address
from app.api.v1.actions import router as actions_router
from app.api.v1.health import router as health_router
from app.api.v1.proof import router as proof_router
from app.proof import anchors
from app.proof.anchors import AnchorResult
from app.proof.batching import advance_anchors, seal_batch
from app.dependencies import get_auth_context, get_db_session
from app.models.rails import AnchorBatch, Account, Checkpoint, CreditPurchase, Decision, FlaggedAddress, HistoryCache, Outcome, UsageEvent
from app.schemas.auth import AuthContext
from app.services import chain_data
from app.services.rate_limit import reset_rate_limits

TABLES = (AnchorBatch, Decision, Outcome, FlaggedAddress, HistoryCache, Checkpoint, Account, CreditPurchase, UsageEvent)
FROZEN = "TQLiq3fj6CCK1aZCJuXfxVZUwy6gSB4qxi"
EXPOSED = "TJ7E73Hs7aeeLDFMmySj9MGhXNronC6qc9"
CLEAN = "TNXoiAJ3dct8Fjg4M9fkLFh9S2v9TXc32G"
DEPOSIT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"
NOW = datetime.now(timezone.utc)


class FakeTron:
	chain = "tron"

	def __init__(self):
		self.calls = 0
		self.down = False
		self.deposits: list[NormalizedTransfer] = []

	def validate_address(self, address):
		return validate_tron_address(address)

	async def counterparty_history(self, address):
		self.calls += 1
		if self.down:
			raise AdapterUnavailable("TronGrid request failed: ReadTimeout")
		if address == DEPOSIT:
			return NormalizedHistory("tron", address, list(self.deposits))
		peers = [FROZEN] if address == EXPOSED else []
		peers += [f"PEER{i}" for i in range(3)]
		transfers = [NormalizedTransfer("tron", f"tx-{address}-{p}", NOW - timedelta(days=40), p, address, "USDT_TRC20", Decimal("100")) for p in peers]
		return NormalizedHistory("tron", address, transfers)

	async def fetch_events(self, cursor):
		return [NormalizedEvent("tron", "address_frozen", FROZEN, "tx-freeze", NOW - timedelta(days=5), "tether_usdt_freeze")], "123"

	async def asset_metadata(self, ref):
		return NormalizedAsset("tron", DEPOSIT, "USDT", 6, "Tether", True) if ref == "USDT_TRC20" else None


class FakeAnchor:
	method = "fake"

	def __init__(self):
		self.fail_next = False
		self.confirmed = False

	async def submit(self, root_hex):
		if self.fail_next:
			self.fail_next = False
			raise ConnectionError("calendar down")
		return AnchorResult(status="pending", proof=b"OTS" + bytes.fromhex(root_hex))

	async def upgrade(self, root_hex, proof):
		return AnchorResult(status="anchored", proof=proof + b"!", reference="bitcoin:block:900000") if self.confirmed else AnchorResult(status="pending", proof=proof)


@pytest.fixture()
def env(monkeypatch):
	monkeypatch.setenv("FREE_DAILY_CHECKS", "2")
	monkeypatch.setenv("USDT_DEPOSIT_ADDRESS", DEPOSIT)
	from app.config import get_settings

	get_settings.cache_clear()
	reset_rate_limits()
	tron = FakeTron()
	chain_data.set_adapter("tron", tron)
	engine = create_async_engine("sqlite+aiosqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False})
	sessions = async_sessionmaker(engine, expire_on_commit=False)

	@asynccontextmanager
	async def lifespan(_):
		async with engine.begin() as conn:
			await conn.run_sync(lambda sync: [t.__table__.create(sync) for t in TABLES])
		async with sessions() as db:
			await indexer.sync_freeze_events(db)
		yield
		await engine.dispose()

	app = FastAPI(lifespan=lifespan)
	app.include_router(actions_router, prefix="/v1")
	app.include_router(health_router, prefix="/v1")
	app.include_router(proof_router, prefix="/v1")
	anchor = FakeAnchor()
	anchors.set_anchor(anchor)
	who = {"client": "platform-a"}

	async def _db():
		async with sessions() as session:
			yield session

	async def _auth():
		role = "admin" if who["client"] == "admin" else "service"
		return AuthContext(principal_id=f"key-{who['client']}", auth_type="api_key", scopes=["actions:evaluate"], role=role, client_id=who["client"])

	app.dependency_overrides[get_db_session] = _db
	app.dependency_overrides[get_auth_context] = _auth
	with TestClient(app) as client:
		client.anchor = anchor
		yield client, tron, who, sessions, client.portal
	anchors.set_anchor(None)
	chain_data.set_adapter("tron", None)
	get_settings.cache_clear()


def intent(wallet, **kw):
	body = {"chain": "tron", "intent_type": "p2p_trade", "counterparty": {"wallet_address": wallet}}
	body.update(kw)
	return body


def test_decisions_flags_and_record_hash(env):
	client, *_ = env
	frozen = client.post("/v1/actions/evaluate", json=intent(FROZEN)).json()
	assert frozen["recommended_action"] == "reject" and frozen["risk_flags"][0]["code"] == "CP_ADDRESS_FROZEN"
	exposed = client.post("/v1/actions/evaluate", json=intent(EXPOSED)).json()
	assert exposed["recommended_action"] == "hold"
	assert exposed["explainability"][0]["signal"] == "counterparty_graph"
	record = client.get(f"/v1/decisions/{exposed['intent_id']}").json()
	canon = json.dumps(record["record"], sort_keys=True, separators=(",", ":"), ensure_ascii=False)
	assert hashlib.sha256(canon.encode()).hexdigest() == record["record_hash"] == exposed["decision_record_hash"]


def test_quota_then_402_then_topup_and_exact_ledger(env):
	client, tron, who, sessions, portal = env
	for _ in range(2):
		assert client.post("/v1/actions/evaluate", json=intent(CLEAN)).status_code == 200
	blocked = client.post("/v1/actions/evaluate", json=intent(CLEAN))
	assert blocked.status_code == 402 and blocked.json()["purchase_url"].endswith("/pricing")

	topup = client.post("/v1/topups", json={"bundle": "10k", "method": "mpesa"}).json()
	assert topup["status"] == "pending" and topup["currency"] == "KES"
	who["client"] = "admin"
	assert client.post(f"/v1/admin/topups/{topup['id']}/confirm", json={"reference": "QJK7AB12CD"}).json()["status"] == "confirmed"
	assert client.post(f"/v1/admin/topups/{topup['id']}/confirm", json={"reference": "QJK7AB12CD"}).status_code == 409
	who["client"] = "platform-a"

	for _ in range(3):
		assert client.post("/v1/actions/evaluate", json=intent(CLEAN)).status_code == 200
	usage = client.get("/v1/usage").json()
	assert usage["free_used_today"] == 2 and usage["balance_checks"] == 10_000 - 3 and usage["paid_checks_30d"] == 3


def test_usdt_topup_is_auto_matched_by_indexer(env):
	client, tron, who, sessions, portal = env
	topup = client.post("/v1/topups", json={"bundle": "10k", "method": "usdt_tron"}).json()
	assert topup["pay_to"] == DEPOSIT and Decimal(topup["amount_due"]) > 150
	tron.deposits = [
		NormalizedTransfer("tron", "wrong-amount", NOW + timedelta(seconds=5), "PAYER", DEPOSIT, "USDT_TRC20", Decimal("150")),
		NormalizedTransfer("tron", "right-amount", NOW + timedelta(seconds=6), "PAYER", DEPOSIT, "USDT_TRC20", Decimal(topup["amount_due"])),
	]

	async def match():
		async with sessions() as db:
			return await indexer.match_deposits(db)

	assert portal.call(match) == 1
	assert portal.call(match) == 0  # idempotent: the same transfer is never used twice
	listed = client.get("/v1/topups").json()[0]
	assert listed["status"] == "confirmed" and listed["reference"] == "right-amount"


def test_idempotency_and_duplicate_intent_ids(env):
	client, *_ = env
	a = client.post("/v1/actions/evaluate", json=intent(CLEAN), headers={"Idempotency-Key": "k1"}).json()
	b = client.post("/v1/actions/evaluate", json=intent(CLEAN), headers={"Idempotency-Key": "k1"}).json()
	assert a == b
	assert client.get("/v1/usage").json()["free_used_today"] == 1
	client.post("/v1/actions/evaluate", json=intent(CLEAN, intent_id="trade-1"))
	assert client.post("/v1/actions/evaluate", json=intent(CLEAN, intent_id="trade-1")).status_code == 422


def test_not_yet_supported_is_free_and_structured(env):
	client, *_ = env
	for body in (intent("GABC", chain="stellar"), intent(CLEAN, intent_type="swap"), intent(CLEAN, intent_type="asset_verify")):
		response = client.post("/v1/actions/evaluate", json=body).json()
		assert response["recommended_action"] == "not_yet_supported"
		assert response["risk_flags"][0]["code"] == "NOT_YET_SUPPORTED"
	assert client.get("/v1/usage").json()["free_used_today"] == 0
	assert client.post("/v1/actions/evaluate", json=intent(CLEAN, chain="bitcoin")).status_code == 422


def test_outcomes_drive_reversal_signal_per_platform_only(env):
	client, tron, who, *_ = env
	first = client.post("/v1/actions/evaluate", json=intent(CLEAN)).json()
	client.post("/v1/outcomes", json={"intent_id": first["intent_id"], "outcome": "reversed"})
	client.post("/v1/outcomes", json={"wallet_address": CLEAN, "outcome": "chargeback"})
	again = client.post("/v1/actions/evaluate", json=intent(CLEAN)).json()
	assert again["recommended_action"] == "hold"
	who["client"] = "platform-b"  # another platform sees none of platform-a's outcomes or decisions
	other = client.post("/v1/actions/evaluate", json=intent(CLEAN)).json()
	assert other["recommended_action"] == "release"
	assert client.get(f"/v1/decisions/{first['intent_id']}").status_code == 404


def test_phone_hash_outcomes_and_raw_phone_rejected(env):
	client, *_ = env
	phone = "ab" * 32
	client.post("/v1/outcomes", json={"phone_hash": phone, "outcome": "fake_confirmation"})
	res = client.post("/v1/actions/evaluate", json={"chain": "tron", "intent_type": "p2p_trade", "counterparty": {"phone_hash": phone.upper()}}).json()
	assert res["recommended_action"] == "reject"
	assert client.post("/v1/actions/evaluate", json={"chain": "tron", "intent_type": "p2p_trade", "counterparty": {"phone_hash": "+254712345678"}}).status_code == 422


def test_chain_outage_degrades_without_500(env):
	client, tron, *_ = env
	tron.down = True
	res = client.post("/v1/actions/evaluate", json=intent(CLEAN))
	assert res.status_code == 200
	body = res.json()
	assert body["signal_coverage"]["counterparty_graph"] == "partial"
	assert any(f["code"] == "REDUCED_SIGNAL_COVERAGE" for f in body["risk_flags"])
	frozen = client.post("/v1/actions/evaluate", json=intent(FROZEN)).json()
	assert frozen["recommended_action"] == "reject"  # the risk list still works without the chain


def test_history_is_cached(env):
	client, tron, *_ = env
	client.post("/v1/actions/evaluate", json=intent(EXPOSED))
	client.post("/v1/actions/evaluate", json=intent(EXPOSED))
	assert tron.calls == 1


def test_public_scanner_and_validation(env):
	client, *_ = env
	report = client.get(f"/v1/counterparties/tron/{EXPOSED}").json()
	assert report["risk_level"] == "high" and report["activity"]["distinct_counterparties"] == 4
	assert client.get("/v1/counterparties/tron/NOTANADDRESS").status_code == 422
	assert client.get("/v1/counterparties/stellar/GABC").status_code == 422
	assert client.get("/v1/assets/tron/USDT").status_code == 404


def test_health_reports_engine_and_risk_list(env):
	client, *_ = env
	health = client.get("/v1/health").json()
	assert health["engine_version"] and health["dependencies"]["risk_list"]["active_flagged_addresses"] == 1
	assert health["signals"]["amount_pattern"] == "enabled"
	assert health["signals"]["asset_backing"].startswith("planned")


def _run(portal, fn, *args, **kwargs):
	async def call():
		async with portal.sessions() as db:
			return await fn(db, *args, **kwargs)

	return portal.call(call)


def test_decision_is_signed_batched_anchored_and_independently_verifiable(env, tmp_path):
	import subprocess
	import sys
	from pathlib import Path

	client, tron, who, sessions, portal = env
	portal.sessions = sessions
	decision = client.post("/v1/actions/evaluate", json=intent(EXPOSED)).json()
	before = client.get(f"/v1/decisions/{decision['intent_id']}").json()
	assert before["signature"]["value"] and before["merkle"] is None
	assert before["proof_status"].startswith("signed")

	client.post("/v1/actions/evaluate", json=intent(CLEAN))
	batch = _run(portal, seal_batch, force=True)
	assert batch.leaf_count == 2 and batch.anchor_status == "pending"
	assert _run(portal, seal_batch) is None  # nothing new, and the interval hasn't passed

	bundle = client.get(f"/v1/decisions/{decision['intent_id']}").json()
	assert bundle["merkle"]["root"] == batch.merkle_root and bundle["proof_status"] == "anchoring"
	key = client.get("/v1/proof/keys").json()["keys"][0]
	assert key["public_key"] == bundle["signature"]["public_key"]
	ots = client.get(f"/v1/proof/batches/{batch.id}/ots")
	assert ots.status_code == 200 and ots.content == b"OTS" + bytes.fromhex(batch.merkle_root)

	client.anchor.confirmed = True
	assert _run(portal, advance_anchors, now=datetime.now(timezone.utc) + timedelta(hours=1)) == 1
	anchored = client.get(f"/v1/proof/batches/{batch.id}").json()
	assert anchored["anchor"]["status"] == "anchored" and anchored["anchor"]["reference"] == "bitcoin:block:900000"

	tool = Path(__file__).resolve().parents[1] / "tools" / "verify_decision.py"
	path = tmp_path / "decision.json"
	path.write_text(json.dumps(client.get(f"/v1/decisions/{decision['intent_id']}").json()))
	good = subprocess.run([sys.executable, str(tool), str(path), "--public-key", key["public_key"]], capture_output=True, text=True)
	assert good.returncode == 0, good.stdout
	tampered = json.loads(path.read_text())
	tampered["record"]["decision"]["recommended_action"] = "release"
	path.write_text(json.dumps(tampered))
	bad = subprocess.run([sys.executable, str(tool), str(path)], capture_output=True, text=True)
	assert bad.returncode == 1 and "FAIL" in bad.stdout


def test_failed_anchor_submission_is_retried(env):
	client, tron, who, sessions, portal = env
	portal.sessions = sessions
	client.post("/v1/actions/evaluate", json=intent(CLEAN))
	client.anchor.fail_next = True
	batch = _run(portal, seal_batch, force=True)
	assert batch.anchor_status == "failed" and "calendar down" in batch.anchor_detail
	assert _run(portal, advance_anchors) == 1
	assert client.get(f"/v1/proof/batches/{batch.id}").json()["anchor"]["status"] == "pending"


def test_unsigned_legacy_decisions_are_signed_when_batched(env):
	from sqlalchemy import update

	client, tron, who, sessions, portal = env
	portal.sessions = sessions
	decision = client.post("/v1/actions/evaluate", json=intent(CLEAN)).json()

	async def strip(db):
		await db.execute(update(Decision).values(signature=None, signing_key_id=None))
		await db.commit()

	_run(portal, strip)
	_run(portal, seal_batch, force=True)
	bundle = client.get(f"/v1/decisions/{decision['intent_id']}").json()
	assert bundle["signature"]["value"] and bundle["merkle"]["proof"] == []


def test_payout_scoring_with_account_signals_and_learned_baselines(env, monkeypatch):
	from app.config import get_settings

	client, *_ = env
	monkeypatch.setenv("FREE_DAILY_CHECKS", "50")
	get_settings.cache_clear()
	for _ in range(3):
		client.post("/v1/actions/evaluate", json=intent(CLEAN, intent_type="payout", amounts={"crypto": 50}, rails={"crypto_asset": "USDT_TRC20"}))
	spike = client.post("/v1/actions/evaluate", json=intent(CLEAN, intent_type="payout", amounts={"crypto": 2000}, rails={"crypto_asset": "USDT_TRC20"})).json()
	assert any(f["code"] == "AMOUNT_SPIKE" for f in spike["risk_flags"]) and spike["recommended_action"] == "hold"
	signals = [e["signal"] for e in spike["explainability"]]
	assert {"counterparty_graph", "reversal_behavior", "amount_pattern", "float_and_timing", "account_takeover_proxies"} <= set(signals)

	takeover = client.post("/v1/actions/evaluate", json=intent(
		CLEAN, intent_type="payout", amounts={"fiat": 20000, "fiat_currency": "KES"},
		account_signals={"provider": "simswap-vendor", "sim_swap_at": (NOW - timedelta(hours=2)).isoformat(), "payout_destination_added_at": (NOW - timedelta(hours=1)).isoformat()},
	)).json()
	assert takeover["recommended_action"] == "reject"
	ato = next(e for e in takeover["explainability"] if e["signal"] == "account_takeover_proxies")
	assert "provider:simswap-vendor" in ato["source_refs"]
	otc = client.post("/v1/actions/evaluate", json=intent(CLEAN, intent_type="otc_settlement", amounts={"fiat": 9_000_000, "fiat_currency": "KES"}, float_available=10_000_000)).json()
	assert any(f["code"] == "FLOAT_STRAIN" for f in otc["risk_flags"])


def test_subscription_plan_overage_modes_and_statement(env):
	client, tron, who, *_ = env
	who["client"] = "admin"
	assert client.put("/v1/admin/accounts/global-co/billing", json={"billing_model": "subscription"}).status_code == 422
	client.put("/v1/admin/accounts/global-co/billing", json={"billing_model": "subscription", "plan_name": "Payouts 2", "monthly_included_checks": 2, "overage": "invoice"})
	who["client"] = "global-co"
	for _ in range(3):
		assert client.post("/v1/actions/evaluate", json=intent(CLEAN, intent_type="payout")).status_code == 200
	usage = client.get("/v1/usage").json()
	assert usage["billing_model"] == "subscription" and usage["plan"]["used_this_period"] == 2 and usage["plan"]["remaining_this_period"] == 0
	assert usage["last_30_days"]["overage"]["checks"] == 1

	who["client"] = "admin"
	client.put("/v1/admin/accounts/global-co/billing", json={"billing_model": "subscription", "monthly_included_checks": 2, "overage": "block"})
	who["client"] = "global-co"
	blocked = client.post("/v1/actions/evaluate", json=intent(CLEAN, intent_type="payout"))
	assert blocked.status_code == 402 and "plan" in blocked.json()["detail"].lower()

	who["client"] = "admin"
	client.put("/v1/admin/accounts/global-co/billing", json={"billing_model": "subscription", "monthly_included_checks": 2, "overage": "prepaid"})
	who["client"] = "global-co"
	assert client.post("/v1/actions/evaluate", json=intent(CLEAN, intent_type="payout")).status_code == 402  # no balance yet
	topup = client.post("/v1/topups", json={"bundle": "10k", "method": "mpesa"}).json()
	who["client"] = "admin"
	client.post(f"/v1/admin/topups/{topup['id']}/confirm", json={"reference": "QX1234ABCD"})
	who["client"] = "global-co"
	assert client.post("/v1/actions/evaluate", json=intent(CLEAN, intent_type="payout")).status_code == 200
	assert client.get("/v1/usage").json()["balance_checks"] == 9999

	who["client"] = "admin"
	month = datetime.now(timezone.utc).strftime("%Y-%m")
	statement = client.get(f"/v1/admin/accounts/global-co/statement?month={month}").json()
	assert statement["by_source"] == {"plan": {"checks": 2, "units": 2}, "overage": {"checks": 1, "units": 1}, "prepaid": {"checks": 1, "units": 1}}
	who["client"] = "global-co"
	assert client.get(f"/v1/admin/accounts/global-co/statement?month={month}").status_code == 403
