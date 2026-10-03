"""proof layer: decision signatures, merkle batches, anchors

Revision ID: 0004_proof_layer
Revises: 0003_rails
Create Date: 2026-10-03 18:00:00
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "0004_proof_layer"
down_revision = "0003_rails"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("decisions", sa.Column("signature", sa.String(128), nullable=True))
    op.add_column("decisions", sa.Column("signing_key_id", sa.String(16), nullable=True))
    op.add_column("decisions", sa.Column("batch_id", sa.String(36), nullable=True))
    op.add_column("decisions", sa.Column("leaf_index", sa.Integer(), nullable=True))
    op.add_column("decisions", sa.Column("merkle_proof", sa.JSON(), nullable=True))
    op.create_index("ix_decisions_batch_id", "decisions", ["batch_id"])
    op.create_table(
        "anchor_batches",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("merkle_root", sa.String(64), nullable=False, unique=True),
        sa.Column("leaf_count", sa.Integer(), nullable=False),
        sa.Column("sealed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("anchor_method", sa.String(24), nullable=False),
        sa.Column("anchor_status", sa.String(16), nullable=False),
        sa.Column("anchor_proof", sa.LargeBinary(), nullable=True),
        sa.Column("anchor_reference", sa.String(128), nullable=True),
        sa.Column("anchor_detail", sa.String(512), nullable=True),
        sa.Column("anchored_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_attempt_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_anchor_batches_status_sealed", "anchor_batches", ["anchor_status", "sealed_at"])


def downgrade() -> None:
    op.drop_table("anchor_batches")
    op.drop_index("ix_decisions_batch_id", table_name="decisions")
    for column in ("merkle_proof", "leaf_index", "batch_id", "signing_key_id", "signature"):
        op.drop_column("decisions", column)
