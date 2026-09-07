import asyncio
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, patch

import jwt
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from app.config import settings
from app.main import app
from app.models.appliance import Appliance
from app.models.user import User
from app.services.auth_service import (
    create_refresh_token,
    create_setup_token,
    oauth,
)


@pytest.mark.asyncio
async def test_adversarial_cooldown_rapid_burst(
    client: AsyncClient,
    regular_user: tuple[User, str],
    sample_appliance: Appliance,
):
    _, token = regular_user
    headers = {"Authorization": f"Bearer {token}"}
    url = f"/api/appliances/{sample_appliance.id}/command"

    first_res = await client.post(url, json={"state": "ON"}, headers=headers)
    assert first_res.status_code == 200

    burst_results = await asyncio.gather(
        client.post(url, json={"state": "OFF"}, headers=headers),
        client.post(url, json={"state": "ON"}, headers=headers),
        client.post(url, json={"state": "OFF"}, headers=headers),
        client.post(url, json={"state": "ON"}, headers=headers),
    )
    for res in burst_results:
        assert res.status_code == 429
        assert "Relay cooldown active" in res.json()["detail"]


@pytest.mark.asyncio
async def test_adversarial_cooldown_multi_channel_independence(
    client: AsyncClient,
    regular_user: tuple[User, str],
    db_session: AsyncSession,
):
    _, token = regular_user
    headers = {"Authorization": f"Bearer {token}"}

    app1 = Appliance(
        name="Light 1",
        device_id="esp32_prototype_01",
        relay_channel=0,
        assumed_wattage_watts=40.0,
    )
    app2 = Appliance(
        name="Light 2",
        device_id="esp32_prototype_01",
        relay_channel=1,
        assumed_wattage_watts=40.0,
    )
    db_session.add_all([app1, app2])
    await db_session.commit()
    await db_session.refresh(app1)
    await db_session.refresh(app2)

    res1 = await client.post(
        f"/api/appliances/{app1.id}/command",
        json={"state": "ON"},
        headers=headers,
    )
    assert res1.status_code == 200

    res2 = await client.post(
        f"/api/appliances/{app2.id}/command",
        json={"state": "ON"},
        headers=headers,
    )
    assert res2.status_code == 200

    res1_rapid = await client.post(
        f"/api/appliances/{app1.id}/command",
        json={"state": "OFF"},
        headers=headers,
    )
    assert res1_rapid.status_code == 429

    res2_rapid = await client.post(
        f"/api/appliances/{app2.id}/command",
        json={"state": "OFF"},
        headers=headers,
    )
    assert res2_rapid.status_code == 429


@pytest.mark.asyncio
async def test_adversarial_lockout_boundary_and_oauth_recovery(
    client: AsyncClient,
    regular_user: tuple[User, str],
    db_session: AsyncSession,
):
    user, _ = regular_user

    for attempt in range(1, 5):
        res = await client.post(
            "/api/auth/login",
            json={"email": user.email, "password": "WrongPasswordAttempt"},
        )
        assert res.status_code == 401
        await db_session.refresh(user)
        assert user.failed_login_attempts == attempt
        assert user.locked_at is None

    res_5 = await client.post(
        "/api/auth/login",
        json={"email": user.email, "password": "WrongPasswordAttempt"},
    )
    assert res_5.status_code == 423
    await db_session.refresh(user)
    assert user.failed_login_attempts == 5
    assert user.locked_at is not None

    res_6 = await client.post(
        "/api/auth/login",
        json={"email": user.email, "password": "WrongPasswordAttempt"},
    )
    assert res_6.status_code == 423

    res_7 = await client.post(
        "/api/auth/login",
        json={"email": user.email, "password": "UserSecurePass123!"},
    )
    assert res_7.status_code == 423

    with patch.object(
        oauth.google,
        "authorize_access_token",
        AsyncMock(return_value={"userinfo": {"email": user.email, "sub": "google-sub-adv-unlock"}}),
    ):
        oauth_res = await client.get("/api/auth/google/callback")
        assert oauth_res.status_code == 200

    await db_session.refresh(user)
    assert user.failed_login_attempts == 0
    assert user.locked_at is None

    res_post_unlock = await client.post(
        "/api/auth/login",
        json={"email": user.email, "password": "UserSecurePass123!"},
    )
    assert res_post_unlock.status_code == 200
    assert "access_token" in res_post_unlock.json()


@pytest.mark.asyncio
async def test_adversarial_setup_token_cannot_access_protected_endpoints(
    client: AsyncClient,
    regular_user: tuple[User, str],
    sample_appliance: Appliance,
):
    user, _ = regular_user
    setup_token = create_setup_token(user.id, user.email)
    headers = {"Authorization": f"Bearer {setup_token}"}

    res_appliances = await client.get("/api/appliances/", headers=headers)
    assert res_appliances.status_code == 401
    assert "Invalid token type" in res_appliances.json()["detail"]

    res_cmd = await client.post(
        f"/api/appliances/{sample_appliance.id}/command",
        json={"state": "ON"},
        headers=headers,
    )
    assert res_cmd.status_code == 401

    res_me = await client.get("/api/auth/me", headers=headers)
    assert res_me.status_code == 401

    res_logs = await client.get("/api/activity-log/", headers=headers)
    assert res_logs.status_code == 401

    res_schedules = await client.get("/api/schedules/", headers=headers)
    assert res_schedules.status_code == 401

    res_register = await client.post(
        "/api/users/register",
        json={"email": "hacked@example.com", "is_admin": False},
        headers=headers,
    )
    assert res_register.status_code == 401


