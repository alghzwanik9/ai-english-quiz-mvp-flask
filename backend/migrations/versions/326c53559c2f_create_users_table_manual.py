"""create users table manual

Revision ID: 326c53559c2f
Revises: afb867f2029f
Create Date: 2026-02-03 15:04:41.653226

"""
from alembic import op
import sqlalchemy as sa



# revision identifiers, used by Alembic.
revision = "326c53559c2f"
down_revision = 'afb867f2029f'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=160), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False, server_default="student"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")

