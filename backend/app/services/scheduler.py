import asyncio
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import async_session_maker
from app.models.schedule import Schedule
from app.services.mqtt_service import mqtt_service
from app.services.websocket_manager import websocket_manager


class SchedulerService:
    def __init__(self):
        self._task: asyncio.Task | None = None
        self._running = False

    async def start(self) -> None:
        self._running = True
        self._task = asyncio.create_task(self._run())

    async def stop(self) -> None:
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

    async def _run(self) -> None:
        while self._running:
            try:
                await self.process_due_schedules()
            except Exception:
                pass
            await asyncio.sleep(2)

    async def process_due_schedules(self) -> None:
        now_utc = datetime.now(UTC)
        async with async_session_maker() as session:
            stmt = (
                select(Schedule)
                .options(selectinload(Schedule.appliance))
                .where(
                    Schedule.executed_at.is_(None),
                    Schedule.scheduled_time <= now_utc,
                )
                .order_by(Schedule.scheduled_time.asc())
            )
            result = await session.execute(stmt)
            schedules = result.scalars().all()

            for schedule in schedules:
                if not schedule.appliance:
                    continue
                try:
                    await mqtt_service.publish_command(
                        device_id=schedule.appliance.device_id,
                        channel=schedule.appliance.relay_channel,
                        state=schedule.action,
                        actor_user_id=schedule.created_by,
                    )
                    schedule.executed_at = now_utc
                    session.add(schedule)
                    await session.commit()
                    await websocket_manager.broadcast({
                        "event": "schedule_executed",
                        "schedule_id": schedule.id,
                        "appliance_id": schedule.appliance_id,
                        "action": schedule.action,
                        "timestamp": now_utc.isoformat(),
                    })
                except Exception:
                    pass

scheduler_service = SchedulerService()
