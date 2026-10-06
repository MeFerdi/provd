"""Compliance evidence packs: coverage, exceptions, STR drafts, signatures, record export and access control."""
import hashlib
import json
from datetime import date, datetime, timedelta, timezone

from app.engine.scoring import canonical_json
from app.models.rails import FlaggedAddress
from app.proof.signing import verify
from tests.test_rails_api import CLEAN, EXPOSED, FROZEN
from tests.test_security import ADMIN_ID, ADMIN_SECRET, make_client  # noqa: F401  (fixture)


def _score(client, key, wallet, intent_id, amount="250"):
	r = client.post(
		"/v1/actions/evaluate",
		json={"intent_id": intent_id, "chain": "tron", "intent_type": "payout", "counterparty": {"wallet_address": wallet}, "amounts": {"crypto": amount}},
		headers={"X-API-Key": key},
	)
	assert r.status_code == 200, r.text
	return r.json()


def _setup(make_client):  # noqa: F811
	client, key, sessions = make_client()

	async def _freeze():
		async with sessions() as db:
			db.add(FlaggedAddress(chain="tron", address=FROZEN, source="tether_usdt_freeze", flagged_at=datetime.now(timezone.utc), active=True))
			await db.commit()

	client.portal.call(_freeze)
	_score(client, key, CLEAN, "po-1")
	_score(client, key, FROZEN, "po-2")
	_score(client, key, EXPOSED, "po-3")
	_score(client, key, CLEAN, "po-4", amount="900")
	# The platform later confirms po-4, which was released, as fraud.
	assert client.post("/v1/outcomes", json={"intent_id": "po-4", "outcome": "fraud_confirmed"}, headers={"X-API-Key": key}).status_code == 201
	return client, key


def test_pack_covers_screening_exceptions_and_drafts(make_client):  # noqa: F811
	client, key = _setup(make_client)
	pack = client.get("/v1/evidence", headers={"X-API-Key": key}).json()
	cov = pack["coverage"]
	assert cov["checks"] == 4 and cov["signed"] == 4 and cov["by_chain"] == {"tron": 4}
	assert cov["volume_by_asset"]["CRYPTO"] == 1650.0 or sum(cov["volume_by_asset"].values()) == 1650.0
	assert pack["environment"] == "live" and pack["period"]["to"] == date.today().isoformat()

	actions = {x["intent_id"]: x["action"] for x in pack["exceptions"]}
	assert actions["po-2"] == "reject" and "po-1" not in actions
	drafts = {s["supporting_evidence"]["intent_id"]: s for s in pack["str_drafts"]}
	assert set(drafts) == {"po-2", "po-4"}  # critical reject, and confirmed fraud after release
	assert "frozen" in drafts["po-2"]["grounds_for_suspicion"].lower() and drafts["po-2"]["status"].startswith("DRAFT")
	assert drafts["po-4"]["outcome_reported"] == "fraud_confirmed" and "confirmed this transaction as fraud" in drafts["po-4"]["grounds_for_suspicion"]
	assert "OUTCOME_FRAUD_CONFIRMED" in drafts["po-4"]["indicators"]
	assert drafts["po-2"]["transaction"]["transaction_hash"] is None and drafts["po-2"]["subject"]["name"] is None  # left for the officer

	obligations = {o["key"]: o for o in pack["obligations"]}
	assert set(obligations) == {"sanctions", "monitoring", "reporting", "records"}
	assert "FATF" in pack["framework"]["name"] and "FATF R.20" in obligations["reporting"]["source"]
	kenya = client.get("/v1/evidence", params={"framework": "kenya"}, headers={"X-API-Key": key}).json()
	assert "Kenya" in kenya["framework"]["name"] and "goAML" in {o["key"]: o for o in kenya["obligations"]}["reporting"]["source"]


def test_pack_signature_verifies_and_detects_edits(make_client):  # noqa: F811
	client, key = _setup(make_client)
	pack = client.get("/v1/evidence", headers={"X-API-Key": key}).json()
	sig = pack.pop("signature")
	digest = hashlib.sha256(canonical_json(pack).encode()).hexdigest()
	assert digest == sig["sha256"] and verify(sig["public_key"], digest, sig["value"])
	pack["coverage"]["checks"] = 3  # someone edits the pack
	assert hashlib.sha256(canonical_json(pack).encode()).hexdigest() != sig["sha256"]


