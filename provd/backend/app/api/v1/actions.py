from datetime import datetime, timedelta, timezone
from typing import Literal
from uuid import uuid4

from fastapi import APIRouter, Depends, Header, HTTPException, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.base import InvalidAddress
from app.config import get_settings
from app.dependencies import get_db_session, require_permissions
from app.engine.scoring import engine_config, evaluate
from app.models.rails import CreditPurchase, Decision, Outcome, UsageEvent
from app.schemas.actions import (
	KNOWN_CHAINS,
	SCORED_CHAINS,
	ActionIntent,
	ActionScore,
	CounterpartyReport,
	Explanation,
	OutcomeReport,
	RiskFlag,
)
from app.schemas.auth import AuthContext
from app.services import billing, chain_data
from app.services.evaluate import IntentRejected, build_context, evaluate_intent
from app.services.rate_limit import rate_limit

router = APIRouter(tags=["actions"])

_evaluator = require_permissions(["actions:evaluate"])
_billing_admin = require_permissions(["billing:admin"], allowed_roles=["admin"])


def _account(ctx: AuthContext) -> str:
	return ctx.client_id or ctx.principal_id


def _purchase_url() -> str:
	return f"{get_settings().public_site_url.rstrip('/')}/pricing"


@router.post("/actions/evaluate", response_model=ActionScore, summary="Score a money movement before release")
async def evaluate_action(
	intent: ActionIntent,
	idempotency_key: str | None = Header(default=None, alias="Idempotency-Key", max_length=128),
	x_platform_context: str | None = Header(default=None, alias="X-Platform-Context", max_length=4096),
	db: AsyncSession = Depends(get_db_session),
	ctx: AuthContext = Depends(_evaluator),
):
	if x_platform_context:  # forward-compat: stored with the intent, not scored
		intent.context = {**intent.context, "_platform_context": x_platform_context}
	try:
		return await evaluate_intent(db, _account(ctx), intent, idempotency_key)
	except billing.PaymentRequired as exc:
		await db.rollback()
		return JSONResponse(
			status_code=status.HTTP_402_PAYMENT_REQUIRED,
			content={
				"detail": "Free daily checks used and no prepaid balance. Buy a bundle to continue.",
				"balance": exc.balance,
				"units_required": exc.units,
				"purchase_url": _purchase_url(),
				"topup_endpoint": "/v1/topups",
			},
		)
	except PermissionError as exc:
		await db.rollback()
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
	except IntentRejected as exc:
		await db.rollback()
		raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


@router.get("/decisions/{intent_id}", summary="The full decision record for an evaluated intent")
async def get_decision(intent_id: str, db: AsyncSession = Depends(get_db_session), ctx: AuthContext = Depends(_evaluator)) -> dict:
	decision = await db.get(Decision, intent_id)
	if decision is None or decision.account_id != _account(ctx):
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Decision not found")
	record = {k: v for k, v in decision.record.items() if k != "response"}
	return {
		"intent_id": decision.intent_id,
		"record": record,
		"record_hash": decision.record_hash,
		"hash_algorithm": "sha256 over canonical JSON (sorted keys, no whitespace)",
		"signature": None,
		"anchor": None,
		"proof_status": "hashed — signed and on-chain anchored records are coming soon",
	}


@router.post("/outcomes", status_code=status.HTTP_201_CREATED, summary="Report what happened after a decision")
async def report_outcome(report: OutcomeReport, db: AsyncSession = Depends(get_db_session), ctx: AuthContext = Depends(_evaluator)) -> dict:
	account_id = _account(ctx)
	wallet = report.wallet_address
	if report.intent_id:
		decision = await db.get(Decision, report.intent_id)
		if decision is None or decision.account_id != account_id:
			raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="intent_id not found for this account")
		wallet = wallet or decision.wallet_address
		phone = report.phone_hash or decision.phone_hash
	else:
		phone = report.phone_hash
	if not wallet and not phone:
		raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Provide intent_id, wallet_address or phone_hash")
	if wallet:
		try:
			wallet = chain_data.adapter_for(report.chain).validate_address(wallet)
		except (InvalidAddress, NotImplementedError) as exc:
			raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
	outcome = Outcome(
		id=str(uuid4()),
		account_id=account_id,
		intent_id=report.intent_id,
		chain=report.chain,
		wallet_address=wallet,
		phone_hash=phone.lower() if phone else None,
		outcome=report.outcome,
		occurred_at=report.occurred_at or datetime.now(timezone.utc),
	)
	db.add(outcome)
	await db.commit()
	return {"id": outcome.id, "recorded": True}


