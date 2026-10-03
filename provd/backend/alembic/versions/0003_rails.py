"""rails: decisions, outcomes, flagged addresses, history cache, checkpoints, credits ledger

Revision ID: 0003_rails
Revises: 0002_prod_constraints
Create Date: 2026-10-03 16:00:00
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "0003_rails"
down_revision = "0002_prod_constraints"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "decisions",
        sa.Column("intent_id", sa.String(64), primary_key=True),
        sa.Column("account_id", sa.String(36), nullable=False),
        sa.Column("idempotency_key", sa.String(128), nullable=True),
        sa.Column("chain", sa.String(16), nullable=False),
        sa.Column("intent_type", sa.String(32), nullable=False),
        sa.Column("wallet_address", sa.String(128), nullable=True),
        sa.Column("phone_hash", sa.String(128), nullable=True),
        sa.Column("score", sa.Integer(), nullable=False),
        sa.Column("risk_level", sa.String(16), nullable=False),
        sa.Column("recommended_action", sa.String(24), nullable=False),
        sa.Column("engine_version", sa.String(32), nullable=False),
        sa.Column("record", sa.JSON(), nullable=False),
        sa.Column("record_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("account_id", "idempotency_key", name="uq_decisions_account_idempotency"),
    )
    op.create_index("ix_decisions_account_created", "decisions", ["account_id", "created_at"])
    op.create_index("ix_decisions_wallet_address", "decisions", ["wallet_address"])
    op.create_index("ix_decisions_phone_hash", "decisions", ["phone_hash"])

    op.create_table(
        "outcomes",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("account_id", sa.String(36), nullable=False),
        sa.Column("intent_id", sa.String(64), nullable=True),
        sa.Column("chain", sa.String(16), nullable=False),
        sa.Column("wallet_address", sa.String(128), nullable=True),
        sa.Column("phone_hash", sa.String(128), nullable=True),
        sa.Column("outcome", sa.String(24), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_outcomes_account_wallet", "outcomes", ["account_id", "wallet_address"])
    op.create_index("ix_outcomes_account_phone", "outcomes", ["account_id", "phone_hash"])

    op.create_table(
        "flagged_addresses",
        sa.Column("chain", sa.String(16), primary_key=True),
        sa.Column("address", sa.String(128), primary_key=True),
        sa.Column("source", sa.String(48), nullable=False),
        sa.Column("reference", sa.String(128), nullable=True),
        sa.Column("flagged_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.create_table(
        "history_cache",
        sa.Column("chain", sa.String(16), primary_key=True),
        sa.Column("address", sa.String(128), primary_key=True),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("fetched_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "indexer_checkpoints",
        sa.Column("name", sa.String(64), primary_key=True),
        sa.Column("cursor", sa.String(128), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "accounts",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("billing_model", sa.String(16), nullable=False, server_default="payg"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "credit_purchases",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("account_id", sa.String(36), nullable=False),
        sa.Column("bundle", sa.String(16), nullable=False),
        sa.Column("checks", sa.Integer(), nullable=False),
        sa.Column("amount_due", sa.String(32), nullable=False),
        sa.Column("currency", sa.String(8), nullable=False),
        sa.Column("method", sa.String(16), nullable=False),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("reference", sa.String(128), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_credit_purchases_account_status", "credit_purchases", ["account_id", "status"])
    op.create_table(
        "usage_events",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("account_id", sa.String(36), nullable=False),
        sa.Column("intent_id", sa.String(64), nullable=False),
        sa.Column("units", sa.Integer(), nullable=False),
        sa.Column("free", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_usage_events_account_created", "usage_events", ["account_id", "created_at"])


def downgrade() -> None:
    for table in ("usage_events", "credit_purchases", "accounts", "indexer_checkpoints", "history_cache", "flagged_addresses", "outcomes", "decisions"):
        op.drop_table(table)
