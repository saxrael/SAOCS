import asyncio
import os
import ssl
import sys
import time
from pathlib import Path

import aiohttp

BASE_URL = os.getenv("BASE_URL", "http://localhost:8000")
WS_URL = os.getenv(
    "WS_URL",
    f"{BASE_URL.replace('http', 'ws', 1)}/api/ws",
)
SIMULATION_URL = os.getenv("SIMULATION_URL", "http://localhost:8099")
DEVICE_ID = os.getenv("DEVICE_ID", "esp32_prototype_01")
APPLIANCE_ID = int(os.getenv("APPLIANCE_ID", "1"))
ITERATIONS = int(os.getenv("ITERATIONS", "10"))


def resolve_token() -> str:
    token = os.getenv("TEST_TOKEN", os.getenv("TOKEN", ""))
    if token and token != "YOUR_JWT_TOKEN":
        return token
    try:
        sys.path.insert(0, str(Path("backend").resolve()))
        from app.services.auth_service import create_access_token

        return create_access_token(1, "israelanuoluwaposimi955@gmail.com", True)
    except Exception:
        return token or "YOUR_JWT_TOKEN"


async def measure_relay_latency():
    token = resolve_token()
    is_secure = BASE_URL.startswith("https") or WS_URL.startswith("wss")
    ssl_ctx = ssl.create_default_context() if is_secure else None
    headers = {"Authorization": f"Bearer {token}"}
    ws_endpoint = WS_URL if "token=" in WS_URL or not token else f"{WS_URL}?token={token}"

    async with aiohttp.ClientSession() as session:
        current_state = "OFF"
        try:
            async with session.get(
                f"{BASE_URL}/api/appliances/",
                headers=headers,
                ssl=ssl_ctx,
            ) as resp:
                if resp.status == 200:
                    appliances = await resp.json()
                    for app in appliances:
                        if app.get("id") == APPLIANCE_ID:
                            state_data = app.get("state")
                            if isinstance(state_data, dict) and "current_state" in state_data:
                                current_state = state_data["current_state"]
                            elif "current_state" in app:
                                current_state = app.get("current_state", "OFF")
                            break
        except Exception:
            pass

        try:
            async with session.get(f"{SIMULATION_URL}/status") as sim_resp:
                if sim_resp.status == 200:
                    sim_data = await sim_resp.json()
                    relays = sim_data.get("relays", {})
                    relay_info = relays.get(str(APPLIANCE_ID), {})
                    if "state" in relay_info:
                        current_state = relay_info["state"]
        except Exception:
            pass

        async with session.ws_connect(ws_endpoint, headers=headers, ssl=ssl_ctx) as ws:
            latencies = []

            for _ in range(ITERATIONS):
                target_state = "OFF" if current_state == "ON" else "ON"

                start = time.monotonic()

                async with session.post(
                    f"{BASE_URL}/api/appliances/{APPLIANCE_ID}/command",
                    json={"state": target_state},
                    headers=headers,
                    ssl=ssl_ctx,
                ) as resp:
                    assert resp.status == 200

                while True:
                    msg = await asyncio.wait_for(ws.receive_json(), timeout=5.0)
                    if (
                        msg.get("event") == "state_change"
                        and msg.get("appliance_id") == APPLIANCE_ID
                        and msg.get("state") == target_state
                    ):
                        elapsed = (time.monotonic() - start) * 1000
                        latencies.append(elapsed)
                        current_state = target_state
                        break

                await asyncio.sleep(1.1)

            avg = sum(latencies) / len(latencies)
            p95 = sorted(latencies)[int(len(latencies) * 0.95)]
            max_lat = max(latencies)

            print(f"Relay Latency Results ({ITERATIONS} iterations):")
            print(f"  Average: {avg:.1f}ms")
            print(f"  P95:     {p95:.1f}ms")
            print(f"  Max:     {max_lat:.1f}ms")
            print("  Target:  <500ms")

            assert max_lat < 500, f"Max latency {max_lat:.1f}ms exceeds 500ms target"


if __name__ == "__main__":
    asyncio.run(measure_relay_latency())
