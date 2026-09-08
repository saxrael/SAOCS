from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "002_seed_admin_user"
down_revision: str | None = "001_initial_schema"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

def upgrade() -> None:
    op.execute(
        sa.text(
            "INSERT INTO users (email, is_admin, failed_login_attempts) "
            "VALUES (:email, 1, 0)"
        ).bindparams(email="israelanuoluwaposimi955@gmail.com")
    )

def downgrade() -> None:
    op.execute(
        sa.text(
            "DELETE FROM users WHERE email = :email"
        ).bindparams(email="israelanuoluwaposimi955@gmail.com")
    )
