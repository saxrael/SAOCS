# Technical Requirements Document — Smart Office Appliance Control System

**Document Governance:** Governed by the Project Summary and the PRD — nothing here may contradict either. This TRD governs the Security, CI/CD, UI/UX, and Frontend documents, plus the Execution Strategy Handbook and coding-agent files. Tie-break on same-level conflict: most recent revision governs, and any conflict is flagged, never silently resolved. This document assumes the PRD has been read; it does not re-explain what the product does or why.

## 1. Build & Runtime Environment

| Component | Choice |
|---|---|
| Firmware language/framework | C/C++, Arduino framework |
| Firmware build system | PlatformIO Core 6.1.19, driven from within Antigravity |
| Firmware target | Generic ESP32 dev board — PlatformIO environment `esp32dev`, compatible with any standard ESP32-WROOM-32 module |
| Backend language/framework | Python 3.12, FastAPI, served by Uvicorn workers |
| Backend dependency management | `uv`, with dependencies declared in `pyproject.toml` and pinned via `uv.lock` (no `requirements.txt`) |
| Frontend framework | React, built with Vite |
| Message broker | Mosquitto 2.x, self-hosted |
| Database | SQLite, single file on a persistent Docker volume |
| Containerization | Docker + Docker Compose |
| Reverse proxy / static hosting | Caddy container — serves the built React app as static files, reverse-proxies API/WebSocket traffic to FastAPI, and handles TLS automatically (no separate Certbot setup) |

**Local-dev vs. production parity:** the same `docker-compose.yml` structure runs locally and on the OCI VPS, with environment-specific values (broker host, secrets) supplied via a gitignored `.env` file, populated manually by Israel from the committed `.env.template` reference — never written to or read by the coding agent (see Security Documentation §4). Firmware is developed and flashed against a local Mosquitto instance first, then re-pointed at the OCI-hosted broker once the end-to-end flow is confirmed working locally — this avoids burning defense-critical time debugging against the production broker.

## 2. Core Architecture

**Components and communication, in full:**

