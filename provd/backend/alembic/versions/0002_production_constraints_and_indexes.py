"""add production constraints and indexes

Revision ID: 0002_prod_constraints
Revises: 0001_initial_persistence
Create Date: 2026-04-14 01:00:00
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "0002_prod_constraints"
down_revision = "0001_initial_persistence"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("api_keys", sa.Column("client_id", sa.String(length=36), nullable=True))
    op.create_foreign_key(
        "fk_api_keys_client_id_clients",
        "api_keys",
        "clients",
        ["client_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.create_check_constraint("ck_clients_name_nonempty", "clients", "char_length(name) > 1")
    op.create_check_constraint("ck_api_keys_prefix_length", "api_keys", "char_length(prefix) >= 4")
    op.create_check_constraint("ck_disputes_amount_nonnegative", "disputes", "amount >= 0")
    op.create_check_constraint("ck_disputes_confidence_range", "disputes", "confidence >= 0 AND confidence <= 1")
    op.create_check_constraint("ck_score_logs_score_range", "score_logs", "score >= 0 AND score <= 1")
    op.create_check_constraint(
        "ck_score_logs_risk_level_values",
        "score_logs",
        "risk_level IN ('low', 'medium', 'high')",
    )

    op.create_index("ix_clients_active_created_at", "clients", ["active", "created_at"], unique=False)
    op.create_index("ix_api_keys_active_created_at", "api_keys", ["active", "created_at"], unique=False)
    op.create_index("ix_api_keys_client_active", "api_keys", ["client_id", "active"], unique=False)
    op.create_index(
        "ix_disputes_counterparty_created_at",
        "disputes",
        ["counterparty_id", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_score_logs_entity_created_at",
        "score_logs",
        ["entity_id", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_score_logs_risk_level_created_at",
        "score_logs",
        ["risk_level", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_score_logs_risk_level_created_at", table_name="score_logs")
    op.drop_index("ix_score_logs_entity_created_at", table_name="score_logs")
    op.drop_index("ix_disputes_counterparty_created_at", table_name="disputes")
    op.drop_index("ix_api_keys_client_active", table_name="api_keys")
    op.drop_index("ix_api_keys_active_created_at", table_name="api_keys")
    op.drop_index("ix_clients_active_created_at", table_name="clients")

    op.drop_constraint("ck_score_logs_risk_level_values", "score_logs", type_="check")
    op.drop_constraint("ck_score_logs_score_range", "score_logs", type_="check")
    op.drop_constraint("ck_disputes_confidence_range", "disputes", type_="check")
    op.drop_constraint("ck_disputes_amount_nonnegative", "disputes", type_="check")
    op.drop_constraint("ck_api_keys_prefix_length", "api_keys", type_="check")
    op.drop_constraint("ck_clients_name_nonempty", "clients", type_="check")

    op.drop_constraint("fk_api_keys_client_id_clients", "api_keys", type_="foreignkey")
    op.drop_column("api_keys", "client_id")
