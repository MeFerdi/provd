"""Self-serve sandbox keys: anyone can get one, it only works in the sandbox, and abuse is bounded."""
from sqlalchemy import func, select

from app.models.api_key import ApiKey
from app.models.client import DeveloperSignup
from app.services import sandbox
from tests.test_security import ADMIN_ID, ADMIN_SECRET, make_client  # noqa: F401  (fixture)

URL = "/v1/developer/sandbox-keys"


def _signup(client, email="Dev@Example.com", **extra):
	return client.post(URL, json={"email": email, "company": "Acme Payouts", **extra})


def test_signup_returns_a_working_sandbox_key(make_client):  # noqa: F811
	client, _, sessions = make_client()
	r = _signup(client)
	assert r.status_code == 201, r.text
	body = r.json()
	key = body["api_key"]
	assert key.startswith("sbx_") and body["environment"] == "sandbox" and "playground" in body["playground_url"]

	# The key opens the playground reference and scores test wallets, from a browser too.
	browser = {"X-API-Key": key, "Origin": "https://playground.provd.tech"}
	assert client.get("/v1/developer/reference", headers=browser).status_code == 200
	scored = client.post(
		"/v1/actions/evaluate",
		json={"chain": "tron", "intent_type": "p2p_trade", "counterparty": {"wallet_address": sandbox.WALLETS["tron"]["sanctioned"]}},
		headers=browser,
	)
	assert scored.status_code == 200 and scored.json()["recommended_action"] == "reject"
	# ...but it's a sandbox key: no billing.
	assert client.get("/v1/topups", headers=browser).status_code == 403

	async def _rows():
		async with sessions() as db:
			signup = (await db.execute(select(DeveloperSignup))).scalar_one()
			api_key = (await db.execute(select(ApiKey).where(ApiKey.client_id == signup.client_id))).scalar_one()
			return signup, api_key

	signup, api_key = client.portal.call(_rows)
	assert signup.email == "dev@example.com" and signup.company == "Acme Payouts"
	assert signup.ip_hash and "." not in signup.ip_hash and len(signup.ip_hash) == 32  # salted hash, never the raw IP
	assert api_key.environment == "sandbox" and api_key.scopes == ["actions:evaluate"]
	assert key not in str(vars(api_key))  # only the hash is stored


def test_signups_get_separate_accounts(make_client):  # noqa: F811
	client, *_ = make_client()
	first, second = _signup(client).json()["api_key"], _signup(client).json()["api_key"]
	wallet = sandbox.WALLETS["tron"]["clean"]
	made = client.post("/v1/actions/evaluate", json={"chain": "tron", "intent_type": "p2p_trade", "counterparty": {"wallet_address": wallet}}, headers={"X-API-Key": first})
	assert client.get(f"/v1/decisions/{made.json()['intent_id']}", headers={"X-API-Key": second}).status_code == 404


def test_honeypot_and_invalid_email_are_rejected(make_client):  # noqa: F811
	client, *_ = make_client()
	assert _signup(client, website="http://spam.example").status_code == 400
	assert client.post(URL, json={"email": "not-an-email"}).status_code == 422
	assert client.post(URL, json={"email": "a@b.co", "company": "x" * 151}).status_code == 422


def test_signups_are_limited_per_visitor_and_per_day(make_client):  # noqa: F811
	client, *_ = make_client(SIGNUP_PER_IP_PER_HOUR=2)
	assert [_signup(client).status_code for _ in range(3)] == [201, 201, 429]

	client, *_ = make_client(SIGNUP_DAILY_CAP=1, SIGNUP_PER_IP_PER_HOUR=10)
	assert _signup(client).status_code == 201
	capped = _signup(client)
	assert capped.status_code == 503 and "today" in capped.json()["detail"]


def test_signup_can_be_switched_off(make_client):  # noqa: F811
	client, _, sessions = make_client(SELF_SERVE_SIGNUP_ENABLED="false")
	assert _signup(client).status_code == 503

	async def _count():
		async with sessions() as db:
			return (await db.execute(select(func.count(DeveloperSignup.id)))).scalar_one()

	assert client.portal.call(_count) == 0


def test_only_admins_can_list_signups(make_client):  # noqa: F811
	client, live_key, _ = make_client()
	_signup(client, email="lead@desk.co")
	assert client.get("/v1/admin/signups").status_code == 401
	assert client.get("/v1/admin/signups", headers={"X-API-Key": live_key}).status_code == 403
	token = client.post("/v1/auth/token", json={"client_id": ADMIN_ID, "client_secret": ADMIN_SECRET}).json()["access_token"]
	rows = client.get("/v1/admin/signups", headers={"Authorization": f"Bearer {token}"}).json()
	assert [r["email"] for r in rows] == ["lead@desk.co"] and "ip_hash" not in rows[0]
