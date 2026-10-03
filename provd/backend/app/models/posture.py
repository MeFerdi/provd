from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


def _now() -> datetime:
	return datetime.now(timezone.utc)


class Protocol(Base):
	"""A monitored contract. `published` gates whether it appears in public ratings (disclosure policy)."""

	__tablename__ = "protocols"
	__table_args__ = (Index("ix_protocols_chain_contract", "chain", "contract", unique=True),)

	id: Mapped[str] = mapped_column(String(36), primary_key=True)
	slug: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
	name: Mapped[str] = mapped_column(String(120), nullable=False)
	category: Mapped[str] = mapped_column(String(40), nullable=False)
	website: Mapped[str | None] = mapped_column(String(200), nullable=True)
	framework: Mapped[str] = mapped_column(String(32), nullable=False, default="layerzero_v2")
	chain: Mapped[str] = mapped_column(String(32), nullable=False)
	contract: Mapped[str] = mapped_column(String(42), nullable=False)
	published: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
	last_checked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
	created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now)


class PostureSnapshot(Base):
	"""Stored only when the security-relevant configuration changes, so the table is a change log."""

	__tablename__ = "posture_snapshots"
	__table_args__ = (Index("ix_posture_snapshots_protocol_checked", "protocol_id", "checked_at"),)

	id: Mapped[str] = mapped_column(String(36), primary_key=True)
	protocol_id: Mapped[str] = mapped_column(String(36), ForeignKey("protocols.id", ondelete="CASCADE"), nullable=False)
	fingerprint: Mapped[str] = mapped_column(String(64), nullable=False)
	grade: Mapped[str] = mapped_column(String(1), nullable=False)
	score: Mapped[int] = mapped_column(Integer, nullable=False)
	risk_level: Mapped[str] = mapped_column(String(16), nullable=False)
	posture: Mapped[dict] = mapped_column(JSON, nullable=False)
	checked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now)


class PostureChange(Base):
	__tablename__ = "posture_changes"
	__table_args__ = (Index("ix_posture_changes_protocol_detected", "protocol_id", "detected_at"),)

	id: Mapped[str] = mapped_column(String(36), primary_key=True)
	protocol_id: Mapped[str] = mapped_column(String(36), ForeignKey("protocols.id", ondelete="CASCADE"), nullable=False)
	detected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now)
	kind: Mapped[str] = mapped_column(String(40), nullable=False)
	severity: Mapped[str] = mapped_column(String(16), nullable=False)
	summary: Mapped[str] = mapped_column(Text, nullable=False)
	pathway: Mapped[int | None] = mapped_column(Integer, nullable=True)
	before: Mapped[dict | None] = mapped_column(JSON, nullable=True)
	after: Mapped[dict | None] = mapped_column(JSON, nullable=True)


class EarlyAccessRequest(Base):
	__tablename__ = "early_access_requests"

	id: Mapped[str] = mapped_column(String(36), primary_key=True)
	email: Mapped[str] = mapped_column(String(254), nullable=False, index=True)
	organization: Mapped[str | None] = mapped_column(String(120), nullable=True)
	role: Mapped[str] = mapped_column(String(20), nullable=False)
	message: Mapped[str | None] = mapped_column(Text, nullable=True)
	created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now)
