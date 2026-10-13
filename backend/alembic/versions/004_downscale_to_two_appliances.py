from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "004_downscale_to_two_appliances"
down_revision: str | None = "003_seed_default_appliances"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

def upgrade() -> None:
    op.execute(
        sa.text(
            "UPDATE appliances SET relay_channel = -id"
        )
    )
    op.execute(
        sa.text(
            "UPDATE appliances "
            "SET name = 'Ceiling Light 1', relay_channel = 1, assumed_wattage_watts = 10.0 "
            "WHERE id = 1"
        )
    )
    op.execute(
        sa.text(
            "UPDATE appliances "
            "SET name = 'Ceiling Light 2', relay_channel = 2, assumed_wattage_watts = 10.0 "
            "WHERE id = 2"
        )
    )
    op.execute(
        sa.text(
            "DELETE FROM appliance_state WHERE appliance_id NOT IN (1, 2)"
        )
    )
    op.execute(
        sa.text(
            "DELETE FROM activity_log WHERE appliance_id NOT IN (1, 2)"
        )
    )
    op.execute(
        sa.text(
            "DELETE FROM schedules WHERE appliance_id NOT IN (1, 2)"
        )
    )
    op.execute(
        sa.text(
            "DELETE FROM appliances WHERE id NOT IN (1, 2)"
        )
    )

def downgrade() -> None:
    op.execute(
        sa.text(
            "INSERT INTO appliances (id, name, device_id, relay_channel, assumed_wattage_watts) "
            "VALUES (3, 'Workstation Socket', 'esp32_prototype_01', 3, 65.0), "
            "(4, 'Auxiliary / Spare', 'esp32_prototype_01', 4, 0.0)"
        )
    )
    op.execute(
        sa.text(
            "INSERT INTO appliance_state (appliance_id, current_state, last_changed_source) "
            "VALUES (3, 'OFF', 'boot'), "
            "(4, 'OFF', 'boot')"
        )
    )
