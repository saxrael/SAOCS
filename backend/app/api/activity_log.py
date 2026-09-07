import csv
import io

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.dependencies import get_current_admin, get_current_user
from app.database import get_db
from app.models.activity_log import ActivityLog
from app.models.user import User
from app.schemas.activity_log import ActivityLogResponse

router = APIRouter(prefix="/activity-log", tags=["activity-log"])

@router.get("/", response_model=list[ActivityLogResponse])
async def list_activity_logs(
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    appliance_id: int | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    stmt = (
        select(ActivityLog)
        .options(
            selectinload(ActivityLog.appliance),
            selectinload(ActivityLog.actor_user),
        )
        .order_by(ActivityLog.timestamp.desc())
        .offset(offset)
        .limit(limit)
    )
    if appliance_id is not None:
        stmt = stmt.where(ActivityLog.appliance_id == appliance_id)

    result = await session.execute(stmt)
    logs = result.scalars().all()

    response = []
    for log in logs:
        response.append(
            ActivityLogResponse(
                id=log.id,
                appliance_id=log.appliance_id,
                appliance_name=log.appliance.name if log.appliance else None,
                event_type=log.event_type,
                source=log.source,
                actor_user_id=log.actor_user_id,
                actor_email=log.actor_user.email if log.actor_user else None,
                timestamp=log.timestamp,
            )
        )
    return response

@router.get("/export")
async def export_activity_logs(
    current_admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db),
):
    stmt = (
        select(ActivityLog)
        .options(
            selectinload(ActivityLog.appliance),
            selectinload(ActivityLog.actor_user),
        )
        .order_by(ActivityLog.timestamp.desc())
    )
    result = await session.execute(stmt)
    logs = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "id",
        "appliance_id",
        "appliance_name",
        "event_type",
        "source",
        "actor_user_id",
        "actor_email",
        "timestamp",
    ])

    for log in logs:
        writer.writerow([
            log.id,
            log.appliance_id,
            log.appliance.name if log.appliance else "",
            log.event_type,
            log.source,
            log.actor_user_id or "",
            log.actor_user.email if log.actor_user else "",
            log.timestamp.isoformat(),
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=activity_log_export.csv"},
    )
