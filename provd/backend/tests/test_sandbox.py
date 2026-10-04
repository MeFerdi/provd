"""Sandbox keys: free checks against fixed test wallets, isolated from live data and live keys."""
from secrets import token_urlsafe

import pytest

from app.models.api_key import ApiKey
from sqlalchemy import func, select

from app.models.rails import Decision, UsageEvent
from app.proof.batching import seal_batch
from app.proof.attestations import attestation_signer, sandbox_attestation_signer
from app.proof.signing import sandbox_signer, signer, verify
from app.services import chain_data, sandbox
from app.services.hasher import sha256_hex
from tests.test_rails_api import FakeTron
from tests.test_security import make_client  # noqa: F401  (fixture)

W = sandbox.WALLETS


class ExplodingAdapter:
	"""The sandbox must never reach a chain provider."""

	chain = "tron"

	def validate_address(self, address):
		from app.adapters.tron import TronAdapter

		return TronAdapter("x", "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t", "", 1).validate_address(address)

	async def counterparty_history(self, address):
		raise AssertionError("sandbox called the live chain adapter")

	async def fetch_events(self, cursor):
		raise AssertionError("sandbox called the live chain adapter")

	async def asset_metadata(self, ref):
		return None


@pytest.fixture()
def sandbox_client(make_client):  # noqa: F811
	client, live_key, sessions = make_client()
	sandbox_key = "sbx_" + token_urlsafe(32)

	async def _add():
		async with sessions() as db:
			db.add(ApiKey(id="key-sbx", client_id="client-1", name="sandbox", prefix=sandbox_key[:8], key_hash=sha256_hex(sandbox_key),
			              scopes=["actions:evaluate"], active=True, environment="sandbox"))
			await db.commit()

	client.portal.call(_add)
	chain_data.set_adapter("tron", ExplodingAdapter())
	return client, live_key, sandbox_key, sessions


def _evaluate(client, key, chain, wallet, **extra):
	body = {"chain": chain, "intent_type": "p2p_trade", "counterparty": {"wallet_address": wallet}, "amounts": {"crypto": "250"}, **extra}
	return client.post("/v1/actions/evaluate", json=body, headers={"X-API-Key": key})


def _run(client, coro_fn):
	return client.portal.call(coro_fn)


@pytest.mark.parametrize("chain", ["tron", "solana"])
@pytest.mark.parametrize("scenario", sandbox.SCENARIOS, ids=lambda s: s["wallet"])
def test_every_documented_scenario_scores_as_documented(sandbox_client, chain, scenario):
	client, _, key, _ = sandbox_client
	extra = {"known_counterparties": [W[chain]["clean"]]} if scenario["wallet"] == "lookalike" else {}
	r = _evaluate(client, key, chain, W[chain][scenario["wallet"]], **extra)
	assert r.status_code == 200, r.text
	body = r.json()
	assert body["recommended_action"] == scenario["expect"]
	assert {f["code"] for f in body["risk_flags"]} == set(scenario["flags"])


def test_sandbox_is_free_isolated_and_sandbox_signed(sandbox_client):
	client, live_key, key, sessions = sandbox_client
	for _ in range(3):
		assert _evaluate(client, key, "tron", W["tron"]["clean"]).status_code == 200
	r = _evaluate(client, key, "tron", W["tron"]["sanctioned"])
	intent_id = r.json()["intent_id"]

	async def _state():
		async with sessions() as db:
			usage = (await db.execute(select(func.count(UsageEvent.id)))).scalar_one()
			decision = await db.get(Decision, intent_id)
			return usage, decision

	usage, decision = _run(client, _state)
	assert usage == 0  # nothing metered or charged
	assert decision.account_id == sandbox.account_id("client-1") and len(decision.account_id) <= 36
	assert decision.record["environment"] == "sandbox"
	assert verify(sandbox_signer().public_key_hex, decision.record_hash, decision.signature)
	assert not verify(signer().public_key_hex, decision.record_hash, decision.signature)

	# The live key can't see sandbox decisions, and sandbox keys can't see live ones.
	assert client.get(f"/v1/decisions/{intent_id}", headers={"X-API-Key": live_key}).status_code == 404
	bundle = client.get(f"/v1/decisions/{intent_id}", headers={"X-API-Key": key}).json()
	assert bundle["proof_status"].startswith("sandbox") and bundle["signature"]["public_key"] == sandbox_signer().public_key_hex
	chain_data.set_adapter("tron", FakeTron())  # live checks use the (fake) live chain source
	live = client.post("/v1/actions/evaluate", json={"chain": "tron", "intent_type": "p2p_trade", "counterparty": {"wallet_address": W["tron"]["clean"]}}, headers={"X-API-Key": live_key})
	assert live.status_code == 200
	assert client.get(f"/v1/decisions/{live.json()['intent_id']}", headers={"X-API-Key": key}).status_code == 404

	async def _seal():
		async with sessions() as db:
			batch = await seal_batch(db, force=True)
			return batch.leaf_count if batch else 0

	assert _run(client, _seal) == 1  # only the live decision is batched for Bitcoin


