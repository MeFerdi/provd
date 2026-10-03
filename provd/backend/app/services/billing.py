"""Pay-as-you-go: free daily quota, prepaid check bundles, top-ups and an exact usage ledger.

Balance = checks bought (confirmed purchases) − paid units used. Free-quota checks never touch the balance.
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
	def __init__(self, balance: int, units: int):
		self.balance, self.units = balance, units


@lru_cache(maxsize=1)
def pricing() -> dict:
	return json.loads(PRICING_PATH.read_text())


@dataclass
class Charge:
	units: int
	free: bool


def _day_start(now: datetime) -> datetime:
	return now.replace(hour=0, minute=0, second=0, microsecond=0)


async def ensure_account(db: AsyncSession, account_id: str) -> Account:
	account = await db.get(Account, account_id)
	if account is None:
		account = Account(id=account_id, billing_model="payg")
		db.add(account)
		await db.flush()
	return account


async def free_used_today(db: AsyncSession, account_id: str, now: datetime | None = None) -> int:
	now = now or datetime.now(timezone.utc)
	return (
		await db.execute(
			select(func.count(UsageEvent.id)).where(
				UsageEvent.account_id == account_id, UsageEvent.free.is_(True), UsageEvent.created_at >= _day_start(now)
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
				UsageEvent.account_id == account_id, UsageEvent.free.is_(False)
			)
		)
	).scalar_one()
	return int(bought) - int(used)


async def authorize(db: AsyncSession, account_id: str, units: int) -> Charge:
	"""Decide how a check is paid for, before running it. Raises PaymentRequired when it can't be."""
	account = await ensure_account(db, account_id)
	if account.billing_model != "payg":
		raise PermissionError("Subscription billing is not available yet.")
	if await free_used_today(db, account_id) < get_settings().free_daily_checks:
		return Charge(units=units, free=True)
	available = await balance(db, account_id)
	if available < units:
		raise PaymentRequired(available, units)
	return Charge(units=units, free=False)


def record_usage(db: AsyncSession, account_id: str, intent_id: str, charge: Charge) -> None:
	db.add(UsageEvent(id=str(uuid4()), account_id=account_id, intent_id=intent_id, units=charge.units, free=charge.free))


def create_purchase(account_id: str, bundle: str, method: str) -> CreditPurchase:
	spec = pricing()["bundles"][bundle]
	if method == "usdt_tron":
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
