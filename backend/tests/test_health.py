from unittest.mock import patch

import pytest
from httpx import AsyncClient

from app.services.mqtt_service import mqtt_service


@pytest.mark.asyncio
async def test_health_check_healthy(client: AsyncClient):
    response = await client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["database"] == "ok"
    assert data["mqtt"] == "connected"


@pytest.mark.asyncio
async def test_health_check_mqtt_disconnected(client: AsyncClient):
    mqtt_service.client = None
    response = await client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["database"] == "ok"
    assert data["mqtt"] == "disconnected"


@pytest.mark.asyncio
async def test_health_check_database_error(client: AsyncClient):
    with patch("app.api.health.async_session_maker") as mock_session_maker:
        mock_session_maker.side_effect = Exception("DB connection lost")
        response = await client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "degraded"
        assert data["database"] == "error"
        assert data["mqtt"] == "connected"


@pytest.mark.asyncio
async def test_health_check_database_error_and_mqtt_disconnected(client: AsyncClient):
    mqtt_service.client = None
    with patch("app.api.health.async_session_maker") as mock_session_maker:
        mock_session_maker.side_effect = Exception("DB connection lost")
        response = await client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "degraded"
        assert data["database"] == "error"
        assert data["mqtt"] == "disconnected"
