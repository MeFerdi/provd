"""phase C: decision amounts for baselines, subscription billing, usage source

Revision ID: 0005_phase_c
Revises: 0004_proof_layer
Create Date: 2026-10-03 20:00:00
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "0005_phase_c"
down_revision = "0004_proof_layer"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("decisions", sa.Column("amount", sa.Float(), nullable=True))
    op.add_column("decisions", sa.Column("amount_unit", sa.String(16), nullable=True))
    op.create_index("ix_decisions_account_type_created", "decisions", ["account_id", "intent_type", "created_at"])
    op.add_column("accounts", sa.Column("plan_name", sa.String(64), nullable=True))
    op.add_column("accounts", sa.Column("monthly_included_checks", sa.Integer(), nullable=True))
    op.add_column("accounts", sa.Column("overage", sa.String(16), nullable=True))
    op.add_column("accounts", sa.Column("period_anchor_day", sa.Integer(), nullable=True))
    op.add_column("usage_events", sa.Column("source", sa.String(16), nullable=False, server_default="free"))
    op.execute("UPDATE usage_events SET source = CASE WHEN free THEN 'free' ELSE 'prepaid' END")


def downgrade() -> None:
    op.drop_column("usage_events", "source")
    for column in ("period_anchor_day", "overage", "monthly_included_checks", "plan_name"):
        op.drop_column("accounts", column)
    op.drop_index("ix_decisions_account_type_created", table_name="decisions")
    op.drop_column("decisions", "amount_unit")
    op.drop_column("decisions", "amount")
