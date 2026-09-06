---
name: embedded-esp32-conventions
description: >-
  Governs ESP32 firmware architecture, PlatformIO conventions, pin contracts, relay
  control, switch debouncing, arbitration, state persistence, and OTA updates for
  the Smart Office Appliance Control System (SAOCS). Use whenever creating, editing,
  debugging, or reviewing ESP32 C/C++ firmware, PlatformIO configuration (platformio.ini),
  relay actuation, physical switch handling, flash persistence (Preferences/NVS),
  or MQTT messaging on the microcontroller.
---

# Embedded ESP32 Conventions — Smart Office Appliance Control System

This skill is the project-specific standard for all firmware engineering in SAOCS. It captures the non-negotiable physical and architectural contracts established in `docs/TRD.md` §6, `docs/PRD.md`, and `AGENTS.md` §3.

---

## 1. Core Architectural Role & Principles

1. **Physical Source of Truth:**
   The ESP32 is the ultimate authority on physical relay states. The backend and dashboard mirror device state reported over MQTT; the backend never dictates or overwrites device state on boot.
2. **Offline Resilience:**
   Physical toggle switches must actuate relays immediately and reliably even if Wi-Fi, the MQTT broker, or the cloud backend is unreachable.
3. **Outbound-Only Connectivity:**
   The ESP32 operates over standard Wi-Fi or cellular mobile hotspots. It must connect **outbound** to the Mosquitto MQTT broker and never require inbound network access, static local IPs, or port forwarding.

---

## 2. Locked GPIO Pin Contract

The pin assignments below are fixed by `docs/TRD.md` §6 and shared with Abdulfatai's physical prototype wiring. 

> [!CAUTION]
> **NEVER alter or reassign these GPIO pins without explicit, written confirmation from Israel.**
> Modifying these pins in firmware breaks physical wiring that cannot be repaired in software.

| Function | Channel | GPIO Pin | Hardware Role / Notes |
|---|---|---|---|
| **Relay Output** | Channel 1 | **GPIO 16** | Active-high / Active-low relay module driver |
| **Relay Output** | Channel 2 | **GPIO 17** | Active-high / Active-low relay module driver |
| **Relay Output** | Channel 3 | **GPIO 18** | Active-high / Active-low relay module driver |
| **Relay Output** | Channel 4 | **GPIO 19** | Active-high / Active-low relay module driver |
| **Switch Input** | Switch 1 | **GPIO 32** | Physical toggle switch (boot-safe input) |
| **Switch Input** | Switch 2 | **GPIO 33** | Physical toggle switch (boot-safe input) |
| **Switch Input** | Switch 3 | **GPIO 34** | Physical toggle switch (boot-safe input) |
| **Switch Input** | Switch 4 | **GPIO 35** | Physical toggle switch (boot-safe input) |

*Note: GPIO 32–35 are chosen specifically because they are input-only pins not involved in ESP32 boot-strapping, preventing unintended state flips during power cycling.*

---

## 3. Mandatory Startup & Boot Sequence

To guarantee appliance recovery without network dependency, the boot sequence must strictly follow this order:

1. **GPIO Initialization:**
   - Configure relay pins (`GPIO 16, 17, 18, 19`) as `OUTPUT`.
   - Configure switch pins (`GPIO 32, 33, 34, 35`) as `INPUT_PULLUP` or `INPUT` (per wiring design).
2. **Flash State Recovery (Before Network):**
   - Open ESP32 NVS using the Arduino `Preferences` library (`preferences.begin("saocs", false)`).
   - Read last known states for all 4 relays from flash.
   - Apply these states to the physical relay pins **immediately**, prior to initiating Wi-Fi or MQTT connections.
3. **Network Connection:**
   - Connect to Wi-Fi (supporting WPA2 personal / mobile hotspots).
   - Reconnect with exponential backoff on disconnect.
