import asyncio
import json
import os
import signal
import sys
import time
from pathlib import Path

import aiomqtt
from aiohttp import web

MQTT_BROKER_HOST = os.getenv("MQTT_BROKER_HOST", "localhost")
MQTT_BROKER_PORT = int(os.getenv("MQTT_BROKER_PORT", os.getenv("MQTT_PORT", "1883")))
MQTT_DEVICE_USER = os.getenv("MQTT_DEVICE_USER", "saocs_esp32")
MQTT_DEVICE_PASSWORD = os.getenv("MQTT_DEVICE_PASSWORD", "esp32_secret_pass")
DEFAULT_DEV_ID = os.getenv("MQTT_DEFAULT_DEVICE_ID", "esp32_prototype_01")
MQTT_DEVICE_ID = os.getenv("MQTT_DEVICE_ID", DEFAULT_DEV_ID)
SIMULATION_PORT = int(os.getenv("SIMULATION_PORT", "8099"))
SIMULATION_HOST = os.getenv("SIMULATION_HOST", "0.0.0.0")
NVS_FILE_PATH = os.getenv("NVS_FILE_PATH", "data/simulated_nvs.json")
RELAY_COUNT = 4
RELAY_COOLDOWN_MS = 1000


class RelayChannel:
    def __init__(self, index: int, initial_state: bool = False):
        self.index = index
        self.current_state = initial_state
        self.cooldown_start_ms = 0.0
        self.has_pending = False
        self.pending_state = False
        self.pending_source = "boot"