def test_sandbox_outcomes_stay_in_the_sandbox(sandbox_client):
	client, live_key, key, _ = sandbox_client
	wallet = W["tron"]["clean"]
	r = client.post("/v1/outcomes", json={"chain": "tron", "wallet_address": wallet, "outcome": "fraud_confirmed"}, headers={"X-API-Key": key})
	assert r.status_code == 201
	assert _evaluate(client, key, "tron", wallet).json()["recommended_action"] != "release"
	chain_data.set_adapter("tron", FakeTron())
	live = client.post("/v1/actions/evaluate", json={"chain": "tron", "intent_type": "p2p_trade", "counterparty": {"wallet_address": wallet}}, headers={"X-API-Key": live_key})
	assert "fraud" not in str(live.json()["risk_flags"]).lower()


def test_sandbox_attestations_use_a_signer_live_contracts_reject(sandbox_client):
	client, _, key, _ = sandbox_client
	intent_id = _evaluate(client, key, "tron", W["tron"]["clean"]).json()["intent_id"]
	body = {"target": "evm", "chain_id": 728126428, "verifying_contract": "0x" + "ab" * 20, "amount_base_units": 250_000_000}
	r = client.post(f"/v1/decisions/{intent_id}/attestation", json=body, headers={"X-API-Key": key})
	assert r.status_code == 201, r.text
	att = r.json()
	assert att["environment"] == "sandbox"
	assert att["signer"]["address"] == sandbox_attestation_signer().address != attestation_signer().address
	keys = client.get("/v1/proof/keys").json()
	assert keys["sandbox"]["attestation_signer"]["address"] == att["signer"]["address"]
	assert keys["attestation_signer"]["address"] != att["signer"]["address"]


def test_live_keys_are_refused_from_browsers(sandbox_client):
	client, live_key, key, _ = sandbox_client
	browser = {"Origin": "https://playground.provd.tech"}
	r = client.get("/v1/usage", headers={"X-API-Key": live_key, **browser})
	assert r.status_code == 403 and "browser" in r.json()["detail"]
	assert client.get("/v1/usage", headers={"X-API-Key": live_key}).status_code == 200  # server-to-server
	sandbox_usage = client.get("/v1/usage", headers={"X-API-Key": key, **browser})
	assert sandbox_usage.status_code == 200 and sandbox_usage.json()["environment"] == "sandbox"


def test_billing_is_unavailable_in_the_sandbox(sandbox_client):
	client, _, key, _ = sandbox_client
	assert client.post("/v1/topups", json={"bundle": "1k", "method": "usdt_tron"}, headers={"X-API-Key": key}).status_code == 403
	assert client.get("/v1/topups", headers={"X-API-Key": key}).status_code == 403


def test_reference_is_gated_and_complete(sandbox_client):
	client, _, key, _ = sandbox_client
	assert client.get("/v1/developer/reference").status_code == 401
	assert client.get("/v1/developer/reference", headers={"X-API-Key": "sbx_" + "x" * 40}).status_code == 401
	r = client.get("/v1/developer/reference", headers={"X-API-Key": key, "Origin": "https://playground.provd.tech"})
	assert r.status_code == 200
	body = r.json()
	paths = body["openapi"]["paths"]
	assert "/v1/actions/evaluate" in paths and "/v1/decisions/{intent_id}/attestation" in paths
	internal = ("/v1/admin", "/v1/keys", "/v1/auth", "/v1/clients", "/v1/developer", "/v1/webhooks")
	assert not any(p.startswith(internal) or "/admin/" in p for p in paths)  # internal routes stay out
	assert body["sandbox"]["chains"]["tron"]["clean"] == W["tron"]["clean"]


def test_sandbox_keys_have_their_own_rate_limit(make_client):  # noqa: F811
	client, _, sessions = make_client(SANDBOX_RATE_LIMIT_PER_MINUTE=2)
	key = "sbx_" + token_urlsafe(32)

	async def _add():
		async with sessions() as db:
			db.add(ApiKey(id="key-sbx2", client_id="client-1", name="s", prefix=key[:8], key_hash=sha256_hex(key), scopes=["actions:evaluate"], active=True, environment="sandbox"))
			await db.commit()

	client.portal.call(_add)
	codes = [client.get("/v1/usage", headers={"X-API-Key": key}).status_code for _ in range(3)]
	assert codes == [200, 200, 429]
