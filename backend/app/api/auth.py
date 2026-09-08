from urllib.parse import urlencode

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.config import settings
from app.database import get_db
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    RefreshRequest,
    SetupPasswordRequest,
    TokenResponse,
)
from app.schemas.user import UserResponse
from app.services.auth_service import (
    create_access_token,
    create_refresh_token,
    create_setup_token,
    hash_password,
    is_account_locked,
    oauth,
    record_failed_login,
    reset_failed_logins,
    verify_password,
    verify_refresh_token,
    verify_setup_token,
)

router = APIRouter(prefix="/auth", tags=["auth"])

@router.get("/google/login")
async def google_login(request: Request):
    return await oauth.google.authorize_redirect(request, settings.google_redirect_uri)

@router.get("/google/callback")
async def google_callback(
    request: Request,
    session: AsyncSession = Depends(get_db),
):
    token = await oauth.google.authorize_access_token(request)
    user_info = token.get("userinfo")
    if not user_info:
        user_info = await oauth.google.userinfo(token=token)

    email = user_info.get("email")
    google_subject_id = user_info.get("sub")

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google account missing email address",
        )

    stmt = select(User).where(User.email == email)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User email not registered. Contact an administrator.",
        )

    if google_subject_id and user.google_subject_id != google_subject_id:
        user.google_subject_id = google_subject_id

    await reset_failed_logins(session, user)

    if user.hashed_password is None:
        setup_token = create_setup_token(user.id, user.email)
        redirect_params = urlencode({"setup_token": setup_token})
        return RedirectResponse(
            url=f"{settings.frontend_url}/setup-password?{redirect_params}"
        )

    access_token = create_access_token(user.id, user.email, user.is_admin)
    refresh_token = create_refresh_token(user.id)
    redirect_params = urlencode({
        "access_token": access_token,
        "refresh_token": refresh_token,
    })
    return RedirectResponse(
        url=f"{settings.frontend_url}/auth/callback?{redirect_params}"
    )

@router.post("/setup-password", response_model=TokenResponse)
async def setup_password(
    body: SetupPasswordRequest,
    authorization: str | None = Header(default=None),
    session: AsyncSession = Depends(get_db),
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid setup token",
        )

    token = authorization.split(" ", 1)[1]
    user_id, email = verify_setup_token(token)

    stmt = select(User).where(User.id == user_id)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    user.hashed_password = hash_password(body.password)
    await reset_failed_logins(session, user)

    access_token = create_access_token(user.id, user.email, user.is_admin)
    refresh_token = create_refresh_token(user.id)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)

@router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginRequest,
    session: AsyncSession = Depends(get_db),
):
    stmt = select(User).where(User.email == body.email)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    if is_account_locked(user):
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail="Account is locked. Unlock via Google OAuth.",
        )

    if user.hashed_password is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Password not set up. Please log in via Google OAuth first.",
        )

    if not verify_password(body.password, user.hashed_password):
        await record_failed_login(session, user)
        if is_account_locked(user):
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail=(
                    "Account is locked due to too many failed attempts. Unlock via Google OAuth."
                ),
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    await reset_failed_logins(session, user)

    access_token = create_access_token(user.id, user.email, user.is_admin)
    refresh_token = create_refresh_token(user.id)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)

@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    body: RefreshRequest,
    session: AsyncSession = Depends(get_db),
):
    user_id = verify_refresh_token(body.refresh_token)
    stmt = select(User).where(User.id == user_id)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    access_token = create_access_token(user.id, user.email, user.is_admin)
    refresh_token = create_refresh_token(user.id)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)

@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)):
    return current_user
