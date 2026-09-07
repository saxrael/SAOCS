from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ActivityLogResponse(BaseModel):
    id: int
    appliance_id: int
    appliance_name: str | None = None
    event_type: str
    source: str
    actor_user_id: int | None = None
    actor_email: str | None = None
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)
