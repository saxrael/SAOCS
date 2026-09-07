from fastapi import APIRouter

from app.config import settings
from app.schemas.version import VersionResponse

router = APIRouter(prefix="/version", tags=["version"])

@router.get("", response_model=VersionResponse)
@router.get("/", response_model=VersionResponse)
async def get_version():
    return VersionResponse(
        version=settings.app_version,
        git_sha=settings.git_sha,
        environment=settings.environment,
    )
