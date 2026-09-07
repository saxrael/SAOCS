from pydantic import BaseModel, ConfigDict, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class SetupPasswordRequest(BaseModel):
    password: str = Field(min_length=8)

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class SetupTokenResponse(BaseModel):
    setup_token: str
    needs_password_setup: bool = True

class RefreshRequest(BaseModel):
    refresh_token: str

class TokenData(BaseModel):
    user_id: int
    email: str
    is_admin: bool
    token_type: str

    model_config = ConfigDict(from_attributes=True)
