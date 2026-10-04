"""ActionIntent / ActionScore — the public contract of the evaluate API.

Enums are deliberately open (plain strings validated against known sets) so new chains and intent
types can be added without a breaking change. Only SCORED_* combinations are evaluated today; any
other known value returns recommended_action "not_yet_supported".
"""
from datetime import datetime
from decimal import Decimal
from typing import Literal

import json
import re
import unicodedata

from pydantic import BaseModel, Field, field_validator

KNOWN_CHAINS = {"tron", "stellar", "solana", "evm"}
KNOWN_INTENT_TYPES = {
	"p2p_trade", "ramp_conversion", "payout", "otc_settlement",
	"swap", "deposit", "payment", "asset_verify", "venue_assess",
}
SCORED_CHAINS = {"tron"}
SCORED_INTENT_TYPES = {"p2p_trade", "ramp_conversion", "payout", "otc_settlement"}

# Identifiers callers choose (intent ids, idempotency keys): letters, digits and . _ : -
SAFE_ID = r"^[A-Za-z0-9._:-]{1,64}$"
_SAFE_ID_RE = re.compile(SAFE_ID)


def clean_text(value: str, max_length: int) -> str:
	"""Strip control and invisible format characters (bidi overrides, zero-width) and cap the length.
	Caller-supplied text ends up in signed records that people and tools read later."""
	kept = "".join(ch for ch in value if unicodedata.category(ch)[0] != "C" or ch in "\n\t")
	return kept[:max_length]


def bounded_json(value: dict | None, *, max_bytes: int = 4096, max_depth: int = 4, max_keys: int = 50, max_str: int = 500) -> dict | None:
	"""Validate free-form JSON from callers: size, depth, key count, plain values only; text is cleaned."""
	if value is None:
		return None

	def walk(node, depth: int):
		if depth > max_depth:
			raise ValueError(f"nested deeper than {max_depth} levels")
		if isinstance(node, dict):
			if len(node) > max_keys:
				raise ValueError(f"more than {max_keys} keys")
			return {clean_text(str(k), 64): walk(v, depth + 1) for k, v in node.items()}
		if isinstance(node, list):
			if len(node) > max_keys:
				raise ValueError(f"more than {max_keys} items")
			return [walk(v, depth + 1) for v in node]
		if isinstance(node, str):
			return clean_text(node, max_str)
		if node is None or isinstance(node, (bool, int, float)):
			return node
		raise ValueError("only JSON values are allowed")

	cleaned = walk(value, 1)
	if len(json.dumps(cleaned, ensure_ascii=False).encode()) > max_bytes:
		raise ValueError(f"larger than {max_bytes} bytes")
	return cleaned


RiskLevel = Literal["low", "medium", "high", "critical"]
RecommendedAction = Literal["release", "hold", "reject", "manual_review", "not_yet_supported"]
Severity = Literal["info", "low", "medium", "high", "critical"]


class Counterparty(BaseModel):
	wallet_address: str | None = Field(default=None, max_length=128, pattern=r"^[A-Za-z0-9:._-]{1,128}$")
	# Hash the phone number client-side (e.g. HMAC-SHA256 with your own key). Raw numbers are rejected.
	phone_hash: str | None = Field(default=None, min_length=32, max_length=128, pattern=r"^[0-9a-fA-F]+$")


class Rails(BaseModel):
	fiat_rail: str | None = Field(default=None, max_length=32, description="Any local rail, e.g. mpesa, bank_transfer, pix, upi, spei, gcash")
	crypto_asset: str | None = Field(default=None, max_length=32, description="e.g. USDT_TRC20")


class Amounts(BaseModel):
	fiat: Decimal | None = Field(default=None, ge=0)
	fiat_currency: str | None = Field(default=None, max_length=8, description="ISO 4217 code, e.g. KES, NGN, BRL, INR")
	crypto: Decimal | None = Field(default=None, ge=0)


