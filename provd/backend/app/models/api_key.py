from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ApiKey(Base):
	__tablename__ = "api_keys"

	id: Mapped[str] = mapped_column(String(36), primary_key=True)
	name: Mapped[str] = mapped_column(String(100), nullable=False)
	prefix: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
	key_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
	scopes: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
	active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
	created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
	updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
	last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
	notes: Mapped[str | None] = mapped_column(Text, nullable=True)
