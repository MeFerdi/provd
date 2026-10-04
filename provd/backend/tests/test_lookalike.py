"""Lookalike (address-poisoning) detection and the Solana adapter. Address pairs are real lookalikes observed
on Solana mainnet (research/solana-measurement)."""
from datetime import timedelta
from decimal import Decimal

from app import indexer
from app.adapters.base import NormalizedHistory, NormalizedTransfer
from app.adapters.solana import SolanaAdapter, associated_token_account, validate_solana_address
from app.engine.lookalike import affix, dust_profile, find_lookalikes
from app.services import chain_data
from tests.test_rails_api import NOW, env, intent  # noqa: F401  (env is a fixture)

# Real pairs: a payee and the lookalike that dusted its payer minutes after a real payment.
PAYEE_STRONG, COPY_STRONG = "BccioknjFNVgdJxoyG88cygiC3stcdP75RsNdJTr53Hk", "BccirSk4iowUXWxA3WMRQstQGQz3CTEHchp4YDJZ53Hk"
PAYEE, COPY = "2rZawsWvqaJ7XfyYLUcWpWhtsRryfcF7RavqxNFs98Vm", "2rZZFTjjF9pTaPaNZDuxAVjTTNDq5K6V6mN89uQY98Vm"
OTHER = "H8sMJSCQxfKiFTCfDR3DUMLPwcRbM61LGFJ8N4dK3WjS"
VICTIMS = ["7nJtE8qvNvgHcw3HZ8BGMiL7z13vwNgxjgK77SNHdwns", "Gb9gSo2iWuHURrAerSSyiNJaHYP4wc4o6cgGf4y6QFtt", "3LdGNsxrvGsRE6oGcSALhqFguGEGocpnbhTfcEUvswGs"]


def t(src, dst, amount, asset="USDT_SPL", minutes=10):
	return NormalizedTransfer("solana", f"tx-{src[:4]}-{dst[:4]}-{amount}", NOW - timedelta(minutes=minutes), src, dst, asset, Decimal(str(amount)))


class FakeSolana:
	chain = "solana"

	def __init__(self):
		self.histories: dict[str, NormalizedHistory] = {}
		self.frozen: dict[str, str] = {}

	def validate_address(self, address):
		return validate_solana_address(address)

	async def counterparty_history(self, address):
		return self.histories.get(address, NormalizedHistory("solana", address, [t(OTHER, address, 250), t(address, OTHER, 100)], truncated=True))

	async def frozen_owners(self):
		return dict(self.frozen)

	async def fetch_events(self, cursor):
		return [], cursor

	async def asset_metadata(self, ref):
		return None


def sol(wallet, **kw):
	return intent(wallet, chain="solana", intent_type="payout", **kw)


# --- the detector -------------------------------------------------------------------------------------------

def test_affix_and_strength_on_real_pairs():
	assert affix(PAYEE_STRONG, COPY_STRONG) == (4, 4)
	assert affix(PAYEE, COPY) == (3, 4)
	[strong] = find_lookalikes(COPY_STRONG, {PAYEE_STRONG, OTHER}, "solana")
	assert strong.known == PAYEE_STRONG and strong.strength == "strong"
	[likely] = find_lookalikes(COPY, [PAYEE], "solana")
	assert likely.strength == "likely"
	assert find_lookalikes(PAYEE, {PAYEE}, "solana") == []  # paying the real payee is not a lookalike
	assert find_lookalikes(OTHER, {PAYEE, PAYEE_STRONG}, "solana") == []


def test_tron_fixed_prefix_is_not_evidence():
	real, fake = "TNXoiAJ3dct8Fjg4M9fkLFh9S2v9TXc32G", "TNXoiZZZZZZZZZZZZZZZZZZZZZZZZXc32G"
	[m] = find_lookalikes(fake, [real], "tron")
	assert (m.prefix, m.suffix) == (4, 5)  # "NXoi" after the shared "T", and "Xc32G"
	assert find_lookalikes("TAAAZZZZZZZZZZZZZZZZZZZZZZZZZXc32G", [real], "tron") == []  # only "T" + suffix


