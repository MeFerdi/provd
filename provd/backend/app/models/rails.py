from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, Index, Integer, JSON, LargeBinary, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


def _now() -> datetime:
	return datetime.now(timezone.utc)


class Decision(Base):
	"""One evaluate call: the canonical record, its hash and signature, and its place in an anchor batch."""

	__tablename__ = "decisions"
	__table_args__ = (
		UniqueConstraint("account_id", "idempotency_key", name="uq_decisions_account_idempotency"),
		Index("ix_decisions_account_created", "account_id", "created_at"),
	)

	intent_id: Mapped[str] = mapped_column(String(64), primary_key=True)
	account_id: Mapped[str] = mapped_column(String(36), nullable=False)
	idempotency_key: Mapped[str | None] = mapped_column(String(128), nullable=True)
	chain: Mapped[str] = mapped_column(String(16), nullable=False)
	intent_type: Mapped[str] = mapped_column(String(32), nullable=False)
	wallet_address: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
	phone_hash: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
	score: Mapped[int] = mapped_column(Integer, nullable=False)
	risk_level: Mapped[str] = mapped_column(String(16), nullable=False)
	recommended_action: Mapped[str] = mapped_column(String(24), nullable=False)
	# For baselines only (amount_pattern); the exact amounts live in `record`.
	amount: Mapped[float | None] = mapped_column(Float, nullable=True)
	amount_unit: Mapped[str | None] = mapped_column(String(16), nullable=True)
	engine_version: Mapped[str] = mapped_column(String(32), nullable=False)
	record: Mapped[dict] = mapped_column(JSON, nullable=False)
	record_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
	signature: Mapped[str | None] = mapped_column(String(128), nullable=True)
	signing_key_id: Mapped[str | None] = mapped_column(String(16), nullable=True)
	batch_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
	leaf_index: Mapped[int | None] = mapped_column(Integer, nullable=True)
	merkle_proof: Mapped[list | None] = mapped_column(JSON, nullable=True)
	created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now)


class AnchorBatch(Base):
	"""A Merkle batch of decision hashes and where its root is anchored."""

	__tablename__ = "anchor_batches"
	__table_args__ = (Index("ix_anchor_batches_status_sealed", "anchor_status", "sealed_at"),)

	id: Mapped[str] = mapped_column(String(36), primary_key=True)
	merkle_root: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
	leaf_count: Mapped[int] = mapped_column(Integer, nullable=False)
	sealed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now)
	anchor_method: Mapped[str] = mapped_column(String(24), nullable=False)
	anchor_status: Mapped[str] = mapped_column(String(16), nullable=False)  # pending | anchored | not_anchored | failed
	anchor_proof: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
	anchor_reference: Mapped[str | None] = mapped_column(String(128), nullable=True)
	anchor_detail: Mapped[str | None] = mapped_column(String(512), nullable=True)
	anchored_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
	last_attempt_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Outcome(Base):
	"""What actually happened after a decision, reported by the platform. Feeds its own history only."""

	__tablename__ = "outcomes"
	__table_args__ = (
		Index("ix_outcomes_account_wallet", "account_id", "wallet_address"),
		Index("ix_outcomes_account_phone", "account_id", "phone_hash"),
	)

	id: Mapped[str] = mapped_column(String(36), primary_key=True)
	account_id: Mapped[str] = mapped_column(String(36), nullable=False)
	intent_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
	chain: Mapped[str] = mapped_column(String(16), nullable=False)
	wallet_address: Mapped[str | None] = mapped_column(String(128), nullable=True)
	phone_hash: Mapped[str | None] = mapped_column(String(128), nullable=True)
	outcome: Mapped[str] = mapped_column(String(24), nullable=False)
	occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now)
	created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now)


class FlaggedAddress(Base):
	"""Public-source risk list (seeded from issuer freezes, extendable from config)."""

	__tablename__ = "flagged_addresses"

	chain: Mapped[str] = mapped_column(String(16), primary_key=True)
	address: Mapped[str] = mapped_column(String(128), primary_key=True)
	source: Mapped[str] = mapped_column(String(48), nullable=False)
	reference: Mapped[str | None] = mapped_column(String(128), nullable=True)
	flagged_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
	active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class HistoryCache(Base):
	__tablename__ = "history_cache"

	chain: Mapped[str] = mapped_column(String(16), primary_key=True)
	address: Mapped[str] = mapped_column(String(128), primary_key=True)
	payload: Mapped[dict] = mapped_column(JSON, nullable=False)
	fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class Checkpoint(Base):
	__tablename__ = "indexer_checkpoints"

	name: Mapped[str] = mapped_column(String(64), primary_key=True)
	cursor: Mapped[str | None] = mapped_column(String(128), nullable=True)
	updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now)


class Account(Base):
	"""Billing account for a client (platform). Pay-as-you-go by default; subscription for global platforms."""

	__tablename__ = "accounts"

	id: Mapped[str] = mapped_column(String(36), primary_key=True)  # == clients.id
	billing_model: Mapped[str] = mapped_column(String(16), nullable=False, default="payg")  # payg | subscription
	plan_name: Mapped[str | None] = mapped_column(String(64), nullable=True)
	monthly_included_checks: Mapped[int | None] = mapped_column(Integer, nullable=True)
	overage: Mapped[str | None] = mapped_column(String(16), nullable=True)  # prepaid | invoice | block
	period_anchor_day: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 1-28, billing period start
	created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now)


class CreditPurchase(Base):
	__tablename__ = "credit_purchases"
	__table_args__ = (Index("ix_credit_purchases_account_status", "account_id", "status"),)

	id: Mapped[str] = mapped_column(String(36), primary_key=True)
	account_id: Mapped[str] = mapped_column(String(36), nullable=False)
	bundle: Mapped[str] = mapped_column(String(16), nullable=False)
	checks: Mapped[int] = mapped_column(Integer, nullable=False)
	amount_due: Mapped[str] = mapped_column(String(32), nullable=False)  # decimal string, in `currency`
	currency: Mapped[str] = mapped_column(String(8), nullable=False)
	method: Mapped[str] = mapped_column(String(16), nullable=False)  # usdt_tron | mpesa
	status: Mapped[str] = mapped_column(String(16), nullable=False, default="pending")
	reference: Mapped[str | None] = mapped_column(String(128), nullable=True)  # tx hash or M-Pesa receipt
	created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now)
	confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class UsageEvent(Base):
	__tablename__ = "usage_events"
	__table_args__ = (Index("ix_usage_events_account_created", "account_id", "created_at"),)

	id: Mapped[str] = mapped_column(String(36), primary_key=True)
	account_id: Mapped[str] = mapped_column(String(36), nullable=False)
	intent_id: Mapped[str] = mapped_column(String(64), nullable=False)
	units: Mapped[int] = mapped_column(Integer, nullable=False)
	free: Mapped[bool] = mapped_column(Boolean, nullable=False)
	source: Mapped[str] = mapped_column(String(16), nullable=False, default="free")  # free | prepaid | plan | overage
	created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now)


