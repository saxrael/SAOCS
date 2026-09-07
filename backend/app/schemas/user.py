from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr


class UserRegisterRequest(BaseModel):
    email: EmailStr
    is_admin: bool = False

class UserResponse(BaseModel):
    id: int
    email: str
    is_admin: bool
    created_at: datetime
    failed_login_attempts: int
    locked_at: datetime | None

    model_config = ConfigDict(from_attributes=True)
