from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.appliance import (
    ApplianceCommandRequest,
    ApplianceCommandResponse,
    ApplianceResponse,
)
from app.services.appliance_service import get_all_appliances, send_appliance_command

router = APIRouter(prefix="/appliances", tags=["appliances"])

@router.get("/", response_model=list[ApplianceResponse])
async def list_appliances(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    return await get_all_appliances(session)

@router.post("/{appliance_id}/command", response_model=ApplianceCommandResponse)
async def command_appliance(
    appliance_id: int,
    body: ApplianceCommandRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    await send_appliance_command(
        session=session,
        appliance_id=appliance_id,
        target_state=body.state,
        actor_user_id=current_user.id,
    )
    return ApplianceCommandResponse(
        status="command_published",
        appliance_id=appliance_id,
        target_state=body.state,
    )
