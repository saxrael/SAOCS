from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_admin
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserRegisterRequest, UserResponse

router = APIRouter(prefix="/users", tags=["users"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    body: UserRegisterRequest,
    current_admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db),
):
    stmt = select(User).where(User.email == body.email)
    result = await session.execute(stmt)
    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User with this email already exists",
        )

    new_user = User(
        email=body.email,
        is_admin=body.is_admin,
        hashed_password=None,
        google_subject_id=None,
    )
    session.add(new_user)
    await session.commit()
    await session.refresh(new_user)
    return new_user

@router.get("/", response_model=list[UserResponse])
async def list_users(
    current_admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db),
):
    stmt = select(User).order_by(User.id)
    result = await session.execute(stmt)
    return list(result.scalars().all())
