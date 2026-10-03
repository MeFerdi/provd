"""posture ratings: protocols, posture snapshots, posture changes, early access requests

Revision ID: 0003_posture_ratings
Revises: 0002_prod_constraints
Create Date: 2026-10-02 22:00:00
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "0003_posture_ratings"
down_revision = "0002_prod_constraints"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "protocols",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("slug", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("category", sa.String(length=40), nullable=False),
        sa.Column("website", sa.String(length=200), nullable=True),
        sa.Column("framework", sa.String(length=32), nullable=False),
        sa.Column("chain", sa.String(length=32), nullable=False),
        sa.Column("contract", sa.String(length=42), nullable=False),
        sa.Column("published", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("last_checked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_protocols_slug", "protocols", ["slug"], unique=True)
    op.create_index("ix_protocols_chain_contract", "protocols", ["chain", "contract"], unique=True)

    op.create_table(
        "posture_snapshots",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("protocol_id", sa.String(length=36), sa.ForeignKey("protocols.id", ondelete="CASCADE"), nullable=False),
        sa.Column("fingerprint", sa.String(length=64), nullable=False),
        sa.Column("grade", sa.String(length=1), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False),
        sa.Column("risk_level", sa.String(length=16), nullable=False),
        sa.Column("posture", sa.JSON(), nullable=False),
        sa.Column("checked_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_posture_snapshots_protocol_checked", "posture_snapshots", ["protocol_id", "checked_at"], unique=False)

    op.create_table(
        "posture_changes",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("protocol_id", sa.String(length=36), sa.ForeignKey("protocols.id", ondelete="CASCADE"), nullable=False),
        sa.Column("detected_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("kind", sa.String(length=40), nullable=False),
        sa.Column("severity", sa.String(length=16), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("pathway", sa.Integer(), nullable=True),
        sa.Column("before", sa.JSON(), nullable=True),
        sa.Column("after", sa.JSON(), nullable=True),
    )
    op.create_index("ix_posture_changes_protocol_detected", "posture_changes", ["protocol_id", "detected_at"], unique=False)

    op.create_table(
        "early_access_requests",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("email", sa.String(length=254), nullable=False),
        sa.Column("organization", sa.String(length=120), nullable=True),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_early_access_requests_email", "early_access_requests", ["email"], unique=False)


def downgrade() -> None:
    op.drop_table("early_access_requests")
    op.drop_table("posture_changes")
    op.drop_table("posture_snapshots")
    op.drop_table("protocols")
