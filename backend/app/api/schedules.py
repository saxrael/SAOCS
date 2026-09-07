from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.database import get_db
from app.models.appliance import Appliance
from app.models.schedule import Schedule
from app.models.user import User
from app.schemas.schedule import ScheduleCreateRequest, ScheduleResponse

router = APIRouter(prefix="/schedules", tags=["schedules"])

@router.get("/", response_model=list[ScheduleResponse])
async def list_schedules(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    stmt = select(Schedule).order_by(Schedule.scheduled_time.asc())
    result = await session.execute(stmt)
    return list(result.scalars().all())

@router.post("/", response_model=ScheduleResponse, status_code=status.HTTP_201_CREATED)
async def create_schedule(
    body: ScheduleCreateRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    stmt = select(Appliance).where(Appliance.id == body.appliance_id)
    result = await session.execute(stmt)
    appliance = result.scalar_one_or_none()
    if not appliance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Appliance {body.appliance_id} not found",
        )

    schedule = Schedule(
        appliance_id=body.appliance_id,
        action=body.action,
        scheduled_time=body.scheduled_time,
        created_by=current_user.id,
    )
    session.add(schedule)
    await session.commit()
    await session.refresh(schedule)
    return schedule

@router.delete("/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_schedule(
    schedule_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    stmt = select(Schedule).where(Schedule.id == schedule_id)
    result = await session.execute(stmt)
    schedule = result.scalar_one_or_none()
    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Schedule {schedule_id} not found",
        )

    if not current_user.is_admin and schedule.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete a schedule created by another user",
        )

    await session.delete(schedule)
    await session.commit()
