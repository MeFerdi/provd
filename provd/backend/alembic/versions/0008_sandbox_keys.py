"""sandbox API keys: score fixed test wallets for free, isolated from live data

Revision ID: 0008_sandbox_keys
Revises: 0007_release_attestations
Create Date: 2026-10-04 18:00:00
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "0008_sandbox_keys"
down_revision = "0007_release_attestations"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("api_keys", sa.Column("environment", sa.String(8), nullable=False, server_default="live"))
    op.create_check_constraint("ck_api_keys_environment", "api_keys", "environment IN ('live', 'sandbox')")


def downgrade() -> None:
    op.drop_constraint("ck_api_keys_environment", "api_keys", type_="check")
    op.drop_column("api_keys", "environment")
