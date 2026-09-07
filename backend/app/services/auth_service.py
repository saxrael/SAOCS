import uuid
from datetime import UTC, datetime, timedelta

import bcrypt
import jwt
from authlib.integrations.starlette_client import OAuth
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.user import User
from app.schemas.auth import TokenData

oauth = OAuth()
oauth.register(
    name="google",
    client_id=settings.google_client_id,
    client_secret=settings.google_client_secret,
    authorize_url="https://accounts.google.com/o/oauth2/v2/auth",
    access_token_url="https://oauth2.googleapis.com/token",
    client_kwargs={"scope": "openid email profile"},
)

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def create_access_token(user_id: int, email: str, is_admin: bool) -> str:
    now = datetime.now(UTC)
    expire = now + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {
        "sub": str(user_id),
        "email": email,
        "is_admin": is_admin,
        "token_type": "access",
        "exp": expire,
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.algorithm)

def create_refresh_token(user_id: int) -> str:
    now = datetime.now(UTC)
    expire = now + timedelta(days=settings.refresh_token_expire_days)
    payload = {
        "sub": str(user_id),
        "token_id": str(uuid.uuid4()),
        "token_type": "refresh",
        "exp": expire,
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.algorithm)

def create_setup_token(user_id: int, email: str) -> str:
    now = datetime.now(UTC)
    expire = now + timedelta(minutes=settings.setup_token_expire_minutes)
    payload = {
        "sub": str(user_id),
        "email": email,
        "purpose": "password_setup",
        "exp": expire,
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.algorithm)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.algorithm])
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

def verify_access_token(token: str) -> TokenData:
    payload = decode_token(token)
    if payload.get("token_type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
        )
    return TokenData(
        user_id=int(payload["sub"]),
        email=payload["email"],
        is_admin=bool(payload.get("is_admin", False)),
        token_type=payload["token_type"],
    )

def verify_setup_token(token: str) -> tuple[int, str]:
    payload = decode_token(token)
    if payload.get("purpose") != "password_setup":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token purpose",
        )
    return int(payload["sub"]), payload["email"]

def verify_refresh_token(token: str) -> int:
    payload = decode_token(token)
    if payload.get("token_type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
        )
    return int(payload["sub"])

def is_account_locked(user: User) -> bool:
    if user.locked_at is not None:
        return True
    if user.failed_login_attempts >= 5:
        return True
    return False

async def record_failed_login(session: AsyncSession, user: User) -> None:
    user.failed_login_attempts += 1
    if user.failed_login_attempts >= 5:
        user.locked_at = datetime.now(UTC)
    await session.commit()

async def reset_failed_logins(session: AsyncSession, user: User) -> None:
    user.failed_login_attempts = 0
    user.locked_at = None
    await session.commit()
