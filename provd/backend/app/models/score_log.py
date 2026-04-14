from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ScoreLog(Base):
	__tablename__ = "score_logs"

	id: Mapped[str] = mapped_column(String(36), primary_key=True)
	entity_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
	score: Mapped[float] = mapped_column(Float, nullable=False)
	risk_level: Mapped[str] = mapped_column(String(16), nullable=False)
	signals: Mapped[list[dict]] = mapped_column(JSON, nullable=False, default=list)
	cached: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
	created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