@router.get(
	"/counterparties/{chain}/{address}",
	response_model=CounterpartyReport,
	summary="Public counterparty risk report (no key, rate-limited)",
	dependencies=[Depends(rate_limit("scanner", lambda: get_settings().scanner_rate_limit_per_minute, 60))],
)
async def counterparty_report(chain: str, address: str, db: AsyncSession = Depends(get_db_session)) -> CounterpartyReport:
	if chain not in KNOWN_CHAINS:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown chain")
	if chain not in SCORED_CHAINS:
		raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"{chain} is not supported yet. Supported: {sorted(SCORED_CHAINS)}")
	intent = ActionIntent(chain=chain, intent_type="p2p_trade", counterparty={"wallet_address": address})
	now = datetime.now(timezone.utc)
	try:
		sctx = await build_context(db, None, intent, now)
	except IntentRejected as exc:
		raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
	await db.commit()  # persist the refreshed history cache
	evaluation = evaluate(sctx)
	graph = [r for r in evaluation.results if r.name == "counterparty_graph"]
	history = sctx.history
	activity = {
		"transfers_read": len(history.transfers) if history else None,
		"most_recent_only": history.truncated if history else None,
		"first_seen": history.first_seen.isoformat() if history and history.first_seen else None,
		"last_seen": history.last_seen.isoformat() if history and history.last_seen else None,
		"usdt_in": format(history.volume("in"), "f") if history else None,
		"usdt_out": format(history.volume("out"), "f") if history else None,
		"distinct_counterparties": len(history.counterparties) if history else None,
	}
	return CounterpartyReport(
		chain=chain,
		address=sctx.wallet,
		score=evaluation.score,
		risk_level=evaluation.risk_level,
		risk_flags=[RiskFlag(code=f.code, severity=f.severity, reason=f.reason) for f in evaluation.flags if f.code != "OWN_REVERSAL_HISTORY"],
		explainability=[Explanation(signal=r.name, value=r.value, contribution=r.contribution, reason=r.reason, source_refs=r.source_refs) for r in graph],
		activity=activity,
		signal_coverage={r.name: r.coverage for r in graph},
		engine_version=engine_config()["engine_version"],
		checked_at=now,
	)


@router.get("/assets/{chain}/{ref}", summary="Asset verification (Phase E)")
async def asset_report(chain: str, ref: str) -> dict:
	raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset verification is not available yet")


@router.get("/usage", summary="Free quota, prepaid balance and recent usage")
async def usage(db: AsyncSession = Depends(get_db_session), ctx: AuthContext = Depends(_evaluator)) -> dict:
	account_id = _account(ctx)
	await billing.ensure_account(db, account_id)
	since = datetime.now(timezone.utc) - timedelta(days=30)
	rows = await db.execute(
		select(func.count(UsageEvent.id), func.coalesce(func.sum(UsageEvent.units), 0)).where(
			UsageEvent.account_id == account_id, UsageEvent.created_at >= since, UsageEvent.free.is_(False)
		)
	)
	paid_checks, paid_units = rows.one()
	free_used = await billing.free_used_today(db, account_id)
	result = {
		"free_daily_checks": get_settings().free_daily_checks,
		"free_used_today": free_used,
		"free_remaining_today": max(0, get_settings().free_daily_checks - free_used),
		"balance_checks": await billing.balance(db, account_id),
		"paid_checks_30d": paid_checks,
		"paid_units_30d": int(paid_units),
	}
	await db.commit()
	return result


@router.get("/pricing", summary="Public price list")
async def pricing() -> dict:
	bundles = billing.pricing()["bundles"]
	return {
		"free_daily_checks": get_settings().free_daily_checks,
		"bundles": {k: {**v, "per_check_usd": round(v["price_usd"] / v["checks"], 4)} for k, v in bundles.items()},
		"payment_methods": ["usdt_tron", "mpesa"],
	}


class TopupRequest(BaseModel):
	bundle: Literal["10k", "100k", "1m"]
	method: Literal["usdt_tron", "mpesa"]


class TopupConfirm(BaseModel):
	reference: str = Field(min_length=4, max_length=128, description="Tron tx hash or M-Pesa receipt number")


def _topup_view(p: CreditPurchase) -> dict:
	settings = get_settings()
	view = {
		"id": p.id, "bundle": p.bundle, "checks": p.checks, "amount_due": p.amount_due, "currency": p.currency,
		"method": p.method, "status": p.status, "reference": p.reference,
		"created_at": p.created_at.isoformat() if p.created_at else None,
	}
	if p.status == "pending" and p.method == "usdt_tron":
		view["pay_to"] = settings.usdt_deposit_address or None
		view["instructions"] = "Send exactly amount_due USDT (TRC-20). The exact amount identifies your payment; credit arrives after confirmation."
	elif p.status == "pending":
		view["pay_to"] = settings.mpesa_paybill or None
		view["instructions"] = f"Pay amount_due KES to the paybill with account number {p.id[:8].upper()}. Credit is applied once the payment is reconciled."
	return view


@router.post("/topups", status_code=status.HTTP_201_CREATED, summary="Start a top-up (buy a check bundle)")
async def create_topup(body: TopupRequest, db: AsyncSession = Depends(get_db_session), ctx: AuthContext = Depends(_evaluator)) -> dict:
	account_id = _account(ctx)
	await billing.ensure_account(db, account_id)
	purchase = billing.create_purchase(account_id, body.bundle, body.method)
	db.add(purchase)
	await db.commit()
	return _topup_view(purchase)


@router.get("/topups", summary="Your top-ups")
async def list_topups(db: AsyncSession = Depends(get_db_session), ctx: AuthContext = Depends(_evaluator)) -> list[dict]:
	rows = await db.execute(
		select(CreditPurchase).where(CreditPurchase.account_id == _account(ctx)).order_by(CreditPurchase.created_at.desc()).limit(50)
	)
	return [_topup_view(p) for p in rows.scalars().all()]


@router.post("/admin/topups/{purchase_id}/confirm", summary="Admin: confirm a reconciled payment and credit the account")
async def confirm_topup(purchase_id: str, body: TopupConfirm, db: AsyncSession = Depends(get_db_session), _: AuthContext = Depends(_billing_admin)) -> dict:
	purchase = await db.get(CreditPurchase, purchase_id)
	if purchase is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Top-up not found")
	if purchase.status != "pending":
		raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Top-up is already {purchase.status}")
	billing.confirm_purchase(purchase, body.reference)
	await db.commit()
	return _topup_view(purchase)