@pytest.mark.asyncio
async def test_adversarial_expired_and_mismatched_setup_token(
    client: AsyncClient,
    regular_user: tuple[User, str],
):
    user, access_token = regular_user

    past_time = datetime.now(UTC) - timedelta(minutes=2)
    expired_payload = {
        "sub": str(user.id),
        "email": user.email,
        "purpose": "password_setup",
        "exp": past_time,
    }
    expired_token = jwt.encode(
        expired_payload,
        settings.jwt_secret_key,
        algorithm=settings.algorithm,
    )

    res_expired = await client.post(
        "/api/auth/setup-password",
        json={"password": "NewStrongPassword123!"},
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    assert res_expired.status_code == 401
    assert "Invalid or expired token" in res_expired.json()["detail"]

    res_access_as_setup = await client.post(
        "/api/auth/setup-password",
        json={"password": "NewStrongPassword123!"},
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert res_access_as_setup.status_code == 401
    assert "Invalid token purpose" in res_access_as_setup.json()["detail"]

    refresh_token = create_refresh_token(user.id)
    res_refresh_as_setup = await client.post(
        "/api/auth/setup-password",
        json={"password": "NewStrongPassword123!"},
        headers={"Authorization": f"Bearer {refresh_token}"},
    )
    assert res_refresh_as_setup.status_code == 401
    assert "Invalid token purpose" in res_refresh_as_setup.json()["detail"]


@pytest.mark.asyncio
async def test_adversarial_unauthorized_endpoints(
    client: AsyncClient,
    sample_appliance: Appliance,
):
    endpoints = [
        ("GET", "/api/appliances/"),
        ("POST", f"/api/appliances/{sample_appliance.id}/command"),
        ("GET", "/api/auth/me"),
        ("GET", "/api/activity-log/"),
        ("GET", "/api/activity-log/export"),
        ("GET", "/api/schedules/"),
        ("POST", "/api/schedules/"),
        ("DELETE", "/api/schedules/1"),
        ("POST", "/api/users/register"),
    ]

    for method, path in endpoints:
        if method == "GET":
            res = await client.get(path)
        elif method == "POST":
            res = await client.post(path, json={})
        elif method == "DELETE":
            res = await client.delete(path)
        assert res.status_code == 401
        assert "Missing or invalid authorization header" in res.json()["detail"]

    for method, path in endpoints:
        headers = {"Authorization": "Bearer invalid.jwt.payload"}
        if method == "GET":
            res = await client.get(path, headers=headers)
        elif method == "POST":
            res = await client.post(path, json={}, headers=headers)
        elif method == "DELETE":
            res = await client.delete(path, headers=headers)
        assert res.status_code == 401


def test_adversarial_websocket_token_rejections(regular_user: tuple[User, str]):
    user, access_token = regular_user
    setup_token = create_setup_token(user.id, user.email)
    refresh_token = create_refresh_token(user.id)

    past_time = datetime.now(UTC) - timedelta(minutes=5)
    expired_token = jwt.encode(
        {
            "sub": str(user.id),
            "email": user.email,
            "is_admin": False,
            "token_type": "access",
            "exp": past_time,
        },
        settings.jwt_secret_key,
        algorithm=settings.algorithm,
    )

    with TestClient(app) as test_client:
        with pytest.raises(WebSocketDisconnect) as exc:
            with test_client.websocket_connect("/api/ws"):
                pass
        assert exc.value.code == 1008

        with pytest.raises(WebSocketDisconnect) as exc:
            with test_client.websocket_connect("/api/ws?token=completely_invalid"):
                pass
        assert exc.value.code == 1008

        with pytest.raises(WebSocketDisconnect) as exc:
            with test_client.websocket_connect(f"/api/ws?token={expired_token}"):
                pass
        assert exc.value.code == 1008

        with pytest.raises(WebSocketDisconnect) as exc:
            with test_client.websocket_connect(f"/api/ws?token={setup_token}"):
                pass
        assert exc.value.code == 1008

        with pytest.raises(WebSocketDisconnect) as exc:
            with test_client.websocket_connect(f"/api/ws?token={refresh_token}"):
                pass
        assert exc.value.code == 1008

        with test_client.websocket_connect(f"/api/ws?token={access_token}") as ws:
            assert ws is not None


@pytest.mark.asyncio
async def test_adversarial_registration_role_enforcement(
    client: AsyncClient,
    admin_user: tuple[User, str],
    regular_user: tuple[User, str],
):
    _, regular_token = regular_user
    res_regular = await client.post(
        "/api/users/register",
        json={"email": "another_user@example.com", "is_admin": False},
        headers={"Authorization": f"Bearer {regular_token}"},
    )
    assert res_regular.status_code == 403
    assert "Admin privileges required" in res_regular.json()["detail"]

    res_no_auth = await client.post(
        "/api/users/register",
        json={"email": "another_user@example.com", "is_admin": False},
    )
    assert res_no_auth.status_code == 401

    _, admin_token = admin_user
    res_admin = await client.post(
        "/api/users/register",
        json={"email": "authorized_new@example.com", "is_admin": False},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_admin.status_code == 201
    assert res_admin.json()["email"] == "authorized_new@example.com"
