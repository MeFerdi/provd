from datetime import datetime, timezone

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ApiKey(Base):
	__tablename__ = "api_keys"
	__table_args__ = (
		CheckConstraint("char_length(prefix) >= 4", name="ck_api_keys_prefix_length"),
		Index("ix_api_keys_active_created_at", "active", "created_at"),
		Index("ix_api_keys_client_active", "client_id", "active"),
	)

	id: Mapped[str] = mapped_column(String(36), primary_key=True)
	client_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("clients.id", ondelete="SET NULL"), nullable=True)
	name: Mapped[str] = mapped_column(String(100), nullable=False)
	prefix: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
	key_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
	scopes: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
	active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
	created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
	updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
	last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
	notes: Mapped[str | None] = mapped_column(Text, nullable=True)
