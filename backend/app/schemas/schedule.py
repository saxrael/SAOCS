from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


class ScheduleCreateRequest(BaseModel):
    appliance_id: int
    action: Literal["ON", "OFF"]
    scheduled_time: datetime

class ScheduleResponse(BaseModel):
    id: int
    appliance_id: int
    action: str
    scheduled_time: datetime
    created_by: int | None = None
    created_at: datetime
    executed_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
