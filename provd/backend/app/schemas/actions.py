"""ActionIntent / ActionScore — the public contract of the evaluate API.

Enums are deliberately open (plain strings validated against known sets) so new chains and intent
types can be added without a breaking change. Only SCORED_* combinations are evaluated today; any
other known value returns recommended_action "not_yet_supported".
"""
from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field, field_validator

KNOWN_CHAINS = {"tron", "stellar", "solana", "evm"}
KNOWN_INTENT_TYPES = {
	"p2p_trade", "ramp_conversion", "payout", "otc_settlement",
	"swap", "deposit", "payment", "asset_verify", "venue_assess",
}
SCORED_CHAINS = {"tron"}
SCORED_INTENT_TYPES = {"p2p_trade", "ramp_conversion", "payout", "otc_settlement"}

RiskLevel = Literal["low", "medium", "high", "critical"]
RecommendedAction = Literal["release", "hold", "reject", "manual_review", "not_yet_supported"]
Severity = Literal["info", "low", "medium", "high", "critical"]


class Counterparty(BaseModel):
	wallet_address: str | None = Field(default=None, max_length=128)
	# Hash the phone number client-side (e.g. HMAC-SHA256 with your own key). Raw numbers are rejected.
	phone_hash: str | None = Field(default=None, min_length=32, max_length=128, pattern=r"^[0-9a-fA-F]+$")


class Rails(BaseModel):
	fiat_rail: str | None = Field(default=None, max_length=32, description="mpesa | bank | …")
	crypto_asset: str | None = Field(default=None, max_length=32, description="e.g. USDT_TRC20")


class Amounts(BaseModel):
	fiat: Decimal | None = Field(default=None, ge=0)
	fiat_currency: str | None = Field(default=None, max_length=8)
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
	intent_id: str | None = Field(default=None, max_length=64, description="Your id; generated if omitted")
	chain: str
	intent_type: str
	counterparty: Counterparty
	rails: Rails = Field(default_factory=Rails)
	amounts: Amounts = Field(default_factory=Amounts)
	account_signals: AccountSignals | None = None
	float_available: Decimal | None = Field(default=None, ge=0, description="Your available float for this rail, in amounts.fiat_currency (payout/OTC)")
	venue: dict | None = None
	asset: dict | None = None
	context: dict = Field(default_factory=dict)

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
	intent_id: str | None = Field(default=None, max_length=64)
	chain: str = "tron"
	wallet_address: str | None = Field(default=None, max_length=128)
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
