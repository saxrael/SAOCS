from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "003_seed_default_appliances"
down_revision: str | None = "002_seed_admin_user"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

def upgrade() -> None:
    op.execute(
        sa.text(
            "INSERT INTO appliances (id, name, device_id, relay_channel, assumed_wattage_watts) "
            "VALUES (1, 'Ceiling Light 1', 'esp32_prototype_01', 0, 10.0), "
            "(2, 'Ceiling Light 2', 'esp32_prototype_01', 1, 10.0), "
            "(3, 'Workstation Socket', 'esp32_prototype_01', 2, 65.0), "
            "(4, 'Auxiliary / Spare', 'esp32_prototype_01', 3, 0.0)"
        )
    )
    op.execute(
        sa.text(
            "INSERT INTO appliance_state (appliance_id, current_state, last_changed_source) "
            "VALUES (1, 'OFF', 'boot'), "
            "(2, 'OFF', 'boot'), "
            "(3, 'OFF', 'boot'), "
            "(4, 'OFF', 'boot')"
        )
    )

def downgrade() -> None:
    op.execute(
        sa.text(
            "DELETE FROM appliance_state WHERE appliance_id IN (1, 2, 3, 4)"
        )
    )
    op.execute(
        sa.text(
            "DELETE FROM appliances WHERE id IN (1, 2, 3, 4)"
        )
    )