class AccountSignals(BaseModel):
	"""Account-takeover inputs from your device-trust or telco provider (Provd doesn't detect these itself).

	Send what you have; every field is optional. Timestamps are when the event happened.
	"""

	provider: str | None = Field(default=None, max_length=64, description="Who supplied these signals, e.g. your SIM-swap API vendor")
	sim_swap_at: datetime | None = Field(default=None, description="Most recent SIM swap / port on the counterparty's number")
	device_changed_at: datetime | None = Field(default=None, description="Most recent new device for the counterparty's account")
	credentials_changed_at: datetime | None = Field(default=None, description="Most recent password/PIN/email change")
	payout_destination_added_at: datetime | None = Field(default=None, description="When the destination receiving these funds was added to the account")
	account_created_at: datetime | None = None


class ActionIntent(BaseModel):
	intent_id: str | None = Field(default=None, max_length=64, pattern=SAFE_ID, description="Your id (letters, digits, . _ : -); generated if omitted")
	chain: str
	intent_type: str
	counterparty: Counterparty
	rails: Rails = Field(default_factory=Rails)
	amounts: Amounts = Field(default_factory=Amounts)
	account_signals: AccountSignals | None = None
	float_available: Decimal | None = Field(default=None, ge=0, description="Your available float for this rail, in amounts.fiat_currency (payout/OTC)")
	venue: dict | None = Field(default=None, description="Reserved; up to 4 KB of JSON")
	asset: dict | None = Field(default=None, description="Reserved; up to 4 KB of JSON")
	context: dict = Field(default_factory=dict, description="Your own reference data, stored with the decision and never scored; up to 4 KB of JSON")

	@field_validator("venue", "asset", "context")
	@classmethod
	def _bounded(cls, value: dict | None) -> dict | None:
		return bounded_json(value)

	@field_validator("chain")
	@classmethod
	def _chain(cls, value: str) -> str:
		if value not in KNOWN_CHAINS:
			raise ValueError(f"unknown chain; expected one of {sorted(KNOWN_CHAINS)}")
		return value

	@field_validator("intent_type")
	@classmethod
	def _intent_type(cls, value: str) -> str:
		if value not in KNOWN_INTENT_TYPES:
			raise ValueError(f"unknown intent_type; expected one of {sorted(KNOWN_INTENT_TYPES)}")
		return value


class RiskFlag(BaseModel):
	code: str
	severity: Severity
	reason: str


class Explanation(BaseModel):
	signal: str
	value: float | str | None
	contribution: int
	reason: str
	source_refs: list[str] = Field(default_factory=list)


class ActionScore(BaseModel):
	intent_id: str
	score: int = Field(ge=0, le=1000, description="Risk score: 0 = no risk found, 1000 = do not release")
	risk_level: RiskLevel
	risk_flags: list[RiskFlag]
	recommended_action: RecommendedAction
	explainability: list[Explanation]
	signal_coverage: dict[str, str]
	decision_record_hash: str
	engine_version: str
	latency_ms: int
	created_at: datetime


class OutcomeReport(BaseModel):
	intent_id: str | None = Field(default=None, max_length=64, pattern=SAFE_ID)
	chain: str = "tron"
	wallet_address: str | None = Field(default=None, max_length=128, pattern=r"^[A-Za-z0-9:._-]{1,128}$")
	phone_hash: str | None = Field(default=None, min_length=32, max_length=128, pattern=r"^[0-9a-fA-F]+$")
	outcome: Literal["completed", "reversed", "refunded", "chargeback", "fraud_confirmed", "fake_confirmation"]
	occurred_at: datetime | None = None


class CounterpartyReport(BaseModel):
	chain: str
	address: str
	score: int
	risk_level: RiskLevel
	risk_flags: list[RiskFlag]
	explainability: list[Explanation]
	activity: dict
	signal_coverage: dict[str, str]
	engine_version: str
	checked_at: datetime
