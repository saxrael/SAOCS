from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.services.auth_service import create_setup_token, oauth


@pytest.mark.asyncio
async def test_t_a1_admin_registration_of_new_user(
    client: AsyncClient,
    admin_user: tuple[User, str],
    db_session: AsyncSession,
):
    _, token = admin_user
    response = await client.post(
        "/api/users/register",
        json={"email": "newemployee@example.com", "is_admin": False},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "newemployee@example.com"
    assert data["is_admin"] is False

    stmt = select(User).where(User.email == "newemployee@example.com")
    result = await db_session.execute(stmt)
    user = result.scalar_one_or_none()
    assert user is not None
    assert user.hashed_password is None
    assert user.google_subject_id is None

@pytest.mark.asyncio
async def test_t_a2_non_admin_registration_attempt(
    client: AsyncClient,
    regular_user: tuple[User, str],
):
    _, token = regular_user
    response = await client.post(
        "/api/users/register",
        json={"email": "unauthorized@example.com", "is_admin": False},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403

@pytest.mark.asyncio
async def test_t_a3_duplicate_email_registration(
    client: AsyncClient,
    admin_user: tuple[User, str],
):
    _, token = admin_user
    response = await client.post(
        "/api/users/register",
        json={"email": "admin@example.com", "is_admin": False},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 409

@pytest.mark.asyncio
async def test_t_a4_unregistered_email_fallback_login(client: AsyncClient):
    response = await client.post(
        "/api/auth/login",
        json={"email": "nonexistent@example.com", "password": "AnyPassword123!"},
    )
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_t_a5_unregistered_email_google_callback(client: AsyncClient):
    with patch.object(
        oauth.google,
        "authorize_access_token",
        AsyncMock(return_value={"userinfo": {"email": "stranger@example.com", "sub": "sub-999"}}),
    ):
        response = await client.get("/api/auth/google/callback")
        assert response.status_code == 403

@pytest.mark.asyncio
async def test_t_a6_first_time_google_oauth_callback(
    client: AsyncClient,
    db_session: AsyncSession,
):
    user = User(email="firsttime@example.com", hashed_password=None, is_admin=False)
    db_session.add(user)
    await db_session.commit()

    with patch.object(
        oauth.google,
        "authorize_access_token",
        AsyncMock(
            return_value={"userinfo": {"email": "firsttime@example.com", "sub": "google-sub-first"}}
        ),
    ):
        response = await client.get("/api/auth/google/callback")
        assert response.status_code == 200
        data = response.json()
        assert "setup_token" in data
        assert data.get("needs_password_setup") is True

@pytest.mark.asyncio
async def test_t_a7_valid_setup_password_execution(
    client: AsyncClient,
    db_session: AsyncSession,
):
    user = User(email="setupme@example.com", hashed_password=None, is_admin=False)
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    setup_token = create_setup_token(user.id, user.email)
    response = await client.post(
        "/api/auth/setup-password",
        json={"password": "MyNewSecurePassword123!"},
        headers={"Authorization": f"Bearer {setup_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data

    await db_session.refresh(user)
    assert user.hashed_password is not None

@pytest.mark.asyncio
async def test_t_a8_setup_password_with_invalid_token(client: AsyncClient):
    response = await client.post(
        "/api/auth/setup-password",
        json={"password": "MyNewSecurePassword123!"},
        headers={"Authorization": "Bearer invalid.token.value"},
    )
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_t_a9_subsequent_fallback_password_login(
    client: AsyncClient,
    regular_user: tuple[User, str],
):
    user, _ = regular_user
    response = await client.post(
        "/api/auth/login",
        json={"email": user.email, "password": "UserSecurePass123!"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data

@pytest.mark.asyncio
async def test_t_a10_password_login_failure_increment(
    client: AsyncClient,
    regular_user: tuple[User, str],
    db_session: AsyncSession,
):
    user, _ = regular_user
    response = await client.post(
        "/api/auth/login",
        json={"email": user.email, "password": "WrongPassword!"},
    )
    assert response.status_code == 401

    await db_session.refresh(user)
    assert user.failed_login_attempts == 1
    assert user.locked_at is None

@pytest.mark.asyncio
async def test_t_a11_lockout_after_5_failed_attempts(
    client: AsyncClient,
    regular_user: tuple[User, str],
    db_session: AsyncSession,
):
    user, _ = regular_user
    for _ in range(4):
        res = await client.post(
            "/api/auth/login",
            json={"email": user.email, "password": "WrongPassword!"},
        )
        assert res.status_code == 401

    res5 = await client.post(
        "/api/auth/login",
        json={"email": user.email, "password": "WrongPassword!"},
    )
    assert res5.status_code == 423

    await db_session.refresh(user)
    assert user.failed_login_attempts >= 5
    assert user.locked_at is not None

@pytest.mark.asyncio
async def test_t_a12_lockout_prevents_login_even_with_correct_password(
    client: AsyncClient,
    regular_user: tuple[User, str],
    db_session: AsyncSession,
):
    user, _ = regular_user
    for _ in range(5):
        await client.post(
            "/api/auth/login",
            json={"email": user.email, "password": "WrongPassword!"},
        )

    response = await client.post(
        "/api/auth/login",
        json={"email": user.email, "password": "UserSecurePass123!"},
    )
    assert response.status_code == 423

@pytest.mark.asyncio
async def test_t_a13_google_oauth_unlocks_locked_account(
    client: AsyncClient,
    regular_user: tuple[User, str],
    db_session: AsyncSession,
):
    user, _ = regular_user
    for _ in range(5):
        await client.post(
            "/api/auth/login",
            json={"email": user.email, "password": "WrongPassword!"},
        )

    await db_session.refresh(user)
    assert user.locked_at is not None

    with patch.object(
        oauth.google,
        "authorize_access_token",
        AsyncMock(return_value={"userinfo": {"email": user.email, "sub": "google-sub-unlock"}}),
    ):
        response = await client.get("/api/auth/google/callback")
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data

    await db_session.refresh(user)
    assert user.failed_login_attempts == 0
    assert user.locked_at is None