1. **ESP32 firmware** — owns relay outputs, switch inputs, and its own persisted state. Connects outbound only, over Wi-Fi (including a mobile hotspot), to the Mosquitto broker. Never accepts inbound connections.
2. **Mosquitto broker** — the only thing the ESP32 ever talks to over the network. Topic structure, per device:
   - `office/<device_id>/command` — backend publishes appliance commands here; ESP32 subscribes.
   - `office/<device_id>/state` — ESP32 publishes its current relay states here (JSON, one message per state change); backend subscribes.
   - `office/<device_id>/status` — ESP32's MQTT Last Will and Testament (LWT), so the backend knows immediately if the device drops offline, published as `online`/`offline`.
   - Both command and state topics use QoS 1 (at-least-once delivery). Firmware handling is idempotent, so a duplicate command delivery cannot double-toggle a relay.
   - TLS is enabled on the broker (certificate via Let's Encrypt on the OCI VPS), so credentials and payloads are encrypted in transit.
   - Two credentials exist: one for the ESP32, ACL-scoped to only its own device's three topics; one for the backend, ACL-scoped to `office/+/*` so it can address any device.
3. **FastAPI backend** — subscribes to all devices' state/status topics, publishes commands, owns the SQLite database, serves the REST API, and maintains a WebSocket endpoint that browsers connect to for live updates. Also exposes a `/version` endpoint returning the git SHA it was built from, used to verify which deployment is actually running (see CI/CD Documentation §6). When the backend receives a state update from the broker, it updates its SQLite mirror of appliance state and immediately broadcasts the change over WebSocket to every connected dashboard session — this is the mechanism behind the PRD's near-real-time sync target.
4. **React frontend** — served as a static build via Caddy, communicates with the backend over HTTPS (REST for commands, scheduling, auth, reports) and a WebSocket connection (for live state updates).
5. **Caddy** — terminates TLS (automatically obtaining and renewing its own Let's Encrypt certificate, with no separate Certbot step), serves the frontend's static build, and reverse-proxies `/api/*` and the WebSocket path to the FastAPI container. Automatic HTTPS requires a real domain name pointed at the VM's IP — a bare IP address cannot receive a Let's Encrypt certificate through the standard HTTP-01 challenge Caddy uses. Given the zero-budget constraint, this project uses a free DuckDNS subdomain (e.g. `smart-office-abu.duckdns.org`) pointed at the OCI VM's reserved static public IP, rather than a paid domain registration.

## 3. Data Layer

All data lives in a single SQLite database, owned exclusively by the FastAPI backend — no other component writes to it directly.

| Entity | Storage | Owner | Retention |
|---|---|---|---|
| `users` (id, email, hashed_password, google_subject_id, is_admin, created_at) | SQLite | Backend | Indefinite, deletable on request (NDPA posture) |
| `appliances` (id, name, device_id, relay_channel, assumed_wattage_watts) | SQLite | Backend | Indefinite |
| `appliance_state` (appliance_id, current_state, last_changed_source, last_changed_at) — a mirror of what the ESP32 last reported, never written from a user action directly | SQLite | Backend, written only from MQTT state messages | Current value only; history lives in `activity_log` |
| `activity_log` (id, appliance_id, event_type, source, actor_user_id, timestamp) — `actor_user_id` is set for app-originated events and null for switch-originated ones, since a physical switch flip has no associated account | SQLite | Backend | Indefinite, no pruning (per PRD FR-13) |
| `schedules` (id, appliance_id, action, scheduled_time, created_by) | SQLite | Backend | Indefinite, deletable by the creator or an admin |

**Migration strategy:** Alembic manages schema migrations against SQLite from the start, even though the project is small — this avoids ad-hoc manual schema edits during a multi-week build where the schema will likely change more than once.

**Energy usage & cost estimation (PRD FR-17):** each appliance record carries an `assumed_wattage_watts` value — since the physical prototype uses LED bulbs to stand in for real appliances (lights, fans, ACs), this field represents what the appliance is simulating (e.g. an appliance can be configured as "represents a 1500W air conditioner") rather than the LED bulb's actual, much lower draw. Energy usage over a period is computed as `assumed_wattage_watts × total_on_duration_hours ÷ 1000`, with on-duration derived by pairing consecutive on/off events from `activity_log` per appliance. Cost is that energy figure multiplied by a per-kWh rate stored as a configurable backend setting, not hardcoded — defaulting to ₦209.5/kWh, Kaduna Electric's Band A tariff as last publicly confirmed (July 2024). This is flagged as a default requiring a check against the current rate close to the actual defense date, since NERC tariffs are reviewed periodically and this project has no live feed to Kaduna Electric's pricing.

## 4. Integration Points

| External system | Purpose | Failure mode |
|---|---|---|
| Google OAuth | First-time identity verification during onboarding | If unreachable, new-user onboarding is blocked until it recovers; already-onboarded users are unaffected, since they can sign in with their fallback password |
| Mosquitto broker | Device-backend command/state channel | Per PRD FR-20/FR-21: physical switch control is unaffected; dashboard shows a stale/disconnected indicator |
| ESP32 hardware | Physical appliance control | Per PRD's failure branch: backend retries twice with backoff, surfaces a specific error within ~2 seconds if still unresolved |
| OCI VPS (hosting the backend, broker, and Caddy) | Runtime environment for everything except the ESP32 itself | If the VPS is down, all remote control and the dashboard are unavailable; physical switches keep working. This is an accepted single point of failure under the project's zero-budget constraint (per PRD's Risk & Compliance Summary) — not mitigated further in this build |

## 5. Deployment Architecture

A single Docker Compose stack — Caddy, FastAPI, Mosquitto — runs on one OCI Ampere A1 (always-free tier) VM instance. The SQLite file lives on a named Docker volume so it survives container restarts and redeploys. There is no auto-scaling and no multi-instance failover; this matches the project's confirmed small-scale, zero-budget, single-demo-box scope — it is not designed to survive VM-level failure. Deployment pipeline mechanics (how a code change reaches this stack) are defined in the CI/CD Documentation, not restated here.

## 6. Firmware / Embedded Pipeline

*(Domain-specific section — the sensor/switch input path is a core input modality distinct from the web/backend architecture above.)*

**GPIO pin contract** (fixed interface between the firmware and the physical wiring, so Israel's firmware work and Abdulfatai's wiring work can proceed independently against the same agreed contract):

| Function | GPIO |
|---|---|
| Relay channel 1–4 output | GPIO 16, 17, 18, 19 |
| Switch input 1–4 | GPIO 32, 33, 34, 35 |

GPIO 32–35 are chosen for switch inputs because they're input-capable pins uninvolved in ESP32 boot-strapping, avoiding conflicts with flash/boot behavior.

**Startup sequence:**
1. Boot, connect to Wi-Fi.
2. Read all four relay states from flash (NVS/Preferences) and immediately apply them to the relay outputs, before attempting any network connection — appliances reach their correct state as fast as possible after power-on, independent of network availability.
3. Connect to the MQTT broker; publish `online` on the status topic (LWT counterpart) and publish current state on the state topic for all four relays, so the backend's mirror is corrected immediately on reconnect.
4. Enter the main loop.

**Main loop, per relay, every cycle:**
1. Poll (or interrupt-trigger on) the switch input for a state transition.
2. Check for an incoming MQTT command on the command topic.
3. Whichever event is processed most recently overwrites that relay's single authoritative state variable — this is the entire "most-recent-change-wins" mechanism (PRD FR-7): no cross-system timestamp comparison is needed, since both inputs converge on one variable inside the same single-threaded loop.
4. Before applying any state change, check the 1000ms cooldown (PRD NFR-5) for that relay; if inside the cooldown window, the new change is queued and applied at the earliest moment the cooldown clears, rather than dropped silently.
5. Apply the resulting state to the relay output, persist it to flash, and publish it on the state topic.

**OTA updates:** ArduinoOTA is enabled, protected by an OTA password (stored in the firmware's `.env`/build flag, not hardcoded in source), so firmware can be updated over Wi-Fi after the initial physical flash without requiring physical USB access to the board.

## 7. Parallel Development Plan

Two human contributors plus one coding agent, working across two tracks that must agree on one shared contract before proceeding independently:

- **Track A — Software** (Israel, using Antigravity): firmware, backend, frontend, broker and deployment configuration.
- **Track B — Hardware** (Abdulfatai): relay wiring, switch wiring, power supply, enclosure.
- **Shared contract:** the GPIO pin-mapping table in §6. Both tracks build against it as fixed from the moment it's agreed; a change to it after wiring begins requires re-wiring, not just a firmware edit, so it is treated as a locked interface, not a draft.

Within Track A, work is single-threaded (one person, sequential): firmware, then backend, then frontend integration, in the order fixed by `STAGE_PROTOCOLS.md`.
