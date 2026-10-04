from datetime import datetime, timezone

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Client(Base):
	__tablename__ = "clients"
	__table_args__ = (
		CheckConstraint("char_length(name) > 1", name="ck_clients_name_nonempty"),
		Index("ix_clients_active_created_at", "active", "created_at"),
	)

	id: Mapped[str] = mapped_column(String(36), primary_key=True)
	name: Mapped[str] = mapped_column(String(150), nullable=False, unique=True, index=True)
	active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
	created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
	updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class DeveloperSignup(Base):
	"""Someone who created a sandbox key on the website. The email isn't verified: it's a contact for following
	up, not an identity. The IP is stored only as a salted hash, for abuse investigations."""

	__tablename__ = "developer_signups"
	__table_args__ = (Index("ix_developer_signups_created_at", "created_at"),)

	id: Mapped[str] = mapped_column(String(36), primary_key=True)
	email: Mapped[str] = mapped_column(String(254), nullable=False, index=True)
	name: Mapped[str | None] = mapped_column(String(100), nullable=True)
	company: Mapped[str | None] = mapped_column(String(150), nullable=True)
	client_id: Mapped[str] = mapped_column(String(36), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
	ip_hash: Mapped[str] = mapped_column(String(32), nullable=False)
	source: Mapped[str] = mapped_column(String(32), nullable=False, default="website")
	created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
