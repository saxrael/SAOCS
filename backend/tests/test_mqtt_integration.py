from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.activity_log import ActivityLog
from app.models.appliance import Appliance, ApplianceState
from app.services.mqtt_service import mqtt_service
from app.services.websocket_manager import websocket_manager


@pytest.mark.asyncio
async def test_t_c1_state_message_updates_sqlite_mirror(
    db_session: AsyncSession,
    sample_appliance: Appliance,
):
    payload = {
        "channel": sample_appliance.relay_channel,
        "state": "ON",
        "source": "switch",
        "timestamp_ms": 12345,
    }
    await mqtt_service.handle_state_message(
        device_id=sample_appliance.device_id,
        payload=payload,
        session=db_session,
    )

    stmt = select(ApplianceState).where(ApplianceState.appliance_id == sample_appliance.id)
    result = await db_session.execute(stmt)
    state = result.scalar_one_or_none()
    assert state is not None
    assert state.current_state == "ON"
    assert state.last_changed_source == "switch"

@pytest.mark.asyncio
async def test_t_c2_state_message_emits_activity_log(
    db_session: AsyncSession,
    sample_appliance: Appliance,
):
    payload = {
        "channel": sample_appliance.relay_channel,
        "state": "OFF",
        "source": "switch",
        "timestamp_ms": 23456,
    }
    await mqtt_service.handle_state_message(
        device_id=sample_appliance.device_id,
        payload=payload,
        session=db_session,
    )

    stmt = (
        select(ActivityLog)
        .where(ActivityLog.appliance_id == sample_appliance.id)
        .order_by(ActivityLog.id.desc())
    )
    result = await db_session.execute(stmt)
    log = result.scalar_one_or_none()
    assert log is not None
    assert log.event_type == "POWER_OFF"
    assert log.source == "switch"
    assert log.actor_user_id is None

@pytest.mark.asyncio
async def test_t_c3_state_message_triggers_websocket_broadcast(
    db_session: AsyncSession,
    sample_appliance: Appliance,
):
    payload = {
        "channel": sample_appliance.relay_channel,
        "state": "ON",
        "source": "command",
        "timestamp_ms": 34567,
    }
    with patch.object(websocket_manager, "broadcast", AsyncMock()) as mock_broadcast:
        await mqtt_service.handle_state_message(
            device_id=sample_appliance.device_id,
            payload=payload,
            session=db_session,
        )
        mock_broadcast.assert_awaited_once()
        broadcast_data = mock_broadcast.await_args[0][0]
        assert broadcast_data["event"] == "state_change"
        assert broadcast_data["appliance_id"] == sample_appliance.id
        assert broadcast_data["device_id"] == sample_appliance.device_id
        assert broadcast_data["state"] == "ON"
        assert broadcast_data["source"] == "command"

@pytest.mark.asyncio
async def test_t_c4_lwt_status_message_triggers_websocket_broadcast(
    sample_appliance: Appliance,
):
    with patch.object(websocket_manager, "broadcast", AsyncMock()) as mock_broadcast:
        await mqtt_service.handle_status_message(
            device_id=sample_appliance.device_id,
            status_str="offline",
        )
        mock_broadcast.assert_awaited_once()
        broadcast_data = mock_broadcast.await_args[0][0]
        assert broadcast_data["event"] == "device_status"
        assert broadcast_data["device_id"] == sample_appliance.device_id
        assert broadcast_data["status"] == "offline"
