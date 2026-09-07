from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect, status

from app.services.auth_service import verify_access_token
from app.services.websocket_manager import websocket_manager

router = APIRouter(tags=["websocket"])

@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str | None = Query(default=None),
):
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    try:
        verify_access_token(token)
    except Exception:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await websocket_manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        websocket_manager.disconnect(websocket)
