"""Evaluate an ActionIntent: gather inputs, score, persist the decision record, meter the call."""
import json
import time
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.base import InvalidAddress
from app.engine.scoring import Evaluation, canonical_json, engine_config, evaluate, record_hash, signals_for
from app.engine.signals import AmountView, OutcomeView, SignalContext
from app.models.rails import Decision, Outcome
from app.proof.signing import signer
from app.schemas.actions import SCORED_CHAINS, SCORED_INTENT_TYPES, ActionIntent, ActionScore, Explanation, RiskFlag
from app.services import billing, chain_data


class IntentRejected(ValueError):
	"""The intent is well-formed JSON but can't be evaluated (e.g. invalid address)."""


def _now() -> datetime:
	return datetime.now(timezone.utc)


async def build_context(db: AsyncSession, account_id: str | None, intent: ActionIntent, now: datetime) -> SignalContext:
	wallet = intent.counterparty.wallet_address
	adapter = chain_data.adapter_for(intent.chain)
	if wallet:
		try:
			wallet = adapter.validate_address(wallet)
		except InvalidAddress as exc:
			raise IntentRejected(str(exc)) from exc

	ctx = SignalContext(intent_type=intent.intent_type, wallet=wallet, now=now, chain=intent.chain)
	ctx.known_counterparties = set(intent.known_counterparties)
	ctx.amount, ctx.amount_unit = normalized_amount(intent)
	if intent.float_available is not None:
		ctx.float_available = float(intent.float_available)
	if intent.account_signals:
		signals = intent.account_signals.model_dump(exclude={"provider"}, exclude_none=True)
		ctx.account_signals = {k: _aware(v) for k, v in signals.items()}
		ctx.account_signal_provider = intent.account_signals.provider
	if wallet:
		ctx.history, ctx.history_error = await chain_data.history(db, intent.chain, wallet)
	peers = ctx.history.counterparties if ctx.history else set()
	ctx.public_flags = await chain_data.public_flags(db, intent.chain, peers | ({wallet} if wallet else set()))
	sanctioned = {a for a, source in ctx.public_flags.items() if source == "ofac_sdn"}
	ctx.flag_references = await chain_data.flag_references(db, intent.chain, sanctioned)

	if account_id:
		identity = [c for c in (
			Outcome.wallet_address == wallet if wallet else None,
			Outcome.phone_hash == intent.counterparty.phone_hash.lower() if intent.counterparty.phone_hash else None,
		) if c is not None]
		if identity:
			rows = await db.execute(select(Outcome.outcome, Outcome.occurred_at).where(Outcome.account_id == account_id, or_(*identity)))
			ctx.own_outcomes = [OutcomeView(o, _aware(t)) for o, t in rows.all()]
		flagged = await db.execute(
			select(Outcome.wallet_address).where(
				Outcome.account_id == account_id,
				Outcome.outcome.in_(["fraud_confirmed", "fake_confirmation"]),
				Outcome.wallet_address.is_not(None),
			)
		)
		ctx.platform_flagged = {w for (w,) in flagged.all()} - ({wallet} if wallet else set())
		await _load_baselines(db, account_id, intent, wallet, ctx)
		ctx.known_counterparties |= await _known_counterparties(db, account_id, intent.chain)
		if wallet:
			ctx.recent_decisions_24h = (
				await db.execute(
					select(func.count(Decision.intent_id)).where(
						Decision.account_id == account_id, Decision.wallet_address == wallet, Decision.created_at >= now - timedelta(hours=24)
					)
				)
			).scalar_one()

	if intent.intent_type == "ramp_conversion" and intent.rails.crypto_asset:
		ctx.asset_ref = intent.rails.crypto_asset
		ctx.asset = await adapter.asset_metadata(intent.rails.crypto_asset)
		if ctx.asset is None:
			ctx.token_report, ctx.token_error = await chain_data.token_security(intent.chain, intent.rails.crypto_asset)
	return ctx


