import asyncio
import os
import ssl
import time

import aiohttp

BASE_URL = os.getenv("BASE_URL", "http://localhost:8000")
WS_URL = os.getenv(
    "WS_URL",
    f"{BASE_URL.replace('http', 'ws', 1)}/api/ws",
)

TOKEN = os.getenv("TEST_TOKEN", os.getenv("TOKEN", "YOUR_JWT_TOKEN"))
CONCURRENT_CONNECTIONS = int(os.getenv("CONCURRENT_CONNECTIONS", "20"))
DURATION_SECONDS = int(os.getenv("DURATION_SECONDS", "30"))


async def dashboard_session(session_id: int, results: dict):
    is_secure = BASE_URL.startswith("https") or WS_URL.startswith("wss")
    ssl_ctx = ssl.create_default_context() if is_secure else None
    headers = {"Authorization": f"Bearer {TOKEN}"}

    try:
        async with aiohttp.ClientSession() as session:
            start = time.monotonic()

            async with session.get(
                f"{BASE_URL}/api/appliances/",
                headers=headers,
                ssl=ssl_ctx,
            ) as resp:
                api_latency = (time.monotonic() - start) * 1000
                results[session_id] = {
                    "api_status": resp.status,
                    "api_latency_ms": api_latency,
                    "ws_connected": False,
                    "ws_messages": 0,
                    "error": None,
                }

            async with session.ws_connect(WS_URL, headers=headers, ssl=ssl_ctx) as ws:
                results[session_id]["ws_connected"] = True

                end_time = time.monotonic() + DURATION_SECONDS
                while time.monotonic() < end_time:
                    try:
                        msg = await asyncio.wait_for(ws.receive(), timeout=5.0)
                        if msg.type == aiohttp.WSMsgType.TEXT:
                            results[session_id]["ws_messages"] += 1
                    except TimeoutError:
                        continue
    except Exception as e:
        results[session_id] = results.get(session_id, {})
        results[session_id]["error"] = str(e)


async def run_load_test():
    results = {}

    tasks = [
        dashboard_session(i, results)
        for i in range(CONCURRENT_CONNECTIONS)
    ]

    print(f"Starting {CONCURRENT_CONNECTIONS} concurrent dashboard sessions...")
    await asyncio.gather(*tasks)

    connected = sum(1 for r in results.values() if r.get("ws_connected"))
    errors = sum(1 for r in results.values() if r.get("error"))
    avg_api_latency = sum(
        r.get("api_latency_ms", 0) for r in results.values()
    ) / max(len(results), 1)

    print(f"\nLoad Test Results ({CONCURRENT_CONNECTIONS} connections, {DURATION_SECONDS}s):")
    print(f"  WebSocket Connected: {connected}/{CONCURRENT_CONNECTIONS}")
    print(f"  Errors:              {errors}")
    print(f"  Avg API Latency:     {avg_api_latency:.1f}ms")

    for sid, r in sorted(results.items()):
        if r.get("error"):
            print(f"  Session {sid} ERROR: {r['error']}")

    assert connected == CONCURRENT_CONNECTIONS, (
        f"Only {connected}/{CONCURRENT_CONNECTIONS} WebSocket connections succeeded"
    )
    assert errors == 0, f"{errors} sessions had errors"


if __name__ == "__main__":
    asyncio.run(run_load_test())
