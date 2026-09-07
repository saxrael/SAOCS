from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.database import Base, get_db
from app.main import app
from app.models.appliance import Appliance, ApplianceState
from app.models.user import User
from app.services.auth_service import create_access_token, hash_password
from app.services.mqtt_service import mqtt_service


@pytest.fixture(autouse=True)
def reset_mqtt_state():
    mqtt_service.last_command_time.clear()
    mqtt_service.pending_actors.clear()
    mqtt_service.client = AsyncMock()
    with (
        patch.object(mqtt_service, "start", AsyncMock()),
        patch.object(mqtt_service, "stop", AsyncMock()),
    ):
        yield
    mqtt_service.last_command_time.clear()
    mqtt_service.pending_actors.clear()
    mqtt_service.client = None

@pytest.fixture
async def test_engine():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()

@pytest.fixture
async def db_session(test_engine):
    session_factory = async_sessionmaker(
        test_engine,
        expire_on_commit=False,
        class_=AsyncSession,
    )
    async with session_factory() as session:
        yield session

@pytest.fixture
async def client(db_session):
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as async_client:
        yield async_client
    app.dependency_overrides.clear()

@pytest.fixture
async def admin_user(db_session):
    user = User(
        email="admin@example.com",
        hashed_password=hash_password("AdminSecurePass123!"),
        is_admin=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    token = create_access_token(user.id, user.email, user.is_admin)
    return user, token

@pytest.fixture
async def regular_user(db_session):
    user = User(
        email="user@example.com",
        hashed_password=hash_password("UserSecurePass123!"),
        is_admin=False,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    token = create_access_token(user.id, user.email, user.is_admin)
    return user, token

@pytest.fixture
async def sample_appliance(db_session):
    appliance = Appliance(
        name="Office Light 1",
        device_id="esp32_prototype_01",
        relay_channel=1,
        assumed_wattage_watts=60.0,
    )
    db_session.add(appliance)
    await db_session.commit()
    await db_session.refresh(appliance)

    state = ApplianceState(
        appliance_id=appliance.id,
        current_state="OFF",
        last_changed_source="boot",
    )
    db_session.add(state)
    await db_session.commit()
    await db_session.refresh(appliance)
    return appliance
