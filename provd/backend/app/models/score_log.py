from datetime import datetime, timezone

from sqlalchemy import Boolean, CheckConstraint, DateTime, Float, Index, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ScoreLog(Base):
	__tablename__ = "score_logs"
	__table_args__ = (
		CheckConstraint("score >= 0 AND score <= 1", name="ck_score_logs_score_range"),
		CheckConstraint("risk_level IN ('low', 'medium', 'high')", name="ck_score_logs_risk_level_values"),
		Index("ix_score_logs_entity_created_at", "entity_id", "created_at"),
		Index("ix_score_logs_risk_level_created_at", "risk_level", "created_at"),
	)

	id: Mapped[str] = mapped_column(String(36), primary_key=True)
	entity_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
	score: Mapped[float] = mapped_column(Float, nullable=False)
	risk_level: Mapped[str] = mapped_column(String(16), nullable=False)
	signals: Mapped[list[dict]] = mapped_column(JSON, nullable=False, default=list)
	cached: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
	created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
