"""developer signups: sandbox keys created on the website

Revision ID: 0009_developer_signups
Revises: 0008_sandbox_keys
Create Date: 2026-10-05 09:00:00
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "0009_developer_signups"
down_revision = "0008_sandbox_keys"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "developer_signups",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("email", sa.String(254), nullable=False),
        sa.Column("name", sa.String(100), nullable=True),
        sa.Column("company", sa.String(150), nullable=True),
        sa.Column("client_id", sa.String(36), sa.ForeignKey("clients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("ip_hash", sa.String(32), nullable=False),
        sa.Column("source", sa.String(32), nullable=False, server_default="website"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_developer_signups_email", "developer_signups", ["email"])
    op.create_index("ix_developer_signups_created_at", "developer_signups", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_developer_signups_created_at", table_name="developer_signups")
    op.drop_index("ix_developer_signups_email", table_name="developer_signups")
    op.drop_table("developer_signups")
