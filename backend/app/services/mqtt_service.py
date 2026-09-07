import asyncio
import json
import time
from datetime import UTC, datetime

import aiomqtt
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import async_session_maker
from app.models.activity_log import ActivityLog
from app.models.appliance import Appliance, ApplianceState
from app.services.websocket_manager import websocket_manager


class MqttService:
    def __init__(self):
        self.client: aiomqtt.Client | None = None
        self._listener_task: asyncio.Task | None = None
        self._running: bool = False
        self.last_command_time: dict[tuple[str, int], float] = {}
        self.pending_actors: dict[tuple[str, int], int | None] = {}

    async def start(self) -> None:
        self._running = True
        self._listener_task = asyncio.create_task(self._run_loop())

    async def stop(self) -> None:
        self._running = False
        if self._listener_task and not self._listener_task.done():
            self._listener_task.cancel()
            try:
                await self._listener_task
            except asyncio.CancelledError:
                pass
        self.client = None

    async def _run_loop(self) -> None:
        while self._running:
            try:
                async with aiomqtt.Client(
                    hostname=settings.mqtt_broker_host,
                    port=settings.mqtt_port,
                    username=settings.mqtt_backend_user,
                    password=settings.mqtt_backend_password,
                    identifier="saocs_backend_service",
                ) as client:
                    self.client = client
                    await client.subscribe("office/+/state", qos=1)
                    await client.subscribe("office/+/status", qos=1)
                    async for message in client.messages:
                        await self.process_message(
                            str(message.topic),
                            (
                                message.payload.decode("utf-8")
                                if isinstance(message.payload, (bytes, bytearray))
                                else str(message.payload)
                            ),
                        )
            except asyncio.CancelledError:
                break
            except Exception:
                await asyncio.sleep(2)

    async def process_message(self, topic: str, payload_str: str) -> None:
        parts = topic.split("/")
        if len(parts) != 3 or parts[0] != "office":
            return
        device_id = parts[1]
        action_type = parts[2]

        if action_type == "state":
            try:
                payload = json.loads(payload_str)
                async with async_session_maker() as session:
                    await self.handle_state_message(device_id, payload, session)
            except Exception:
                pass
        elif action_type == "status":
            await self.handle_status_message(device_id, payload_str.strip())

    async def handle_state_message(
        self,
        device_id: str,
        payload: dict,
        session: AsyncSession,
    ) -> None:
        channel = payload.get("channel")
        state_str = payload.get("state")
        source = payload.get("source", "boot")
        if channel is None or state_str is None:
            return

        stmt = select(Appliance).where(
            Appliance.device_id == device_id,
            Appliance.relay_channel == channel,
        )
        result = await session.execute(stmt)
        appliance = result.scalar_one_or_none()
        if not appliance:
            return

        state_stmt = select(ApplianceState).where(ApplianceState.appliance_id == appliance.id)
        state_result = await session.execute(state_stmt)
        appliance_state = state_result.scalar_one_or_none()

        now = datetime.now(UTC)
        if appliance_state:
            appliance_state.current_state = state_str
            appliance_state.last_changed_source = source
            appliance_state.last_changed_at = now
        else:
            appliance_state = ApplianceState(
                appliance_id=appliance.id,
                current_state=state_str,
                last_changed_source=source,
                last_changed_at=now,
            )
            session.add(appliance_state)

        actor_id = None
        if source == "command":
            actor_id = self.pending_actors.pop((device_id, channel), None)

        activity = ActivityLog(
            appliance_id=appliance.id,
            event_type="POWER_ON" if state_str == "ON" else "POWER_OFF",
            source=source,
            actor_user_id=actor_id,
            timestamp=now,
        )
        session.add(activity)
        await session.commit()

        await websocket_manager.broadcast({
            "event": "state_change",
            "appliance_id": appliance.id,
            "device_id": device_id,
            "channel": channel,
            "state": state_str,
            "source": source,
            "timestamp": now.isoformat(),
        })

    async def handle_status_message(self, device_id: str, status_str: str) -> None:
        now = datetime.now(UTC)
        await websocket_manager.broadcast({
            "event": "device_status",
            "device_id": device_id,
            "status": status_str,
            "timestamp": now.isoformat(),
        })

    async def publish_command(
        self,
        device_id: str,
        channel: int,
        state: str,
        actor_user_id: int | None = None,
    ) -> None:
        key = (device_id, channel)
        now = time.monotonic()
        last_time = self.last_command_time.get(key, 0.0)
        cooldown_seconds = settings.relay_debounce_ms / 1000.0

        if now - last_time < cooldown_seconds:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Relay cooldown active. Minimum 1000ms between commands.",
            )

        self.last_command_time[key] = now
        self.pending_actors[key] = actor_user_id

        topic = f"office/{device_id}/command"
        payload = json.dumps({"channel": channel, "state": state})

        if self.client:
            await self.client.publish(topic, payload=payload, qos=1)

mqtt_service = MqttService()
