import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.api.router import api_router
from app.config import settings
from app.database import Base, engine
from app.services.mqtt_service import mqtt_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    if "sqlite" in settings.database_url and ":memory:" not in settings.database_url:
        db_path = settings.database_url.split("sqlite:///")[-1]
        dirname = os.path.dirname(db_path)
        if dirname:
            os.makedirs(dirname, exist_ok=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await mqtt_service.start()
    yield
    await mqtt_service.stop()

app = FastAPI(
    title="SAOCS Backend",
    version=settings.app_version,
    lifespan=lifespan,
)

app.add_middleware(
    SessionMiddleware,
    secret_key=settings.jwt_secret_key,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)
