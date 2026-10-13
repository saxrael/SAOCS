from datetime import UTC, datetime

from pydantic import BaseModel, ConfigDict, field_validator


class ActivityLogResponse(BaseModel):
    id: int
    appliance_id: int
    appliance_name: str | None = None
    event_type: str
    source: str
    actor_user_id: int | None = None
    actor_email: str | None = None
    timestamp: datetime

    @field_validator("timestamp", mode="after")
    @classmethod
    def ensure_utc(cls, v: datetime) -> datetime:
        if v.tzinfo is None:
            return v.replace(tzinfo=UTC)
        return v.astimezone(UTC)

    model_config = ConfigDict(from_attributes=True)
