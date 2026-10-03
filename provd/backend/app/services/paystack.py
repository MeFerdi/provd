"""Card and M-Pesa top-ups through Paystack Checkout.

Flow: POST /v1/topups {method: "card" | "mpesa"} creates a pending purchase and a Paystack transaction whose
reference is the purchase id; the buyer pays on Paystack's hosted page (we never see card details or PINs). Each method opens
checkout on its own channel: card -> "card", mpesa -> "mobile_money".
The purchase is credited when Paystack's signed `charge.success` webhook arrives, or when the indexer
(or POST /v1/topups/{id}/refresh) verifies the transaction — whichever comes first. Amount and
currency are checked against the purchase before crediting.
"""
import hashlib
import hmac
from dataclasses import dataclass
from decimal import Decimal

import httpx

from app.config import get_settings
from app.models.rails import CreditPurchase
from app.services import billing


CHANNELS = {"card": ["card"], "mpesa": ["mobile_money"]}


class PaystackUnavailable(Exception):
	pass


def enabled() -> bool:
	return bool(get_settings().paystack_secret_key)


def handles(purchase: CreditPurchase) -> bool:
	"""Purchases that went through Paystack Checkout (manual-paybill M-Pesa purchases have no checkout)."""
	return purchase.method in CHANNELS and purchase.checkout_url is not None


@dataclass
class Checkout:
	authorization_url: str
	reference: str


@dataclass
class Transaction:
	reference: str
	status: str  # success | failed | abandoned | ongoing | pending | ...
	amount_subunits: int
	currency: str
	paystack_id: str


def subunits(amount: str | Decimal) -> int:
	"""Paystack amounts are in the currency's subunit (cents, kobo...)."""
	return int((Decimal(amount) * 100).to_integral_value())


def signature_valid(raw_body: bytes, signature: str | None) -> bool:
	secret = get_settings().paystack_secret_key
	if not secret or not signature:
		return False
	expected = hmac.new(secret.encode(), raw_body, hashlib.sha512).hexdigest()
	return hmac.compare_digest(expected, signature)


class PaystackClient:
	async def _request(self, method: str, path: str, json: dict | None = None) -> dict:
		settings = get_settings()
		try:
			async with httpx.AsyncClient(base_url=settings.paystack_url, timeout=settings.http_timeout_seconds) as client:
				response = await client.request(method, path, json=json, headers={"Authorization": f"Bearer {settings.paystack_secret_key}"})
		except (httpx.HTTPError, OSError) as exc:
			raise PaystackUnavailable(f"Paystack unreachable: {exc}") from exc
		body = response.json() if response.headers.get("content-type", "").startswith("application/json") else {}
		if response.status_code >= 400 or not body.get("status"):
			raise PaystackUnavailable(f"Paystack {response.status_code}: {body.get('message', response.text[:200])}")
		return body["data"]

	async def initialize(self, *, reference: str, email: str, amount_subunits: int, currency: str, channels: list[str], callback_url: str, metadata: dict) -> Checkout:
		data = await self._request("POST", "/transaction/initialize", {
			"reference": reference, "email": email, "amount": amount_subunits, "currency": currency,
			"callback_url": callback_url, "channels": channels, "metadata": metadata,
		})
		return Checkout(authorization_url=data["authorization_url"], reference=data["reference"])

	async def verify(self, reference: str) -> Transaction:
		data = await self._request("GET", f"/transaction/verify/{reference}")
		return transaction_from(data)


def transaction_from(data: dict) -> Transaction:
	return Transaction(
		reference=str(data.get("reference", "")), status=str(data.get("status", "")),
		amount_subunits=int(data.get("amount") or 0), currency=str(data.get("currency", "")).upper(), paystack_id=str(data.get("id", "")),
	)


def settle(purchase: CreditPurchase, tx: Transaction) -> str:
	"""Apply a verified Paystack transaction to a pending card purchase. Returns the purchase status.

	A successful charge whose amount or currency doesn't match the purchase is never credited; it goes to
	`needs_review` for an admin. Failed or abandoned charges leave the purchase pending so the buyer can retry.
	"""
	if purchase.status != "pending" or tx.status != "success":
		return purchase.status
	if tx.currency == purchase.currency and tx.amount_subunits == subunits(purchase.amount_due):
		billing.confirm_purchase(purchase, f"paystack:{tx.paystack_id or tx.reference}")
	else:
		purchase.status = "needs_review"
		purchase.reference = f"paystack:{tx.paystack_id or tx.reference} paid {tx.amount_subunits} {tx.currency}"
	return purchase.status


_client: PaystackClient | None = None


def client() -> PaystackClient:
	global _client
	if _client is None:
		_client = PaystackClient()
	return _client


def set_client(value) -> None:
	"""Test hook."""
	global _client
	_client = value
