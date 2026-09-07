import time
from collections import defaultdict

from fastapi import HTTPException, Request, status


class RateLimiter:
    def __init__(self, max_requests: int = 10, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: dict[str, list[float]] = defaultdict(list)

    def is_rate_limited(self, key: str) -> bool:
        now = time.monotonic()
        cutoff = now - self.window_seconds
        self.requests[key] = [ts for ts in self.requests[key] if ts > cutoff]
        if len(self.requests[key]) >= self.max_requests:
            return True
        self.requests[key].append(now)
        return False

rate_limiter = RateLimiter(max_requests=20, window_seconds=60)

async def check_rate_limit(request: Request) -> None:
    client_ip = request.client.host if request.client else "unknown"
    if rate_limiter.is_rate_limited(client_ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Please slow down.",
        )