def test_html_report_downloads_and_escapes(make_client):  # noqa: F811
	client, key = _setup(make_client)
	r = client.get("/v1/evidence", params={"format": "html"}, headers={"X-API-Key": key})
	assert r.status_code == 200 and r.headers["content-type"].startswith("text/html")
	assert "attachment" in r.headers["content-disposition"] and "provd-evidence-" in r.headers["content-disposition"]
	assert "Draft suspicious-transaction reports (2)" in r.text and "<script" not in r.text


def test_records_export_streams_every_verifiable_record(make_client):  # noqa: F811
	client, key = _setup(make_client)
	r = client.get("/v1/evidence/records", headers={"X-API-Key": key})
	assert r.status_code == 200 and r.headers["content-type"].startswith("application/x-ndjson")
	lines = [json.loads(line) for line in r.text.splitlines()]
	assert [x["intent_id"] for x in lines] == ["po-1", "po-2", "po-3", "po-4"]
	for x in lines:
		assert hashlib.sha256(canonical_json(x["record"]).encode()).hexdigest() == x["record_hash"]
		assert verify(x["signature"]["public_key"], x["record_hash"], x["signature"]["value"])


def test_periods_are_validated(make_client):  # noqa: F811
	client, key = _setup(make_client)
	h = {"X-API-Key": key}
	today = date.today()
	assert client.get("/v1/evidence", params={"from": today.isoformat(), "to": (today - timedelta(days=1)).isoformat()}, headers=h).status_code == 422
	assert client.get("/v1/evidence", params={"from": (today - timedelta(days=500)).isoformat()}, headers=h).status_code == 422
	assert client.get("/v1/evidence", params={"framework": "mars"}, headers=h).status_code == 422
	old = client.get("/v1/evidence", params={"from": "2025-01-01", "to": "2025-01-31"}, headers=h).json()
	assert old["coverage"]["checks"] == 0 and old["str_drafts"] == []


def test_packs_only_show_your_own_account_and_admins_can_build_any(make_client):  # noqa: F811
	client, key = _setup(make_client)
	assert client.get("/v1/evidence").status_code == 401
	token = client.post("/v1/auth/token", json={"client_id": ADMIN_ID, "client_secret": ADMIN_SECRET}).json()["access_token"]
	admin = {"Authorization": f"Bearer {token}"}
	assert client.get("/v1/admin/accounts/client-1/evidence", headers={"X-API-Key": key}).status_code == 403
	pilot = client.get("/v1/admin/accounts/client-1/evidence", headers=admin).json()
	assert pilot["coverage"]["checks"] == 4
	assert client.get("/v1/admin/accounts/someone-else/evidence", headers=admin).json()["coverage"]["checks"] == 0


def test_kyc_reference_links_checks_to_the_customer_file_without_personal_data(make_client):  # noqa: F811
	client, key = _setup(make_client)
	h = {"X-API-Key": key}
	body = {
		"intent_id": "po-9", "chain": "tron", "intent_type": "payout", "counterparty": {"wallet_address": FROZEN},
		"customer": {"kyc_provider": "smile_id", "kyc_reference": "job-8812", "verification_level": "full"},
	}
	assert client.post("/v1/actions/evaluate", json=body, headers=h).status_code == 200
	record = client.get("/v1/decisions/po-9", headers=h).json()["record"]
	assert record["intent"]["customer"] == {"kyc_provider": "smile_id", "kyc_reference": "job-8812", "verification_level": "full"}  # signed with the decision

	pack = client.get("/v1/evidence", headers=h).json()
	draft = next(s for s in pack["str_drafts"] if s["supporting_evidence"]["intent_id"] == "po-9")
	assert draft["subject"]["kyc_reference"] == "job-8812" and draft["subject"]["name"] is None
	assert any("KYC case job-8812 (smile_id)" in item for item in draft["to_complete"])
	assert next(x for x in pack["exceptions"] if x["intent_id"] == "po-9")["kyc_reference"] == "job-8812"
	assert "KYC case" in client.get("/v1/evidence", params={"format": "html"}, headers=h).text

	for personal in ("254712345678", "+254712345678", "jane@example.com", "Jane Doe"):
		bad = {**body, "intent_id": "po-x", "customer": {"kyc_reference": personal}}
		assert client.post("/v1/actions/evaluate", json=bad, headers=h).status_code == 422, personal
