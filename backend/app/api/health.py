from fastapi import APIRouter
from sqlalchemy import text

from app.database import async_session_maker
from app.services.mqtt_service import mqtt_service

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check():
    db_status = "ok"
    try:
        async with async_session_maker() as session:
            await session.execute(text("SELECT 1"))
    except Exception:
        db_status = "error"

    mqtt_status = "connected" if mqtt_service.client is not None else "disconnected"

    overall = "ok" if db_status == "ok" else "degraded"

    return {
        "status": overall,
        "database": db_status,
        "mqtt": mqtt_status,
    }