4. **MQTT Registration & Telemetry:**
   - Configure Mosquitto client with Last Will and Testament (LWT):
     - Topic: `office/<device_id>/status`
     - Payload: `offline` (QoS 1, retain: true).
   - Connect to broker with device-specific credentials.
   - Publish `online` to `office/<device_id>/status`.
   - Subscribe to command topic: `office/<device_id>/command` (QoS 1).
   - Publish current states of all 4 relays to `office/<device_id>/state` (QoS 1) so the backend mirror synchronizes immediately.
5. **Main Execution Loop.**

---

## 4. Single-Authority Arbitration & 1000ms Debounce Queue

### The Arbitration Model ("Most Recent Change Wins")
- The ESP32 main loop converges both physical switch state transitions and incoming MQTT commands into a single authoritative state variable per channel.
- Whichever input is processed most recently overwrites that channel's state.
- No distributed timestamp synchronization is required between cloud backend and device.

### 1000ms Relay Debounce & Cooldown Rule
Per PRD NFR-5 and TRD §6:
- A minimum interval of **1000ms (1 second)** must elapse between consecutive actuations of the same physical relay to protect hardware contacts.
- **Queueing Behavior (Non-negotiable):**
  - If a command or switch flip arrives within the 1000ms window, the new requested state **MUST BE QUEUED**.
  - The firmware must apply the queued state the instant the 1000ms timer elapses.
  - **Never silently drop or discard** rapid commands or switch toggles.
  - **Never bypass** the 1-second debounce for test convenience or speed.

---

## 5. MQTT Messaging & Serialization Standards

### Topics
For each device identified by `<device_id>` (e.g. `esp32_prototype_01`):
1. `office/<device_id>/command`: Incoming commands from backend.
   - Expected payload: `{"channel": 1, "state": "ON"}` or `{"channel": 1, "state": "OFF"}`.
   - Handling must be **idempotent**: Commanding an already-ON relay to ON causes no double-actuation or relay wear.
2. `office/<device_id>/state`: Outgoing telemetry to backend.
   - Published on every confirmed state change and upon boot reconnect.
   - Payload: `{"channel": 1, "state": "ON", "source": "switch"|"command", "timestamp_ms": 12345}`.
3. `office/<device_id>/status`: LWT topic (`online` / `offline`).

---

## 6. Security, OTA & Environment Variables

1. **ArduinoOTA:**
   - Enable `ArduinoOTA` for wireless firmware updates after physical installation.
   - Protect with an OTA password supplied at build time via compiler flags (`-DOTA_PASSWORD=\"...\"`).
   - Never hardcode the OTA password, Wi-Fi passwords, or MQTT credentials as plaintext literals in C++ source files.
2. **Environment Variables & Secrets:**
   - Follow `AGENTS.md` §3: Maintain `.env.template` only. Never create, read, or commit `.env`.
   - In PlatformIO, local credentials for testing are injected via build flags in `platformio.ini` from local environment variables or untracked local files.

---

## 7. PlatformIO Project Structure & Tooling

```
firmware/
├── platformio.ini         # Pinned lib_deps and esp32dev build configuration
├── src/
│   ├── main.cpp           # Main loop, setup, and arbitration coordinator
│   ├── relays.h/.cpp      # Relay driver with 1000ms cooldown queue
│   ├── switches.h/.cpp    # Switch input handler and transition detection
│   ├── storage.h/.cpp     # Flash persistence via Preferences
│   ├── mqtt_client.h/.cpp # Outbound MQTT and LWT management
│   └── ota.h/.cpp         # ArduinoOTA setup with build-flag password
└── include/
    └── config.h           # Locked GPIO pin mappings and constants
```

### Build & Verification Commands
- Check PlatformIO version: `pio --version` (requires 6.1.19+).
- Compile firmware: `pio run -d firmware -e esp32dev`
- Flash via USB: `pio run -d firmware -e esp32dev -t upload`
- Monitor Serial Output: `pio device monitor -d firmware -b 115200`
