"""Signals: each turns normalized inputs into a contribution (risk points), flags and reasons.

Signals import only normalized types (app.adapters.base); never chain-specific code.
"""
from dataclasses import dataclass, field
from datetime import datetime, timedelta

from app.adapters.base import NormalizedAsset, NormalizedHistory

BAD_OUTCOMES = {"fraud_confirmed", "fake_confirmation"}
INCIDENTAL_SHARE = 0.01  # <1% of volume …
INCIDENTAL_MIN_COUNTERPARTIES = 50  # … spread across many counterparties
REVERSAL_OUTCOMES = {"reversed", "refunded", "chargeback"}


@dataclass
class OutcomeView:
	outcome: str
	occurred_at: datetime


@dataclass
class SignalContext:
	intent_type: str
	wallet: str | None
	now: datetime
	history: NormalizedHistory | None = None
	history_error: str | None = None
	public_flags: dict[str, str] = field(default_factory=dict)  # address -> source, for the wallet + its counterparties
	platform_flagged: set[str] = field(default_factory=set)  # wallets this platform confirmed as fraudulent
	own_outcomes: list[OutcomeView] = field(default_factory=list)  # this platform's outcomes for this counterparty
	recent_decisions_24h: int = 0
	asset: NormalizedAsset | None = None
	asset_ref: str | None = None
	token_report: dict | None = None
	token_error: str | None = None


@dataclass
class Flag:
	code: str
	severity: str
	reason: str


@dataclass
class SignalResult:
	name: str
	coverage: str  # full | partial | none | not_implemented
	contribution: int = 0
	value: float | str | None = None
	reason: str = ""
	flags: list[Flag] = field(default_factory=list)
	source_refs: list[str] = field(default_factory=list)


def _pct(part, whole) -> str:
	return f"{(100 * part / whole):.0f}%" if whole else "0%"


def counterparty_graph(ctx: SignalContext) -> SignalResult:
	result = SignalResult(name="counterparty_graph", coverage="full")
	wallet = ctx.wallet
	if not wallet:
		result.coverage = "none"
		result.reason = "No counterparty wallet supplied."
		return result

	if wallet in ctx.public_flags:
		source = ctx.public_flags[wallet]
		result.contribution = 1000
		result.value = "address_flagged"
		result.reason = f"The counterparty wallet itself is on a public risk list ({source})."
		result.flags.append(Flag("CP_ADDRESS_FROZEN", "critical", result.reason))
		result.source_refs.append(source)
		return result

	if ctx.history is None:
		result.coverage = "partial"
		result.reason = "On-chain history unavailable; scored on the public risk list only."
		result.flags.append(Flag("REDUCED_SIGNAL_COVERAGE", "info", f"Chain data unavailable ({ctx.history_error or 'unknown'})."))
		return result

	history = ctx.history
	if not history.transfers:
		result.contribution = 120
		result.value = 0
		result.reason = "No USDT transfers found for this wallet."
		result.flags.append(Flag("CP_NO_HISTORY", "low", result.reason))
		return result

	total_volume = sum((t.amount for t in history.transfers), 0)
	frozen_peers = {cp for cp in history.counterparties if cp in ctx.public_flags}
	platform_peers = {cp for cp in history.counterparties if cp in ctx.platform_flagged}
	frozen_txs = [t for t in history.transfers if (t.from_address in frozen_peers or t.to_address in frozen_peers)]
	frozen_volume = sum((t.amount for t in frozen_txs), 0)
	points = 0
	reasons = []

	if frozen_peers:
		share = (frozen_volume / total_volume) if total_volume else 0
		msg = (
			f"Transacted directly with {len(frozen_peers)} wallet(s) on a public risk list "
			f"({_pct(frozen_volume, total_volume)} of recent USDT volume)."
		)
		if share < INCIDENTAL_SHARE and len(history.counterparties) >= INCIDENTAL_MIN_COUNTERPARTIES:
			# High-traffic wallets (exchanges, payment processors) touch listed wallets incidentally.
			points += 120
			msg += " Small share across many counterparties: likely incidental."
			result.flags.append(Flag("CP_INCIDENTAL_EXPOSURE", "medium", msg))
		else:
			points += min(650, 300 + 120 * (len(frozen_peers) - 1))
			result.flags.append(Flag("CP_FLAGGED_EXPOSURE", "high", msg))
		reasons.append(msg)
		result.source_refs += [t.tx_hash for t in frozen_txs[:5]]
	if platform_peers:
		points += min(400, 200 + 100 * (len(platform_peers) - 1))
		msg = f"Transacted with {len(platform_peers)} wallet(s) you previously confirmed as fraudulent."
		reasons.append(msg)
		result.flags.append(Flag("CP_PLATFORM_FLAGGED_EXPOSURE", "high", msg))

	first_seen = history.first_seen
	if first_seen and not history.truncated and (ctx.now - first_seen) < timedelta(days=7) and len(history.transfers) < 5:
		points += 150
		msg = f"New wallet: first USDT activity {max((ctx.now - first_seen).days, 0)} day(s) ago, {len(history.transfers)} transfer(s)."
		reasons.append(msg)
		result.flags.append(Flag("CP_NEW_WALLET", "low", msg))

	result.contribution = min(points, 1000)
	result.value = len(frozen_peers)
	coverage_note = " (most recent transfers only)" if history.truncated else ""
	result.reason = " ".join(reasons) or (
		f"No exposure to listed wallets across {len(history.transfers)} recent transfers{coverage_note}."
	)
	if history.truncated:
		result.coverage = "partial"
	return result


