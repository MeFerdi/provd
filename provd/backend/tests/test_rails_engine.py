from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest

from app.adapters.base import NormalizedAsset, NormalizedHistory, NormalizedTransfer
from app.adapters.tron import b58check_encode, hex_to_tron, validate_tron_address
from app.adapters.base import InvalidAddress
from app.engine.scoring import canonical_json, evaluate, record_hash
from app.engine.signals import OutcomeView, SignalContext

NOW = datetime(2026, 10, 3, 12, tzinfo=timezone.utc)
ME = "TJ7E73Hs7aeeLDFMmySj9MGhXNronC6qc9"


def transfer(peer: str, amount: str, incoming: bool = True, days_ago: int = 30, i: int = 0) -> NormalizedTransfer:
	frm, to = (peer, ME) if incoming else (ME, peer)
	return NormalizedTransfer("tron", f"tx{peer}{i}", NOW - timedelta(days=days_ago), frm, to, "USDT_TRC20", Decimal(amount))


def ctx(**kw) -> SignalContext:
	base = dict(intent_type="p2p_trade", wallet=ME, now=NOW)
	base.update(kw)
	return SignalContext(**base)


def codes(evaluation) -> list[str]:
	return [f.code for f in evaluation.flags]


def test_frozen_counterparty_is_rejected():
	e = evaluate(ctx(history=NormalizedHistory("tron", ME), public_flags={ME: "tether_usdt_freeze"}))
	assert (e.score, e.risk_level, e.recommended_action) == (1000, "critical", "reject")
	assert codes(e) == ["CP_ADDRESS_FROZEN"]


def test_direct_exposure_holds_with_volume_share():
	history = NormalizedHistory("tron", ME, [transfer("BAD1", "100"), transfer("OK1", "900")])
	e = evaluate(ctx(history=history, public_flags={"BAD1": "tether_usdt_freeze"}))
	assert e.recommended_action == "hold" and e.risk_level == "high"
	assert "10% of recent USDT volume" in e.flags[0].reason


def test_incidental_exposure_for_high_traffic_wallets_is_medium():
	transfers = [transfer(f"PEER{i}", "1000", i=i) for i in range(60)] + [transfer("BAD1", "1")]
	e = evaluate(ctx(history=NormalizedHistory("tron", ME, transfers), public_flags={"BAD1": "x"}))
	assert codes(e) == ["CP_INCIDENTAL_EXPOSURE"]
	assert e.recommended_action == "release" and e.score == 120


def test_clean_established_wallet_is_released():
	history = NormalizedHistory("tron", ME, [transfer(f"P{i}", "50", i=i) for i in range(20)])
	e = evaluate(ctx(history=history))
	assert (e.score, e.recommended_action) == (0, "release")


def test_new_wallet_and_no_history_flags():
	new = NormalizedHistory("tron", ME, [transfer("P1", "10", days_ago=1)])
	assert "CP_NEW_WALLET" in codes(evaluate(ctx(history=new)))
	assert "CP_NO_HISTORY" in codes(evaluate(ctx(history=NormalizedHistory("tron", ME))))


def test_chain_outage_degrades_with_coverage_flag():
	e = evaluate(ctx(history=None, history_error="TronGrid request failed: ReadTimeout"))
	assert "REDUCED_SIGNAL_COVERAGE" in codes(e)
	assert e.coverage["counterparty_graph"] == "partial"
	assert e.recommended_action == "release"


def test_own_reversal_and_fraud_history():
	two_reversals = [OutcomeView("reversed", NOW - timedelta(days=3)), OutcomeView("chargeback", NOW - timedelta(days=10))]
	e = evaluate(ctx(history=NormalizedHistory("tron", ME, [transfer("P", "5")]), own_outcomes=two_reversals))
	assert "OWN_REVERSAL_HISTORY" in codes(e) and e.recommended_action == "hold"
	fraud = evaluate(ctx(history=None, own_outcomes=[OutcomeView("fake_confirmation", NOW - timedelta(days=1))]))
	assert fraud.recommended_action == "reject"
	old = evaluate(ctx(history=NormalizedHistory("tron", ME, [transfer("P", "5")]), own_outcomes=[OutcomeView("reversed", NOW - timedelta(days=400))]))
	assert "OWN_REVERSAL_HISTORY" not in codes(old)


def test_established_counterparty_lowers_score():
	new_wallet = NormalizedHistory("tron", ME, [transfer("P", "10", days_ago=1)])
	completed = [OutcomeView("completed", NOW - timedelta(days=i)) for i in range(12)]
	assert evaluate(ctx(history=new_wallet)).score == 150
	assert evaluate(ctx(history=new_wallet, own_outcomes=completed)).score == 50


def test_platform_flagged_exposure():
	history = NormalizedHistory("tron", ME, [transfer("SCAMMER", "50"), transfer("P", "50")])
	e = evaluate(ctx(history=history, platform_flagged={"SCAMMER"}))
	assert "CP_PLATFORM_FLAGGED_EXPOSURE" in codes(e)


def test_token_safety_runs_for_ramp_only_and_degrades():
	usdt = NormalizedAsset("tron", "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t", "USDT", 6, "Tether", well_known=True)
	ramp = evaluate(ctx(intent_type="ramp_conversion", history=NormalizedHistory("tron", ME, [transfer("P", "1")]), asset=usdt, asset_ref="USDT_TRC20"))
	assert ramp.coverage["token_safety"] == "full"
	p2p = evaluate(ctx(history=NormalizedHistory("tron", ME, [transfer("P", "1")])))
	assert "token_safety" not in [r.name for r in p2p.results]
	unknown = evaluate(ctx(intent_type="ramp_conversion", history=None, asset_ref="TXYZ", token_error="GoPlus unavailable"))
	assert unknown.coverage["token_safety"] == "none"
	honeypot = evaluate(ctx(intent_type="ramp_conversion", history=NormalizedHistory("tron", ME, [transfer("P", "1")]), asset_ref="TXYZ", token_report={"is_honeypot": "1"}))
	assert "TOKEN_HONEYPOT" in codes(honeypot) and honeypot.recommended_action == "reject"


def test_planned_signals_are_reported_as_not_implemented():
	e = evaluate(ctx(history=None))
	assert e.coverage["amount_pattern"] == "not_implemented"
	assert e.coverage["asset_backing"] == "not_implemented"


def test_canonical_hash_is_order_independent():
	a = {"b": 1, "a": {"y": Decimal("1.50"), "x": NOW}}
	b = {"a": {"x": NOW, "y": Decimal("1.50")}, "b": 1}
	assert canonical_json(a) == canonical_json(b) and record_hash(a) == record_hash(b)


def test_tron_address_codec():
	assert validate_tron_address("TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t")
	assert hex_to_tron("0x9da365124691445493846f529d4c4a2790fc0218") == "TQLiq3fj6CCK1aZCJuXfxVZUwy6gSB4qxi"
	# a body that itself starts with "41" must not be stripped
	body = "41" + "ab" * 19
	assert hex_to_tron("0x" + body) == b58check_encode(bytes.fromhex("41" + body))
	for bad in ("TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6x", "0x123", "hello"):
		with pytest.raises(InvalidAddress):
			validate_tron_address(bad)
