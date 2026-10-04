"""Signals: each turns normalized inputs into a contribution (risk points), flags and reasons.

Signals import only normalized types (app.adapters.base); never chain-specific code.
"""
from dataclasses import dataclass, field
from datetime import datetime, timedelta

from app.adapters.base import NormalizedAsset, NormalizedHistory
from app.engine.lookalike import FIXED_PREFIX, dust_profile, find_lookalikes, short

BAD_OUTCOMES = {"fraud_confirmed", "fake_confirmation"}
INCIDENTAL_SHARE = 0.01  # <1% of volume …
INCIDENTAL_MIN_COUNTERPARTIES = 50  # … spread across many counterparties
REVERSAL_OUTCOMES = {"reversed", "refunded", "chargeback"}


@dataclass
class OutcomeView:
	outcome: str
	occurred_at: datetime


@dataclass
class AmountView:
	value: float
	unit: str
	created_at: datetime


@dataclass
class SignalContext:
	intent_type: str
	wallet: str | None
	now: datetime
	chain: str = "tron"
	known_counterparties: set[str] = field(default_factory=set)  # addresses this platform used before + its address book
	amount: float | None = None
	amount_unit: str | None = None
	platform_amounts: list[float] = field(default_factory=list)  # this platform, same intent type + unit, 90 days
	counterparty_amounts: list[AmountView] = field(default_factory=list)  # this platform, this counterparty, same unit
	platform_hours: dict[int, int] = field(default_factory=dict)  # this platform's decisions by UTC hour, 90 days
	account_signals: dict[str, datetime] = field(default_factory=dict)
	account_signal_provider: str | None = None
	float_available: float | None = None
	history: NormalizedHistory | None = None
	history_error: str | None = None
	public_flags: dict[str, str] = field(default_factory=dict)  # address -> source, for the wallet + its counterparties
	flag_references: dict[str, str] = field(default_factory=dict)  # address -> reference (e.g. the sanctioned entity)
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

	if ctx.public_flags.get(wallet) == SANCTIONS:
		result.contribution = 1000
		result.value = "address_sanctioned"
		entity = ctx.flag_references.get(wallet, "")
		result.reason = "The counterparty wallet is on the US Treasury OFAC sanctions list" + (f" ({entity})." if entity else ".")
		result.flags.append(Flag("SANCTIONED_ADDRESS", "critical", result.reason))
		result.source_refs.append(SANCTIONS)
		return result

	if wallet in ctx.public_flags:
		source = ctx.public_flags[wallet]
		result.contribution = 1000
		result.value = "address_flagged"
		result.reason = f"The counterparty wallet itself is on a public risk list ({SOURCE_NAMES.get(source, source)})."
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
		result.reason = f"No {_stable(ctx)} transfers found for this wallet."
		result.flags.append(Flag("CP_NO_HISTORY", "low", result.reason))
		return result

	total_volume = sum((t.amount for t in history.transfers), 0)
	sanctioned_peers = {cp for cp in history.counterparties if ctx.public_flags.get(cp) == SANCTIONS}
	frozen_peers = {cp for cp in history.counterparties if cp in ctx.public_flags} - sanctioned_peers
	platform_peers = {cp for cp in history.counterparties if cp in ctx.platform_flagged}
	frozen_txs = [t for t in history.transfers if (t.from_address in frozen_peers or t.to_address in frozen_peers)]
	frozen_volume = sum((t.amount for t in frozen_txs), 0)
	points = 0
	reasons = []

	if sanctioned_peers:
		# Direct exposure to sanctioned addresses is never discounted as incidental.
		sanctioned_txs = [t for t in history.transfers if t.from_address in sanctioned_peers or t.to_address in sanctioned_peers]
		sanctioned_volume = sum((t.amount for t in sanctioned_txs), 0)
		entities = sorted({ctx.flag_references.get(cp, "").split(": ", 1)[-1] for cp in sanctioned_peers} - {""})
		msg = (
			f"Transacted directly with {len(sanctioned_peers)} address(es) on the US Treasury OFAC sanctions list "
			f"({_pct(sanctioned_volume, total_volume)} of recent {_stable(ctx)} volume)"
			+ (f": {', '.join(entities[:3])}." if entities else ".")
		)
		points += min(800, 550 + 150 * (len(sanctioned_peers) - 1))
		reasons.append(msg)
		result.flags.append(Flag("SANCTIONS_EXPOSURE", "high", msg))
		result.source_refs += [t.tx_hash for t in sanctioned_txs[:5]]

	if frozen_peers:
		share = (frozen_volume / total_volume) if total_volume else 0
		msg = (
			f"Transacted directly with {len(frozen_peers)} wallet(s) on a public risk list "
			f"({_pct(frozen_volume, total_volume)} of recent {_stable(ctx)} volume)."
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
		msg = f"New wallet: first {_stable(ctx)} activity {max((ctx.now - first_seen).days, 0)} day(s) ago, {len(history.transfers)} transfer(s)."
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


STRUCTURING_THRESHOLDS = {"USD": [1000, 10000], "USDT": [1000, 10000], "USDT_TRC20": [1000, 10000], "KES": [100000, 1000000], "NGN": [1000000, 5000000]}


def _percentile(values: list[float], q: float) -> float:
	ordered = sorted(values)
	index = min(len(ordered) - 1, max(0, round(q * (len(ordered) - 1))))
	return ordered[index]


def amount_pattern(ctx: SignalContext) -> SignalResult:
	result = SignalResult(name="amount_pattern", coverage="full")
	if ctx.amount is None:
		result.coverage = "none"
		result.reason = "No amount supplied."
		return result
	unit = ctx.amount_unit or ""
	points, reasons = 0, []
	previous = [a.value for a in ctx.counterparty_amounts]
	if len(previous) >= 3 and ctx.amount > 5 * max(previous):
		ratio = ctx.amount / max(previous)
		severity = "high" if ratio >= 20 else "medium"
		points += 400 if severity == "high" else 220
		msg = f"{ctx.amount:,.2f} {unit} is {ratio:.0f}x this counterparty's largest previous amount with you ({max(previous):,.2f})."
		reasons.append(msg)
		result.flags.append(Flag("AMOUNT_SPIKE", severity, msg))
	if len(ctx.platform_amounts) >= 30:
		p99 = _percentile(ctx.platform_amounts, 0.99)
		if ctx.amount > p99:
			points += 150
			msg = f"Larger than 99% of your {ctx.intent_type.replace('_', ' ')}s in {unit} over 90 days (p99 {p99:,.2f})."
			reasons.append(msg)
			result.flags.append(Flag("AMOUNT_ABOVE_PLATFORM_P99", "medium", msg))
	else:
		result.coverage = "partial"
	recent = [a for a in ctx.counterparty_amounts if (ctx.now - a.created_at).total_seconds() <= 86400] + [AmountView(ctx.amount, unit, ctx.now)]
	for threshold in STRUCTURING_THRESHOLDS.get(unit.upper(), []):
		near = [a for a in recent if 0.9 * threshold <= a.value < threshold]
		if len(near) >= 3:
			points += 450
			msg = f"{len(near)} amounts just under {threshold:,} {unit} for this counterparty in 24 hours (possible structuring)."
			reasons.append(msg)
			result.flags.append(Flag("AMOUNT_STRUCTURING", "high", msg))
			break
	result.contribution = min(points, 1000)
	result.value = ctx.amount
	result.reason = " ".join(reasons) or (
		"Amount is in line with this counterparty's history and your usual amounts."
		if result.coverage == "full" else "Amount checked against this counterparty's history; your platform baseline needs 30+ decisions."
	)
	return result


def float_and_timing(ctx: SignalContext) -> SignalResult:
	result = SignalResult(name="float_and_timing", coverage="full")
	points, reasons = 0, []
	if ctx.history and ctx.wallet and ctx.amount:
		window = [t for t in ctx.history.transfers if t.to_address == ctx.wallet and timedelta(0) <= ctx.now - t.timestamp <= timedelta(hours=1)]
		arrived = float(sum((t.amount for t in window), 0))
		if arrived and arrived >= 0.8 * ctx.amount:
			points += 300
			minutes = max(1, int(min((ctx.now - t.timestamp).total_seconds() for t in window) // 60))
			msg = f"{arrived:,.2f} {_stable(ctx)} arrived in this wallet in the last hour (latest {minutes} min ago) and covers this amount, a possible pass-through."
			reasons.append(msg)
			result.flags.append(Flag("RAPID_PASS_THROUGH", "high", msg))
			result.source_refs += [t.tx_hash for t in window[:5]]
	elif ctx.history is None:
		result.coverage = "partial"
	total = sum(ctx.platform_hours.values())
	if total >= 200:
		share = ctx.platform_hours.get(ctx.now.hour, 0) / total
		if share < 0.02:
			points += 80
			msg = f"Unusual time: only {share:.1%} of your checks happen at {ctx.now.hour:02d}:00 UTC."
			reasons.append(msg)
			result.flags.append(Flag("OFF_HOURS", "low", msg))
	if ctx.float_available is not None and ctx.amount is not None and ctx.float_available > 0 and ctx.amount > 0.5 * ctx.float_available:
		points += 150
		msg = f"This would use {ctx.amount / ctx.float_available:.0%} of your available float."
		reasons.append(msg)
		result.flags.append(Flag("FLOAT_STRAIN", "medium", msg))
	result.contribution = min(points, 1000)
	result.reason = " ".join(reasons) or "No timing or float concerns."
	return result


def account_takeover_proxies(ctx: SignalContext) -> SignalResult:
	result = SignalResult(name="account_takeover_proxies", coverage="full" if ctx.account_signals else "none")
	if not ctx.account_signals:
		result.reason = "No account signals supplied (send account_signals from your device or SIM-swap provider)."
		return result

	def age(field_name: str) -> timedelta | None:
		at = ctx.account_signals.get(field_name)
		return ctx.now - at if at else None

	points, reasons = 0, []
	sim, device, creds, dest, created = (age(f) for f in ("sim_swap_at", "device_changed_at", "credentials_changed_at", "payout_destination_added_at", "account_created_at"))
	new_destination = dest is not None and dest <= timedelta(hours=72)
	if sim is not None and sim <= timedelta(hours=72):
		severity = "critical" if sim <= timedelta(hours=24) and new_destination else "high"
		points += 900 if severity == "critical" else 450
		msg = f"SIM swap {int(sim.total_seconds() // 3600)}h ago" + (" and a new payout destination" if new_destination else "") + "."
		reasons.append(msg)
		result.flags.append(Flag("SIM_SWAP_RECENT", severity, msg))
	if device is not None and device <= timedelta(hours=24) and (new_destination or (creds is not None and creds <= timedelta(hours=24))):
		points += 400
		msg = "New device in the last 24h together with a new payout destination or credential change."
		reasons.append(msg)
		result.flags.append(Flag("DEVICE_CHANGE_WITH_ACCOUNT_CHANGE", "high", msg))
	elif new_destination and not reasons:
		points += 120
		msg = f"Payout destination added {int(dest.total_seconds() // 3600)}h ago."
		reasons.append(msg)
		result.flags.append(Flag("NEW_PAYOUT_DESTINATION", "low", msg))
	if created is not None and created <= timedelta(days=1):
		points += 150
		msg = "Account opened in the last 24 hours."
		reasons.append(msg)
		result.flags.append(Flag("NEW_ACCOUNT", "medium", msg))
	result.contribution = min(points, 1000)
	result.reason = " ".join(reasons) or "No recent SIM swap, device or account changes."
	if ctx.account_signal_provider:
		result.source_refs.append(f"provider:{ctx.account_signal_provider}")
	return result


SANCTIONS = "ofac_sdn"
SOURCE_NAMES = {
	"ofac_sdn": "US Treasury OFAC sanctions list",
	"tether_usdt_freeze": "frozen by Tether, USDT on Tron",
	"tether_usdt_freeze_solana": "frozen by Tether, USDT on Solana",
	"circle_usdc_freeze_solana": "frozen by Circle, USDC on Solana",
}


def _stable(ctx: SignalContext) -> str:
	"""The stablecoins we read on this chain, for reasons."""
	return "USDC/USDT" if ctx.chain == "solana" else "USDT"


def lookalike_destination(ctx: SignalContext) -> SignalResult:
	"""Address poisoning: is the destination a near-copy of an address this platform has used, or an address
	that only sends dust? See app/engine/lookalike.py."""
	result = SignalResult(name="lookalike_destination", coverage="full")
	if not ctx.wallet:
		result.coverage = "none"
		result.reason = "No destination wallet supplied."
		return result
	points, reasons = 0, []
	matches = find_lookalikes(ctx.wallet, ctx.known_counterparties, ctx.chain)
	if matches:
		best = matches[0]
		strong = best.strength == "strong"
		points += 900 if strong else 550
		msg = (
			f"Looks like {short(best.known)}, an address you've used before, but it's a different address "
			f"(same first {best.prefix + FIXED_PREFIX.get(ctx.chain, 0)} and last {best.suffix} characters). "
			"This is how address-poisoning scams work: check the full address before sending."
		)
		reasons.append(msg)
		result.flags.append(Flag("LOOKALIKE_DESTINATION", "critical" if strong else "high", msg))
		result.source_refs += [m.known for m in matches[:3]]
	elif not ctx.known_counterparties:
		result.coverage = "partial"

	if ctx.history is not None:
		profile = dust_profile(ctx.wallet, ctx.history.transfers + ctx.history.native_transfers)
		if profile.looks_like_poisoner:
			points += 400
			msg = (
				f"This address has sent tiny 'dust' amounts to {profile.recipients} different wallets and never received "
				"real value: typical of address-poisoning bots."
			)
			reasons.append(msg)
			result.flags.append(Flag("DUST_SENDER", "high", msg))
	elif result.coverage == "full":
		result.coverage = "partial"

	result.contribution = min(points, 1000)
	result.value = len(matches)
	result.reason = " ".join(reasons) or (
		f"Not a lookalike of any of the {len(ctx.known_counterparties)} addresses you've used, and no dust-sending pattern."
		if ctx.known_counterparties else "No dust-sending pattern. Send known_counterparties (or keep checking payouts) to compare against your payees."
	)
	return result


def not_implemented(name: str):
	def _signal(_ctx: SignalContext) -> SignalResult:
		return SignalResult(name=name, coverage="not_implemented")

	return _signal


REGISTRY = {
	"lookalike_destination": lookalike_destination,
	"counterparty_graph": counterparty_graph,
	"reversal_behavior": reversal_behavior,
	"token_safety": token_safety,
	"account_takeover_proxies": account_takeover_proxies,
	"float_and_timing": float_and_timing,
	"amount_pattern": amount_pattern,
	"asset_backing": not_implemented("asset_backing"),
	"venue_risk": not_implemented("venue_risk"),
}