def reversal_behavior(ctx: SignalContext) -> SignalResult:
	result = SignalResult(name="reversal_behavior", coverage="full")
	window = ctx.now - timedelta(days=180)
	recent = [o for o in ctx.own_outcomes if o.occurred_at >= window]
	bad = [o for o in recent if o.outcome in BAD_OUTCOMES]
	reversals = [o for o in recent if o.outcome in REVERSAL_OUTCOMES]
	completed = [o for o in recent if o.outcome == "completed"]
	points = 0
	reasons = []

	if bad:
		points += 900
		msg = f"You confirmed fraud or a fake payment confirmation from this counterparty {len(bad)} time(s) in 180 days."
		reasons.append(msg)
		result.flags.append(Flag("OWN_FRAUD_HISTORY", "critical", msg))
	if reversals:
		points += min(700, 300 + 150 * (len(reversals) - 1))
		msg = f"{len(reversals)} reversal/refund/chargeback(s) from this counterparty in 180 days."
		reasons.append(msg)
		result.flags.append(Flag("OWN_REVERSAL_HISTORY", "high" if len(reversals) >= 2 else "medium", msg))
	if ctx.recent_decisions_24h >= 5:
		points += 150
		msg = f"{ctx.recent_decisions_24h} checks for this counterparty in the last 24 hours."
		reasons.append(msg)
		result.flags.append(Flag("VELOCITY_SPIKE", "medium", msg))
	if not bad and not reversals and len(completed) >= 10:
		points -= 100
		reasons.append(f"Established counterparty: {len(completed)} completed trades with you and no reversals in 180 days.")

	result.contribution = points
	result.value = len(reversals) + len(bad)
	if not ctx.own_outcomes:
		result.coverage = "partial"
		result.reason = "No outcomes reported for this counterparty yet; report outcomes to sharpen this signal."
	else:
		result.reason = " ".join(reasons) or f"{len(recent)} outcome(s) on record, none adverse."
	return result


_TOKEN_RISK_KEYS = {
	"is_honeypot": ("TOKEN_HONEYPOT", "critical", "Token flagged as a honeypot."),
	"is_blacklisted": ("TOKEN_BLACKLIST_FUNCTION", "medium", "Token contract can blacklist holders."),
	"is_mintable": ("TOKEN_MINTABLE", "low", "Token supply can be minted by its owner."),
	"transfer_pausable": ("TOKEN_PAUSABLE", "medium", "Token transfers can be paused."),
}


def token_safety(ctx: SignalContext) -> SignalResult:
	result = SignalResult(name="token_safety", coverage="full")
	if ctx.asset and ctx.asset.well_known:
		result.reason = f"{ctx.asset.symbol} issued by {ctx.asset.issuer}: a well-known asset."
		result.value = "well_known"
		return result
	if not ctx.asset_ref:
		result.coverage = "none"
		result.reason = "No asset supplied."
		return result
	if ctx.token_report is None:
		result.coverage = "none"
		result.reason = "Token security data unavailable."
		result.flags.append(Flag("REDUCED_SIGNAL_COVERAGE", "info", f"Token data unavailable ({ctx.token_error or 'unknown'})."))
		return result
	points = 0
	for key, (code, severity, reason) in _TOKEN_RISK_KEYS.items():
		if str(ctx.token_report.get(key, "0")) == "1":
			result.flags.append(Flag(code, severity, reason))
			points += {"critical": 900, "high": 400, "medium": 200, "low": 80}[severity]
	result.contribution = min(points, 1000)
	result.value = len(result.flags)
	result.reason = " ".join(f.reason for f in result.flags) or "No token-contract risks reported."
	result.source_refs.append("goplus_token_security")
	return result


def not_implemented(name: str):
	def _signal(_ctx: SignalContext) -> SignalResult:
		return SignalResult(name=name, coverage="not_implemented")

	return _signal


REGISTRY = {
	"counterparty_graph": counterparty_graph,
	"reversal_behavior": reversal_behavior,
	"token_safety": token_safety,
	"account_takeover_proxies": not_implemented("account_takeover_proxies"),
	"float_and_timing": not_implemented("float_and_timing"),
	"amount_pattern": not_implemented("amount_pattern"),
	"asset_backing": not_implemented("asset_backing"),
	"venue_risk": not_implemented("venue_risk"),
}
