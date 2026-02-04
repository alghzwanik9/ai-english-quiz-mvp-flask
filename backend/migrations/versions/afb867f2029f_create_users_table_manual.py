"""create users table manual

Revision ID: afb867f2029f
Revises: 78c7cd6d0808
Create Date: 2026-02-03 14:49:28.802875

"""
from alembic import op
import sqlalchemy as sa



# revision identifiers, used by Alembic.
revision = "afb867f2029f"
down_revision = '78c7cd6d0808'
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
