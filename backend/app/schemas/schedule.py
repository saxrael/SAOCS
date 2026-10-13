from datetime import UTC, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, field_validator


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

    @field_validator("scheduled_time", "created_at", "executed_at", mode="after")
    @classmethod
    def ensure_utc(cls, v: datetime | None) -> datetime | None:
        if v is None:
            return None
        if v.tzinfo is None:
            return v.replace(tzinfo=UTC)
        return v.astimezone(UTC)

    model_config = ConfigDict(from_attributes=True)