class VirtualESP32:
    def __init__(self):
        self.device_id = MQTT_DEVICE_ID
        self.nvs_path = Path(NVS_FILE_PATH)
        self.relays = [RelayChannel(i, False) for i in range(RELAY_COUNT)]
        self.load_nvs()
        self.running = False
        self.paused = False
        self.mqtt_client: aiomqtt.Client | None = None
        self.mqtt_connected = False
        self.mqtt_task: asyncio.Task | None = None
        self.tick_task: asyncio.Task | None = None
        self.app_runner: web.AppRunner | None = None
        self.topic_command = f"office/{self.device_id}/command"
        self.topic_state = f"office/{self.device_id}/state"
        self.topic_status = f"office/{self.device_id}/status"

    def load_nvs(self):
        self.nvs_path.parent.mkdir(parents=True, exist_ok=True)
        if self.nvs_path.exists():
            try:
                data = json.loads(self.nvs_path.read_text())
                for i in range(RELAY_COUNT):
                    key = f"r{i + 1}"
                    if key in data:
                        self.relays[i].current_state = bool(data[key])
                return
            except Exception:
                pass
        self.save_nvs()

    def save_nvs(self):
        self.nvs_path.parent.mkdir(parents=True, exist_ok=True)
        data = {f"r{i + 1}": self.relays[i].current_state for i in range(RELAY_COUNT)}
        temp_file = self.nvs_path.with_suffix(".tmp")
        temp_file.write_text(json.dumps(data, indent=2))
        temp_file.replace(self.nvs_path)

    def request_state_change(self, channel_idx: int, target_state: bool, source: str):
        if channel_idx < 0 or channel_idx >= RELAY_COUNT:
            return
        relay = self.relays[channel_idx]
        if target_state == relay.current_state:
            relay.has_pending = False
            return
        now_ms = time.monotonic() * 1000
        if relay.cooldown_start_ms != 0.0:
            relay.has_pending = True
            relay.pending_state = target_state
            relay.pending_source = source
            return
        self.apply_state(channel_idx, target_state, source)
        relay.cooldown_start_ms = now_ms
        relay.has_pending = False

    def apply_state(self, channel_idx: int, state: bool, source: str):
        self.relays[channel_idx].current_state = state
        self.save_nvs()
        if self.mqtt_client and self.mqtt_connected:
            asyncio.create_task(self.publish_state(channel_idx, state, source))

    async def publish_state(self, channel_idx: int, state: bool, source: str):
        if not self.mqtt_client or not self.mqtt_connected:
            return
        payload = json.dumps({
            "channel": channel_idx + 1,
            "state": "ON" if state else "OFF",
            "source": source,
            "timestamp_ms": int(time.time() * 1000),
        })
        try:
            await self.mqtt_client.publish(self.topic_state, payload=payload, qos=1)
        except Exception:
            pass

    async def publish_all_states(self, source: str):
        for i in range(RELAY_COUNT):
            await self.publish_state(i, self.relays[i].current_state, source)

    async def _tick_loop(self):
        while self.running:
            now_ms = time.monotonic() * 1000
            for i in range(RELAY_COUNT):
                relay = self.relays[i]
                if relay.cooldown_start_ms == 0.0:
                    continue
                elapsed = now_ms - relay.cooldown_start_ms
                if elapsed >= RELAY_COOLDOWN_MS:
                    relay.cooldown_start_ms = 0.0
                    if relay.has_pending:
                        next_state = relay.pending_state
                        next_source = relay.pending_source
                        relay.has_pending = False
                        if next_state != relay.current_state:
                            self.apply_state(i, next_state, next_source)
                            relay.cooldown_start_ms = time.monotonic() * 1000
            await asyncio.sleep(0.02)

    async def _mqtt_loop(self):
        while self.running:
            if self.paused:
                await asyncio.sleep(0.1)
                continue
            try:
                will = aiomqtt.Will(
                    topic=self.topic_status,
                    payload="offline",
                    qos=1,
                    retain=True,
                )
                async with aiomqtt.Client(
                    hostname=MQTT_BROKER_HOST,
                    port=MQTT_BROKER_PORT,
                    username=MQTT_DEVICE_USER,
                    password=MQTT_DEVICE_PASSWORD,
                    identifier=self.device_id,
                    will=will,
                ) as client:
                    self.mqtt_client = client
                    self.mqtt_connected = True
                    await client.publish(self.topic_status, payload="online", qos=1, retain=True)
                    await client.subscribe(self.topic_command, qos=1)
                    await self.publish_all_states("boot")
                    async for message in client.messages:
                        if self.paused:
                            break
                        if str(message.topic) == self.topic_command:
                            raw = (
                                message.payload.decode("utf-8")
                                if isinstance(message.payload, (bytes, bytearray))
                                else str(message.payload)
                            )
                            try:
                                data = json.loads(raw)
                                ch = data.get("channel")
                                state_str = data.get("state")
                                if isinstance(ch, int) and state_str in ("ON", "OFF"):
                                    idx = ch - 1 if ch >= 1 else 0
                                    self.request_state_change(idx, state_str == "ON", "command")
                            except Exception:
                                pass
            except asyncio.CancelledError:
                break
            except Exception:
                self.mqtt_connected = False
                self.mqtt_client = None
                await asyncio.sleep(2)
            finally:
                self.mqtt_connected = False
                self.mqtt_client = None

    async def disconnect_simulation(self):
        self.paused = True
        if self.mqtt_client and self.mqtt_connected:
            try:
                await self.mqtt_client.publish(
                    self.topic_status,
                    payload="offline",
                    qos=1,
                    retain=True,
                )
            except Exception:
                pass
        self.mqtt_connected = False
        if self.mqtt_task and not self.mqtt_task.done():
            self.mqtt_task.cancel()
            try:
                await self.mqtt_task
            except asyncio.CancelledError:
                pass
        self.mqtt_client = None
        self.mqtt_task = asyncio.create_task(self._mqtt_loop())

    async def drop_simulation(self):
        self.paused = True
        if self.mqtt_client and self.mqtt_connected:
            try:
                await self.mqtt_client.publish(
                    self.topic_status,
                    payload="offline",
                    qos=1,
                    retain=True,
                )
            except Exception:
                pass
        self.mqtt_connected = False
        if self.mqtt_task and not self.mqtt_task.done():
            self.mqtt_task.cancel()
            try:
                await self.mqtt_task
            except asyncio.CancelledError:
                pass
        self.mqtt_client = None
        self.mqtt_task = asyncio.create_task(self._mqtt_loop())

    async def reconnect_simulation(self):
        self.paused = False

    async def handle_get_status(self, request: web.Request) -> web.Response:
        now_ms = time.monotonic() * 1000
        relays_data = {}
        for i in range(RELAY_COUNT):
            relay = self.relays[i]
            rem_ms = (
                max(0, int(RELAY_COOLDOWN_MS - (now_ms - relay.cooldown_start_ms)))
                if relay.cooldown_start_ms != 0.0
                else 0
            )
            relays_data[str(i + 1)] = {
                "state": "ON" if relay.current_state else "OFF",
                "cooldown_active": relay.cooldown_start_ms != 0.0,
                "cooldown_remaining_ms": rem_ms,
                "has_pending": relay.has_pending,
                "pending_state": (
                    ("ON" if relay.pending_state else "OFF") if relay.has_pending else None
                ),
            }
        return web.json_response({
            "device_id": self.device_id,
            "mqtt_connected": self.mqtt_connected,
            "simulation_paused": self.paused,
            "relays": relays_data,
            "nvs_path": str(self.nvs_path),
        })

    async def handle_disconnect(self, request: web.Request) -> web.Response:
        await self.disconnect_simulation()
        return web.json_response({"status": "disconnected"})

    async def handle_drop(self, request: web.Request) -> web.Response:
        await self.drop_simulation()
        return web.json_response({"status": "dropped"})

    async def handle_reconnect(self, request: web.Request) -> web.Response:
        await self.reconnect_simulation()
        return web.json_response({"status": "reconnected"})

    async def handle_switch(self, request: web.Request) -> web.Response:
        try:
            body = await request.json()
        except Exception:
            body = {}
        channel = body.get("channel", 1)
        if not isinstance(channel, int) or channel < 1 or channel > RELAY_COUNT:
            return web.json_response({"error": "invalid_channel"}, status=400)
        idx = channel - 1
        target_state_str = body.get("state")
        if target_state_str in ("ON", "OFF"):
            target_state = target_state_str == "ON"
        else:
            target_state = not self.relays[idx].current_state
        self.request_state_change(idx, target_state, "switch")
        return web.json_response({
            "status": "switch_simulated",
            "channel": channel,
            "state": "ON" if target_state else "OFF",
        })

    async def start(self):
        self.running = True
        self.tick_task = asyncio.create_task(self._tick_loop())
        self.mqtt_task = asyncio.create_task(self._mqtt_loop())
        app = web.Application()
        app.router.add_get("/status", self.handle_get_status)
        app.router.add_post("/simulate/disconnect", self.handle_disconnect)
        app.router.add_post("/simulate/drop", self.handle_drop)
        app.router.add_post("/simulate/reconnect", self.handle_reconnect)
        app.router.add_post("/simulate/switch", self.handle_switch)
        self.app_runner = web.AppRunner(app)
        await self.app_runner.setup()
        site = web.TCPSite(self.app_runner, SIMULATION_HOST, SIMULATION_PORT)
        await site.start()

    async def stop(self):
        self.running = False
        if self.tick_task:
            self.tick_task.cancel()
        if self.mqtt_task:
            self.mqtt_task.cancel()
        if self.app_runner:
            await self.app_runner.cleanup()
        if self.mqtt_client and self.mqtt_connected:
            try:
                await self.mqtt_client.publish(
                    self.topic_status,
                    payload="offline",
                    qos=1,
                    retain=True,
                )
            except Exception:
                pass


async def main():
    virtual_esp = VirtualESP32()
    await virtual_esp.start()
    stop_event = asyncio.Event()
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, stop_event.set)
        except NotImplementedError:
            pass
    try:
        await stop_event.wait()
    except (asyncio.CancelledError, KeyboardInterrupt):
        pass
    finally:
        await virtual_esp.stop()


if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
