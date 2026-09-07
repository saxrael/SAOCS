from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.appliance import Appliance
from app.services.mqtt_service import mqtt_service


async def get_all_appliances(session: AsyncSession) -> list[Appliance]:
    stmt = select(Appliance).options(selectinload(Appliance.state))
    result = await session.execute(stmt)
    return list(result.scalars().all())

async def get_appliance_by_id(session: AsyncSession, appliance_id: int) -> Appliance | None:
    stmt = (
        select(Appliance)
        .options(selectinload(Appliance.state))
        .where(Appliance.id == appliance_id)
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none()

async def send_appliance_command(
    session: AsyncSession,
    appliance_id: int,
    target_state: str,
    actor_user_id: int | None = None,
) -> Appliance:
    appliance = await get_appliance_by_id(session, appliance_id)
    if not appliance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Appliance {appliance_id} not found",
        )

    await mqtt_service.publish_command(
        device_id=appliance.device_id,
        channel=appliance.relay_channel,
        state=target_state,
        actor_user_id=actor_user_id,
    )
    return appliance