async def _known_counterparties(db: AsyncSession, account_id: str, chain: str, limit: int = 5000) -> set[str]:
	"""Addresses this platform actually paid: released checks and completed outcomes, never rejected or held
	ones (a rejected lookalike must not become 'known', or the real payee would later look like its copy)."""
	released = await db.execute(
		select(Decision.wallet_address).where(
			Decision.account_id == account_id, Decision.chain == chain,
			Decision.recommended_action == "release", Decision.wallet_address.is_not(None),
		).distinct().limit(limit)
	)
	completed = await db.execute(
		select(Outcome.wallet_address).where(
			Outcome.account_id == account_id, Outcome.outcome == "completed", Outcome.wallet_address.is_not(None),
		).distinct().limit(limit)
	)
	bad = await db.execute(
		select(Outcome.wallet_address).where(
			Outcome.account_id == account_id,
			Outcome.outcome.in_(["fraud_confirmed", "fake_confirmation", "reversed", "chargeback"]),
			Outcome.wallet_address.is_not(None),
		)
	)
	return ({w for (w,) in released.all()} | {w for (w,) in completed.all()}) - {w for (w,) in bad.all()}


def normalized_amount(intent: ActionIntent) -> tuple[float | None, str | None]:
	"""One comparable amount per decision: the crypto amount when given (USDT ~ USD), else the fiat amount."""
	if intent.amounts.crypto is not None:
		return float(intent.amounts.crypto), (intent.rails.crypto_asset or "CRYPTO").upper()
	if intent.amounts.fiat is not None:
		return float(intent.amounts.fiat), (intent.amounts.fiat_currency or "FIAT").upper()
	return None, None


async def _load_baselines(db: AsyncSession, account_id: str, intent: ActionIntent, wallet: str | None, ctx: SignalContext) -> None:
	since = ctx.now - timedelta(days=90)
	if ctx.amount is not None:
		rows = await db.execute(
			select(Decision.amount).where(
				Decision.account_id == account_id, Decision.intent_type == intent.intent_type,
				Decision.amount_unit == ctx.amount_unit, Decision.amount.is_not(None), Decision.created_at >= since,
			).limit(5000)
		)
		ctx.platform_amounts = [a for (a,) in rows.all()]
		identity = [c for c in (
			Decision.wallet_address == wallet if wallet else None,
			Decision.phone_hash == intent.counterparty.phone_hash.lower() if intent.counterparty.phone_hash else None,
		) if c is not None]
		if identity:
			rows = await db.execute(
				select(Decision.amount, Decision.amount_unit, Decision.created_at).where(
					Decision.account_id == account_id, Decision.amount_unit == ctx.amount_unit,
					Decision.amount.is_not(None), Decision.created_at >= since, or_(*identity),
				)
			)
			ctx.counterparty_amounts = [AmountView(a, u, _aware(t)) for a, u, t in rows.all()]
	hours = await db.execute(
		select(Decision.created_at).where(Decision.account_id == account_id, Decision.created_at >= since).limit(20000)
	)
	for (created,) in hours.all():
		hour = _aware(created).hour
		ctx.platform_hours[hour] = ctx.platform_hours.get(hour, 0) + 1


def _aware(value: datetime) -> datetime:
	return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def _explain(evaluation: Evaluation) -> list[Explanation]:
	weights = engine_config()["signals"]
	return [
		Explanation(
			signal=r.name,
			value=r.value,
			contribution=round(weights[r.name]["weight"] * r.contribution),
			reason=r.reason,
			source_refs=r.source_refs,
		)
		for r in evaluation.results
	]


def _not_supported(intent: ActionIntent, intent_id: str, now: datetime, started: float) -> tuple[ActionScore, dict]:
	what = intent.chain if intent.chain not in SCORED_CHAINS else intent.intent_type
	reason = f"'{what}' is not scored yet. Supported today: chains {sorted(SCORED_CHAINS)}, intents {sorted(SCORED_INTENT_TYPES)}."
	record = {
		"intent_id": intent_id,
		"intent": intent.model_dump(mode="json", exclude={"intent_id"}),
		"decision": {"recommended_action": "not_yet_supported", "reason": reason},
		"engine_version": engine_config()["engine_version"],
		"created_at": now,
	}
	score = ActionScore(
		intent_id=intent_id, score=0, risk_level="low",
		risk_flags=[RiskFlag(code="NOT_YET_SUPPORTED", severity="info", reason=reason)],
		recommended_action="not_yet_supported", explainability=[], signal_coverage={},
		decision_record_hash=record_hash(record), engine_version=engine_config()["engine_version"],
		latency_ms=round((time.perf_counter() - started) * 1000), created_at=now,
	)
	return score, record


