from datetime import UTC, datetime

import pytest
from httpx import AsyncClient

from app.models.activity_log import ActivityLog
from app.models.appliance import Appliance
from app.models.user import User


@pytest.mark.asyncio
async def test_version_endpoint(client: AsyncClient):
    response = await client.get("/api/version")
    assert response.status_code == 200
    data = response.json()
    assert "version" in data
    assert "git_sha" in data
    assert "environment" in data

@pytest.mark.asyncio
async def test_auth_me(client: AsyncClient, regular_user: tuple[User, str]):
    user, token = regular_user
    response = await client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == user.id
    assert data["email"] == user.email

@pytest.mark.asyncio
async def test_auth_refresh(client: AsyncClient, regular_user: tuple[User, str]):
    user, _ = regular_user
    login_res = await client.post(
        "/api/auth/login",
        json={"email": user.email, "password": "UserSecurePass123!"},
    )
    assert login_res.status_code == 200
    tokens = login_res.json()
    refresh_token = tokens["refresh_token"]

    refresh_res = await client.post(
        "/api/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert refresh_res.status_code == 200
    new_tokens = refresh_res.json()
    assert "access_token" in new_tokens
    assert "refresh_token" in new_tokens

@pytest.mark.asyncio
async def test_activity_log_list_and_export(
    client: AsyncClient,
    admin_user: tuple[User, str],
    sample_appliance: Appliance,
    db_session,
):
    _, token = admin_user
    log = ActivityLog(
        appliance_id=sample_appliance.id,
        event_type="POWER_ON",
        source="switch",
        timestamp=datetime.now(UTC),
    )
    db_session.add(log)
    await db_session.commit()

    list_res = await client.get(
        "/api/activity-log/",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert list_res.status_code == 200
    logs = list_res.json()
    assert len(logs) >= 1

    export_res = await client.get(
        "/api/activity-log/export",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert export_res.status_code == 200
    assert "text/csv" in export_res.headers.get("content-type", "")
    assert "POWER_ON" in export_res.text

@pytest.mark.asyncio
async def test_schedules_crud(
    client: AsyncClient,
    regular_user: tuple[User, str],
    sample_appliance: Appliance,
):
    _, token = regular_user
    future_time = datetime.now(UTC).isoformat()
    create_res = await client.post(
        "/api/schedules/",
        json={
            "appliance_id": sample_appliance.id,
            "action": "ON",
            "scheduled_time": future_time,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert create_res.status_code == 201
    schedule_data = create_res.json()
    schedule_id = schedule_data["id"]

    list_res = await client.get(
        "/api/schedules/",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert list_res.status_code == 200
    assert any(s["id"] == schedule_id for s in list_res.json())

    delete_res = await client.delete(
        f"/api/schedules/{schedule_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert delete_res.status_code == 204
