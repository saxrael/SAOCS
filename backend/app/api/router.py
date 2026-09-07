from fastapi import APIRouter

from app.api.activity_log import router as activity_log_router
from app.api.appliances import router as appliances_router
from app.api.auth import router as auth_router
from app.api.schedules import router as schedules_router
from app.api.users import router as users_router
from app.api.version import router as version_router
from app.api.websocket import router as websocket_router

api_router = APIRouter(prefix="/api")

api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(appliances_router)
api_router.include_router(activity_log_router)
api_router.include_router(schedules_router)
api_router.include_router(version_router)
api_router.include_router(websocket_router)
