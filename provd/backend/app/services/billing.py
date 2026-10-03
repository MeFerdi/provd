"""Billing: pay-as-you-go (free monthly quota + prepaid bundles) and subscriptions (monthly included checks).

Every usage event records what paid for it: free | prepaid | plan | overage.
Balance = checks bought (confirmed purchases) − units paid from the prepaid balance.
"""
import json
import secrets
from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal
from functools import lru_cache
from pathlib import Path
from uuid import uuid4

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.rails import Account, CreditPurchase, UsageEvent

PRICING_PATH = Path(__file__).resolve().parents[1] / "engine" / "pricing.json"


class PaymentRequired(Exception):
	def __init__(self, balance: int, units: int, detail: str = "Free checks for this month used and no prepaid balance. Buy a bundle to continue."):
		self.balance, self.units, self.detail = balance, units, detail


@lru_cache(maxsize=1)
def pricing() -> dict:
	return json.loads(PRICING_PATH.read_text())


@dataclass
class Charge:
	units: int
	source: str  # free | prepaid | plan | overage

	@property
	def free(self) -> bool:
		return self.source == "free"


def month_start(now: datetime) -> datetime:
	"""The free quota resets on the 1st of each calendar month, 00:00 UTC."""
	return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def public_price_list() -> dict:
	"""What GET /v1/pricing serves and what the site renders (via app.export_contract)."""
	spec = pricing()
	return {
		"free_monthly_checks": get_settings().free_monthly_checks,
		"bundles": {k: {**v, "per_check_usd": round(v["price_usd"] / v["checks"], 4)} for k, v in spec["bundles"].items()},
		"plans": spec.get("plans", {}),
		"payment_methods": ["card", "usdt_tron", "mpesa"],
	}


async def ensure_account(db: AsyncSession, account_id: str) -> Account:
	account = await db.get(Account, account_id)
	if account is None:
		account = Account(id=account_id, billing_model="payg")
		db.add(account)
		await db.flush()
	return account


async def free_used_this_month(db: AsyncSession, account_id: str, now: datetime | None = None) -> int:
	now = now or datetime.now(timezone.utc)
	return (
		await db.execute(
			select(func.count(UsageEvent.id)).where(
				UsageEvent.account_id == account_id, UsageEvent.free.is_(True), UsageEvent.created_at >= month_start(now)
			)
		)
	).scalar_one()


async def balance(db: AsyncSession, account_id: str) -> int:
	bought = (
		await db.execute(
			select(func.coalesce(func.sum(CreditPurchase.checks), 0)).where(
				CreditPurchase.account_id == account_id, CreditPurchase.status == "confirmed"
			)
		)
	).scalar_one()
	used = (
		await db.execute(
			select(func.coalesce(func.sum(UsageEvent.units), 0)).where(
				UsageEvent.account_id == account_id, UsageEvent.source == "prepaid"
			)
		)
	).scalar_one()
	return int(bought) - int(used)


def period_start(account: Account, now: datetime) -> datetime:
	"""Start of the current monthly billing period (anchor day 1-28, UTC)."""
	day = min(max(account.period_anchor_day or 1, 1), 28)
	start = now.replace(day=day, hour=0, minute=0, second=0, microsecond=0)
	if start > now:
		year, month = (now.year, now.month - 1) if now.month > 1 else (now.year - 1, 12)
		start = start.replace(year=year, month=month)
	return start


async def plan_used(db: AsyncSession, account: Account, now: datetime | None = None) -> int:
	now = now or datetime.now(timezone.utc)
	return int(
		(
			await db.execute(
				select(func.coalesce(func.sum(UsageEvent.units), 0)).where(
					UsageEvent.account_id == account.id, UsageEvent.source == "plan", UsageEvent.created_at >= period_start(account, now)
				)
			)
		).scalar_one()
	)


async def authorize(db: AsyncSession, account_id: str, units: int) -> Charge:
	"""Decide how a check is paid for, before running it. Raises PaymentRequired when it can't be."""
	account = await ensure_account(db, account_id)
	if account.billing_model == "subscription":
		if await plan_used(db, account) + units <= (account.monthly_included_checks or 0):
			return Charge(units=units, source="plan")
		if account.overage == "invoice":
			return Charge(units=units, source="overage")
		if account.overage == "prepaid" and await balance(db, account_id) >= units:
			return Charge(units=units, source="prepaid")
		raise PaymentRequired(await balance(db, account_id), units, "Monthly plan checks used. Top up a prepaid balance or contact us to raise the plan.")
	if await free_used_this_month(db, account_id) < get_settings().free_monthly_checks:
		return Charge(units=units, source="free")
	available = await balance(db, account_id)
	if available < units:
		raise PaymentRequired(available, units)
	return Charge(units=units, source="prepaid")


def record_usage(db: AsyncSession, account_id: str, intent_id: str, charge: Charge) -> None:
	db.add(UsageEvent(id=str(uuid4()), account_id=account_id, intent_id=intent_id, units=charge.units, free=charge.free, source=charge.source))


def create_purchase(account_id: str, bundle: str, method: str) -> CreditPurchase:
	spec = pricing()["bundles"][bundle]
	if method == "card":
		currency = get_settings().paystack_currency.upper()
		if currency not in ("KES", "USD"):
			raise ValueError(f"PAYSTACK_CURRENCY {currency} has no price list; use KES or USD")
		amount = Decimal(str(spec["price_kes" if currency == "KES" else "price_usd"]))
	elif method == "usdt_tron":
		# A unique amount (sub-cent tag) lets the indexer match the incoming transfer to this purchase.
		tag = Decimal(secrets.randbelow(9999) + 1) / Decimal(1_000_000)
		amount, currency = (Decimal(str(spec["price_usd"])) + tag).quantize(Decimal("0.000001")), "USDT"
	else:
		amount, currency = Decimal(str(spec["price_kes"])), "KES"
	return CreditPurchase(
		id=str(uuid4()),
		account_id=account_id,
		bundle=bundle,
		checks=spec["checks"],
		amount_due=format(amount, "f"),
		currency=currency,
		method=method,
		status="pending",
	)


def confirm_purchase(purchase: CreditPurchase, reference: str) -> None:
	purchase.status = "confirmed"
	purchase.reference = reference
	purchase.confirmed_at = datetime.now(timezone.utc)
