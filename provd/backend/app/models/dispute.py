from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Dispute(Base):
	__tablename__ = "disputes"

	id: Mapped[str] = mapped_column(String(36), primary_key=True)
	trade_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
	counterparty_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
	amount: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
	recommendation: Mapped[str] = mapped_column(String(64), nullable=False)
	confidence: Mapped[float] = mapped_column(Float, nullable=False)
	rationale: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
	raw_evidence: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
	created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