def test_dust_profile():
	bot = dust_profile(COPY, [t(COPY, v, "0.0001") for v in VICTIMS] + [t(COPY, VICTIMS[0], "0.000001", asset="SOL")])
	assert bot.looks_like_poisoner and bot.recipients == 3
	person = dust_profile(PAYEE, [t(OTHER, PAYEE, 300), t(PAYEE, VICTIMS[0], "0.001")])
	assert not person.looks_like_poisoner


# --- the Solana adapter -------------------------------------------------------------------------------------

def test_associated_token_accounts_match_mainnet():
	# Verified against getTokenAccountsByOwner on mainnet.
	assert associated_token_account(PAYEE, "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v") == "DWm8Zef9dQpQUSCASqyLKmjpJQnxabWKidUAtMuZCiFJ"
	assert associated_token_account(OTHER, "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB") == "5WKb9eZnbevTR5Qc12s3E5mZ6WazbUiTGMrHsUwfiySW"


def test_parse_token_and_sol_transfers():
	usdt = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"
	tx = {
		"blockTime": int(NOW.timestamp()),
		"meta": {
			"preTokenBalances": [
				{"mint": usdt, "owner": COPY, "uiTokenAmount": {"uiAmountString": "5"}},
				{"mint": usdt, "owner": PAYEE, "uiTokenAmount": {"uiAmountString": "10"}},
			],
			"postTokenBalances": [
				{"mint": usdt, "owner": COPY, "uiTokenAmount": {"uiAmountString": "4.9999"}},
				{"mint": usdt, "owner": PAYEE, "uiTokenAmount": {"uiAmountString": "10.0001"}},
			],
			"innerInstructions": [],
		},
		"transaction": {"message": {"instructions": [
			{"program": "system", "parsed": {"type": "transfer", "info": {"source": COPY, "destination": PAYEE, "lamports": 1000}}},
		]}},
	}
	history = NormalizedHistory("solana", PAYEE)
	SolanaAdapter("http://rpc", "http://rpc")._parse(PAYEE, "sig1", tx, history)
	[token] = history.transfers
	assert (token.from_address, token.to_address, token.asset, token.amount) == (COPY, PAYEE, "USDT_SPL", Decimal("0.0001"))
	[native] = history.native_transfers
	assert native.asset == "SOL" and native.amount == Decimal("0.000001")


# --- scoring through the API --------------------------------------------------------------------------------

def test_learns_payees_from_released_checks_and_rejects_their_lookalike(env, monkeypatch):  # noqa: F811
	from app.config import get_settings

	client, *_ = env
	monkeypatch.setenv("FREE_MONTHLY_CHECKS", "50")
	get_settings.cache_clear()
	chain_data.set_adapter("solana", FakeSolana())
	try:
		first = client.post("/v1/actions/evaluate", json=sol(PAYEE_STRONG)).json()
		assert first["recommended_action"] == "release"
		attack = client.post("/v1/actions/evaluate", json=sol(COPY_STRONG)).json()
		assert attack["recommended_action"] == "reject"
		flag = next(f for f in attack["risk_flags"] if f["code"] == "LOOKALIKE_DESTINATION")
		assert flag["severity"] == "critical" and "Bcciok" in flag["reason"]
		# the rejected lookalike is never learned, so paying the real payee again stays clean
		again = client.post("/v1/actions/evaluate", json=sol(PAYEE_STRONG)).json()
		assert again["recommended_action"] == "release"
		assert not any(f["code"] == "LOOKALIKE_DESTINATION" for f in again["risk_flags"])
	finally:
		chain_data.set_adapter("solana", None)