async def evaluate_intent(db: AsyncSession, account_id: str, intent: ActionIntent, idempotency_key: str | None) -> ActionScore:
	if idempotency_key:
		existing = (
			await db.execute(select(Decision).where(Decision.account_id == account_id, Decision.idempotency_key == idempotency_key))
		).scalar_one_or_none()
		if existing:
			return ActionScore(**existing.record["response"])

	started = time.perf_counter()
	now = _now()
	intent_id = intent.intent_id or str(uuid4())
	if await db.get(Decision, intent_id):
		raise IntentRejected(f"intent_id {intent_id} was already evaluated; send a new intent_id or an Idempotency-Key.")

	if intent.chain not in SCORED_CHAINS or intent.intent_type not in SCORED_INTENT_TYPES:
		score, record = _not_supported(intent, intent_id, now, started)
		wallet = intent.counterparty.wallet_address
	else:
		names = signals_for(intent.intent_type)
		units = max(1, sum(engine_config()["signals"][n]["cost_units"] for n in names))
		charge = await billing.reserve(db, account_id, units, intent_id)  # before any upstream calls
		try:
			return await _score_and_store(db, account_id, intent, intent_id, idempotency_key, now, started)
		except BaseException:
			await db.rollback()
			await billing.release(db, charge)
			raise
	return await _store(db, account_id, intent, intent_id, idempotency_key, score, record, wallet, now)


async def _score_and_store(
	db: AsyncSession, account_id: str, intent: ActionIntent, intent_id: str, idempotency_key: str | None,
	now: datetime, started: float,
) -> ActionScore:
	ctx = await build_context(db, account_id, intent, now)
	evaluation = evaluate(ctx)
	flags = [RiskFlag(code=f.code, severity=f.severity, reason=f.reason) for f in evaluation.flags]
	explain = _explain(evaluation)
	record = {
		"intent_id": intent_id,
		"intent": intent.model_dump(mode="json", exclude={"intent_id"}),
		"signals": [e.model_dump() for e in explain],
		"signal_coverage": evaluation.coverage,
		"decision": {
			"score": evaluation.score,
			"risk_level": evaluation.risk_level,
			"recommended_action": evaluation.recommended_action,
			"risk_flags": [f.model_dump() for f in flags],
		},
		"engine_version": engine_config()["engine_version"],
		"created_at": now,
	}
	score = ActionScore(
		intent_id=intent_id,
		score=evaluation.score,
		risk_level=evaluation.risk_level,
		risk_flags=flags,
		recommended_action=evaluation.recommended_action,
		explainability=explain,
		signal_coverage=evaluation.coverage,
		decision_record_hash=record_hash(record),
		engine_version=engine_config()["engine_version"],
		latency_ms=round((time.perf_counter() - started) * 1000),
		created_at=now,
	)
	return await _store(db, account_id, intent, intent_id, idempotency_key, score, record, ctx.wallet, now)


async def _store(
	db: AsyncSession, account_id: str, intent: ActionIntent, intent_id: str, idempotency_key: str | None,
	score: ActionScore, record: dict, wallet: str | None, now: datetime,
) -> ActionScore:
	"""Sign and store the decision. Usage was already recorded by billing.reserve()."""
	stored = dict(record)
	stored["response"] = score.model_dump(mode="json")
	key = signer()
	db.add(
		Decision(
			intent_id=intent_id,
			account_id=account_id,
			idempotency_key=idempotency_key,
			chain=intent.chain,
			intent_type=intent.intent_type,
			wallet_address=wallet,
			phone_hash=(intent.counterparty.phone_hash or "").lower() or None,
			score=score.score,
			risk_level=score.risk_level,
			amount=normalized_amount(intent)[0],
			amount_unit=normalized_amount(intent)[1],
			recommended_action=score.recommended_action,
			engine_version=score.engine_version,
			record=_jsonable(stored),
			record_hash=score.decision_record_hash,
			signature=key.sign(score.decision_record_hash),
			signing_key_id=key.key_id,
			created_at=now,
		)
	)
	await db.commit()
	return score


def _jsonable(record: dict) -> dict:
	return json.loads(canonical_json(record))
