import pytest
from starlette.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from app.main import app
from app.models.user import User
from app.services.websocket_manager import websocket_manager


def test_t_d1_connect_with_valid_jwt_token(regular_user: tuple[User, str]):
    _, token = regular_user
    with TestClient(app) as test_client:
        with test_client.websocket_connect(f"/api/ws?token={token}") as ws:
            assert ws is not None

def test_t_d2_connect_with_invalid_or_missing_token():
    with TestClient(app) as test_client:
        with pytest.raises(WebSocketDisconnect) as exc_invalid:
            with test_client.websocket_connect("/api/ws?token=invalid_token"):
                pass
        assert exc_invalid.value.code == 1008

        with pytest.raises(WebSocketDisconnect) as exc_missing:
            with test_client.websocket_connect("/api/ws"):
                pass
        assert exc_missing.value.code == 1008

@pytest.mark.asyncio
async def test_t_d3_broadcast_to_connected_clients(regular_user: tuple[User, str]):
    _, token = regular_user
    with TestClient(app) as test_client:
        with test_client.websocket_connect(f"/api/ws?token={token}") as ws:
            await websocket_manager.broadcast({"event": "unit_test_event", "status": "ok"})
            data = ws.receive_json()
            assert data["event"] == "unit_test_event"
            assert data["status"] == "ok"

@pytest.mark.asyncio
async def test_t_d4_clean_disconnect_handling(regular_user: tuple[User, str]):
    _, token = regular_user
    with TestClient(app) as test_client:
        with test_client.websocket_connect(f"/api/ws?token={token}"):
            assert len(websocket_manager.active_connections) >= 1
    assert len(websocket_manager.active_connections) == 0
    await websocket_manager.broadcast({"event": "after_disconnect"})
