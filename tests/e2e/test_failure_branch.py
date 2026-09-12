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
SIMULATION_URL = os.getenv("SIMULATION_URL", "http://localhost:8099")
APPLIANCE_ID = int(os.getenv("APPLIANCE_ID", "1"))


def resolve_token() -> str:
    token = os.getenv("TEST_TOKEN", os.getenv("TOKEN", ""))
    if token and token != "YOUR_JWT_TOKEN":
        return token
    try:
        import sys
        from pathlib import Path

        sys.path.insert(0, str(Path("backend").resolve()))
        from app.services.auth_service import create_access_token

        return create_access_token(1, "israelanuoluwaposimi955@gmail.com", True)
    except Exception:
        return token or "YOUR_JWT_TOKEN"


async def test_disconnect_failure():
    token = resolve_token()
    is_secure = BASE_URL.startswith("https") or WS_URL.startswith("wss")
    ssl_ctx = ssl.create_default_context() if is_secure else None
    headers = {"Authorization": f"Bearer {token}"}

    async with aiohttp.ClientSession() as session:
        is_simulation_available = False
        try:
            async with session.get(
                f"{SIMULATION_URL}/status",
                timeout=aiohttp.ClientTimeout(total=2.0),
            ) as resp:
                if resp.status == 200:
                    is_simulation_available = True
        except Exception:
            is_simulation_available = False

        ws_target = WS_URL if "token=" in WS_URL or not token else f"{WS_URL}?token={token}"
        async with session.ws_connect(ws_target, headers=headers, ssl=ssl_ctx) as ws:
            if is_simulation_available:
                async with session.post(f"{SIMULATION_URL}/simulate/disconnect") as resp:
                    assert resp.status == 200
                timeout_seconds = 5.0
            else:
                print("Waiting for device_status offline event...")
                print(">>> DISCONNECT THE ESP32 NOW <<<")
                timeout_seconds = 60.0

            offline_received = False
            start_wait = time.monotonic()
            while time.monotonic() - start_wait < timeout_seconds:
                try:
                    msg = await asyncio.wait_for(ws.receive_json(), timeout=timeout_seconds)
                    if (
                        msg.get("event") == "device_status"
                        and msg.get("status") == "offline"
                    ):
                        offline_received = True
                        break
                except TimeoutError:
                    break

            assert offline_received, "Failed to observe device_status offline event"

            start = time.monotonic()
            async with session.post(
                f"{BASE_URL}/api/appliances/{APPLIANCE_ID}/command",
                json={"state": "ON"},
                headers=headers,
                ssl=ssl_ctx,
            ) as resp:
                elapsed = (time.monotonic() - start) * 1000
                resp_status = resp.status
                body = await resp.json()

            print(f"Response status: {resp_status}")
            print(f"Response body: {body}")
            print(f"Response time: {elapsed:.0f}ms")

            assert resp_status in (408, 503, 504), f"Expected error status, got {resp_status}"
            assert elapsed < 3000, f"Response took {elapsed:.0f}ms — expected under 3000ms"

            if is_simulation_available:
                async with session.post(f"{SIMULATION_URL}/simulate/reconnect") as resp:
                    assert resp.status == 200

                online_received = False
                start_reconnect_wait = time.monotonic()
                while time.monotonic() - start_reconnect_wait < 5.0:
                    try:
                        msg = await asyncio.wait_for(ws.receive_json(), timeout=5.0)
                        if (
                            msg.get("event") == "device_status"
                            and msg.get("status") == "online"
                        ):
                            online_received = True
                            break
                    except TimeoutError:
                        break

                assert online_received, "Failed to observe device_status online recovery event"

                await asyncio.sleep(1.1)

                async with session.post(
                    f"{BASE_URL}/api/appliances/{APPLIANCE_ID}/command",
                    json={"state": "OFF"},
                    headers=headers,
                    ssl=ssl_ctx,
                ) as recovery_resp:
                    assert recovery_resp.status == 200, (
                        f"Expected 200 after recovery, got {recovery_resp.status}"
                    )

            print("PASS: Failure branch returned specific error within time limit")


if __name__ == "__main__":
    asyncio.run(test_disconnect_failure())
