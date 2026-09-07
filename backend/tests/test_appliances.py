import pytest
from httpx import AsyncClient

from app.models.appliance import Appliance
from app.models.user import User


@pytest.mark.asyncio
async def test_t_b1_list_appliances_with_live_state(
    client: AsyncClient,
    regular_user: tuple[User, str],
    sample_appliance: Appliance,
):
    _, token = regular_user
    response = await client.get(
        "/api/appliances/",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    item = next(d for d in data if d["id"] == sample_appliance.id)
    assert item["name"] == sample_appliance.name
    assert item["device_id"] == sample_appliance.device_id
    assert item["relay_channel"] == sample_appliance.relay_channel
    assert item["state"] is not None
    assert item["state"]["current_state"] == "OFF"

@pytest.mark.asyncio
async def test_t_b2_publish_appliance_command(
    client: AsyncClient,
    regular_user: tuple[User, str],
    sample_appliance: Appliance,
):
    _, token = regular_user
    response = await client.post(
        f"/api/appliances/{sample_appliance.id}/command",
        json={"state": "ON"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "command_published"
    assert data["appliance_id"] == sample_appliance.id
    assert data["target_state"] == "ON"

@pytest.mark.asyncio
async def test_t_b3_enforce_1000ms_debounce_cooldown(
    client: AsyncClient,
    regular_user: tuple[User, str],
    sample_appliance: Appliance,
):
    _, token = regular_user
    first_res = await client.post(
        f"/api/appliances/{sample_appliance.id}/command",
        json={"state": "ON"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert first_res.status_code == 200

    second_res = await client.post(
        f"/api/appliances/{sample_appliance.id}/command",
        json={"state": "OFF"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert second_res.status_code == 429

@pytest.mark.asyncio
async def test_t_b4_command_nonexistent_appliance(
    client: AsyncClient,
    regular_user: tuple[User, str],
):
    _, token = regular_user
    response = await client.post(
        "/api/appliances/9999/command",
        json={"state": "ON"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 404
