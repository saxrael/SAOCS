from pydantic import BaseModel


class VersionResponse(BaseModel):
    version: str
    git_sha: str
    environment: str