def test_address_book_in_the_request_and_dust_bots(env):  # noqa: F811
	client, *_ = env
	fake = FakeSolana()
	fake.histories[COPY] = NormalizedHistory("solana", COPY, [t(COPY, v, "0.0001") for v in VICTIMS], truncated=True)
	chain_data.set_adapter("solana", fake)
	try:
		book = client.post("/v1/actions/evaluate", json=sol(COPY, known_counterparties=[PAYEE, OTHER])).json()
		codes = {f["code"]: f["severity"] for f in book["risk_flags"]}
		assert codes["LOOKALIKE_DESTINATION"] == "high" and codes["DUST_SENDER"] == "high"
		assert book["recommended_action"] == "reject"  # 550 + 400
		bot_only = client.post("/v1/actions/evaluate", json=sol(COPY)).json()
		assert {f["code"] for f in bot_only["risk_flags"]} >= {"DUST_SENDER"} and bot_only["recommended_action"] in ("manual_review", "hold")
		assert client.post("/v1/actions/evaluate", json=sol(COPY, known_counterparties=["not an address!"])).status_code == 422
	finally:
		chain_data.set_adapter("solana", None)


def test_tron_known_payee_is_not_a_lookalike(env):  # noqa: F811
	# A valid Tron lookalike can't be built in a test without vanity-address brute force (checksums); the
	# detector's Tron handling is covered by test_tron_fixed_prefix_is_not_evidence. Here: no false positive.
	client, *_ = env
	real = "TNXoiAJ3dct8Fjg4M9fkLFh9S2v9TXc32G"
	r = client.post("/v1/actions/evaluate", json=intent(real, intent_type="payout", known_counterparties=[real, "TJ7E73Hs7aeeLDFMmySj9MGhXNronC6qc9"])).json()
	assert not any(f["code"] == "LOOKALIKE_DESTINATION" for f in r["risk_flags"])
	signal = next(e for e in r["explainability"] if e["signal"] == "lookalike_destination")
	assert signal["contribution"] == 0


def test_public_lookalike_endpoint(env):  # noqa: F811
	client, *_ = env
	fake = FakeSolana()
	fake.histories[COPY] = NormalizedHistory("solana", COPY, [t(COPY, v, "0.0001") for v in VICTIMS], truncated=True)
	chain_data.set_adapter("solana", fake)
	try:
		hit = client.post("/v1/lookalike", json={"chain": "solana", "address": COPY, "known": [PAYEE, OTHER]}).json()
		assert hit["verdict"] == "lookalike" and hit["lookalike_of"] == [{"address": PAYEE, "prefix": 3, "suffix": 4}]
		assert hit["dust_sender"] is True and hit["risk_level"] == "high"
		clean = client.post("/v1/lookalike", json={"chain": "solana", "address": OTHER, "known": [PAYEE]}).json()
		assert clean["verdict"] == "no_match" and clean["risk_level"] == "low"
		assert client.post("/v1/lookalike", json={"chain": "solana", "address": "nope", "known": []}).status_code == 422
	finally:
		chain_data.set_adapter("solana", None)


def test_solana_frozen_snapshot_feeds_the_risk_list(env):  # noqa: F811
	client, tron, who, sessions, portal = env
	fake = FakeSolana()
	fake.frozen = {OTHER: "tether_usdt_freeze_solana"}
	chain_data.set_adapter("solana", fake)
	try:
		async def sync(force=True):
			async with sessions() as db:
				return await indexer.sync_solana_frozen(db, force=force)

		assert portal.call(sync) == (1, 0)
		assert portal.call(sync, False) == (0, 0)  # hourly: skipped
		frozen = client.post("/v1/actions/evaluate", json=sol(OTHER)).json()
		assert frozen["recommended_action"] == "reject" and frozen["risk_flags"][0]["code"] == "CP_ADDRESS_FROZEN"
		fake.frozen = {}
		assert portal.call(sync) == (0, 1)  # unfrozen
	finally:
		chain_data.set_adapter("solana", None)
