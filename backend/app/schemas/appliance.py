from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


class ApplianceStateResponse(BaseModel):
    current_state: str
    last_changed_source: str
    last_changed_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ApplianceResponse(BaseModel):
    id: int
    name: str
    device_id: str
    relay_channel: int
    assumed_wattage_watts: float
    state: ApplianceStateResponse | None = None

    model_config = ConfigDict(from_attributes=True)

class ApplianceCommandRequest(BaseModel):
    state: Literal["ON", "OFF"]

class ApplianceCommandResponse(BaseModel):
    status: str
    appliance_id: int
    target_state: str
