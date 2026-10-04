"""release attestations: every on-chain verifiable release authorisation Provd signed

Revision ID: 0007_release_attestations
Revises: 0006_card_payments
Create Date: 2026-10-04 14:00:00
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "0007_release_attestations"
down_revision = "0006_card_payments"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "release_attestations",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("intent_id", sa.String(64), nullable=False),
        sa.Column("account_id", sa.String(36), nullable=False),
        sa.Column("target", sa.String(16), nullable=False),
        sa.Column("domain", sa.String(128), nullable=False),
        sa.Column("recipient", sa.String(128), nullable=False),
        sa.Column("amount_base_units", sa.String(40), nullable=False),
        sa.Column("digest", sa.String(64), nullable=False),
        sa.Column("signature", sa.String(130), nullable=False),
        sa.Column("signer", sa.String(42), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_release_attestations_intent", "release_attestations", ["intent_id"])


def downgrade() -> None:
    op.drop_index("ix_release_attestations_intent", table_name="release_attestations")
    op.drop_table("release_attestations")
