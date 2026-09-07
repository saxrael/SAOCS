from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "001_initial_schema"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=True),
        sa.Column("google_subject_id", sa.String(length=255), nullable=True),
        sa.Column("is_admin", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "failed_login_attempts",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column("locked_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_google_subject_id", "users", ["google_subject_id"], unique=True)

    op.create_table(
        "appliances",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("device_id", sa.String(length=100), nullable=False),
        sa.Column("relay_channel", sa.Integer(), nullable=False),
        sa.Column(
            "assumed_wattage_watts",
            sa.Float(),
            nullable=False,
            server_default=sa.text("100.0"),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("device_id", "relay_channel", name="uq_device_relay_channel"),
    )
    op.create_index("ix_appliances_device_id", "appliances", ["device_id"])

    op.create_table(
        "appliance_state",
        sa.Column("appliance_id", sa.Integer(), nullable=False),
        sa.Column(
            "current_state",
            sa.String(length=10),
            nullable=False,
            server_default=sa.text("'OFF'"),
        ),
        sa.Column(
            "last_changed_source",
            sa.String(length=20),
            nullable=False,
            server_default=sa.text("'boot'"),
        ),
        sa.Column(
            "last_changed_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(["appliance_id"], ["appliances.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("appliance_id"),
    )

    op.create_table(
        "activity_log",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("appliance_id", sa.Integer(), nullable=False),
        sa.Column("event_type", sa.String(length=20), nullable=False),
        sa.Column("source", sa.String(length=20), nullable=False),
        sa.Column("actor_user_id", sa.Integer(), nullable=True),
        sa.Column(
            "timestamp",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(["appliance_id"], ["appliances.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_activity_log_appliance_id", "activity_log", ["appliance_id"])
    op.create_index("ix_activity_log_actor_user_id", "activity_log", ["actor_user_id"])
    op.create_index("ix_activity_log_timestamp", "activity_log", ["timestamp"])

    op.create_table(
        "schedules",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("appliance_id", sa.Integer(), nullable=False),
        sa.Column("action", sa.String(length=10), nullable=False),
        sa.Column("scheduled_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("executed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["appliance_id"], ["appliances.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_schedules_appliance_id", "schedules", ["appliance_id"])
    op.create_index("ix_schedules_scheduled_time", "schedules", ["scheduled_time"])
    op.create_index("ix_schedules_created_by", "schedules", ["created_by"])

def downgrade() -> None:
    op.drop_table("schedules")
    op.drop_table("activity_log")
    op.drop_table("appliance_state")
    op.drop_table("appliances")
    op.drop_table("users")
