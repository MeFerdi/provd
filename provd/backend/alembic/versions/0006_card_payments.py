"""card top-ups: Paystack checkout url on credit purchases

Revision ID: 0006_card_payments
Revises: 0005_phase_c
Create Date: 2026-10-04 12:00:00
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "0006_card_payments"
down_revision = "0005_phase_c"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("credit_purchases", sa.Column("checkout_url", sa.String(512), nullable=True))


def downgrade() -> None:
    op.drop_column("credit_purchases", "checkout_url")
