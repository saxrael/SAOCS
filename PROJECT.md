# Project: SAOCS Joint Stage 3 + Stage 4 — MQTT Integration & Backend Core

## Architecture
- **Hardware/Firmware Layer (ESP32)**: PlatformIO project under `firmware/`. C++ / Arduino framework. Manages 4 relays (GPIO 16-19) and 4 switches (GPIO 32-35) with 1000ms non-blocking debounce queue, NVS flash state persistence, Station mode WiFi manager, `espMqttClient` MQTT client with QoS 1, ArduinoOTA update listener, and single-authority arbitration.
- **Message Broker Layer (Mosquitto 2.x)**: Local Dockerized Eclipse Mosquitto broker listening on 1883. Authenticated via `password_file` with strict ACL isolation (`mosquitto/acl/acl.conf`). ESP32 restricted to its own device topics (`office/esp32_prototype_01/#`); backend granted wildcard access (`office/+/#`).
- **Backend Core Layer (FastAPI)**: Python 3.12 async application under `backend/`. Uses SQLAlchemy 2.0 with `aiosqlite` on persistent SQLite database, Alembic migrations, `aiomqtt` client hooked into FastAPI lifespan, WebSocketManager broadcasting real-time updates to connected sessions, Google OAuth2 + fallback password authentication with JWT access/refresh tokens, and account lockout rate limiter (5 failed attempts = 15m lockout).
- **Communication Flow**:
  - Web/User -> Backend REST -> validates 1000ms debounce -> publishes `office/<device_id>/command` (QoS 1).
  - ESP32 receives command -> `Relays::requestStateChange()` -> applies or queues -> publishes `office/<device_id>/state` (QoS 1).
  - Backend receives `office/<device_id>/state` -> updates SQLite state mirror -> writes `ActivityLog` -> broadcasts over WebSocket to all dashboard sessions.
  - Physical switch flipped -> debounce 50ms -> `Relays::requestStateChange()` -> executes -> publishes `office/<device_id>/state` -> backend receives & mirrors.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Multi-Environment Build Matrix | PlatformIO environments: esp32dev, esp32dev_mqtt, esp32dev_release | M1 | ORIGINAL_REQUEST §A2 |
| 2 | Locked GPIO & Debounce Hook | Preserve GPIO 16-19/32-35 & 1000ms cooldown, add stateChangeCallback and pendingSource | M1 | ORIGINAL_REQUEST §A6 |
| 3 | WiFi Manager | Non-blocking Station mode connection and millis-based reconnect loop | M1 | ORIGINAL_REQUEST §A4 |
| 4 | MQTT Client | QoS 1 subscribe to command, publish state telemetry with static buffer lifetime | M1 | ORIGINAL_REQUEST §A5 |
| 5 | LWT & Status Telemetry | Retained offline LWT, retained online status, publishAllStates on boot | M1 | ORIGINAL_REQUEST §A5 |
| 6 | OTA Update Listener | Password-authenticated ArduinoOTA with non-blocking tick | M1 | ORIGINAL_REQUEST §A7 |
| 7 | Boot Sequence & Arbitration | Strict boot order: NVS restore -> GPIO drive -> network init; non-blocking loop | M1 | ORIGINAL_REQUEST §A8 |
| 8 | Mosquitto Broker Config | Port 1883, anonymous disabled, persistence enabled, password_file authentication | M2 | ORIGINAL_REQUEST §A9 |
| 9 | Mosquitto ACL Configuration | User saocs_esp32 device-specific access; saocs_backend wildcard access | M2 | ORIGINAL_REQUEST §A9 |
| 10 | Environment Template Additions | Add WIFI_SSID, WIFI_PASSWORD, MQTT_BROKER_PORT to .env.template | M2 | ORIGINAL_REQUEST §A10 |
| 11 | Gitignore Security Rules | Ignore mosquitto/config/password_file and mosquitto/data/ | M2 | ORIGINAL_REQUEST §A11 |
| 12 | Docker Compose Stack | mosquitto and backend services with bridge networking and volumes | M2 | ORIGINAL_REQUEST §B12 |
| 13 | Backend Project Scaffold | pyproject.toml with uv dependencies, Dockerfile, app structure | M3 | ORIGINAL_REQUEST §B1-B2 |
| 14 | Database Engine & Sessions | Async SQLAlchemy 2.0 engine, async_sessionmaker, Base DeclarativeBase | M3 | ORIGINAL_REQUEST §B4 |
| 15 | ORM Models | User, Appliance, ApplianceState, ActivityLog, Schedule | M3 | ORIGINAL_REQUEST §B5 |
| 16 | Alembic Migrations | Initial schema revision 001_initial_schema.py with full upgrade/downgrade | M3 | ORIGINAL_REQUEST §B6 |
| 17 | Pydantic Schemas | Request/response schemas for auth, appliances, logs, schedules | M3 | ORIGINAL_REQUEST §B7 |
| 18 | Google OAuth & Setup Flow | Google OAuth2 via Authlib, setup token for first-time password creation | M3 | ORIGINAL_REQUEST §B8 |
| 19 | Fallback Password & JWT | Bcrypt hashing, 60m access token, 7d refresh token with rotation | M3 | ORIGINAL_REQUEST §B8 |
| 20 | Login Rate Limiter | 5 failed password attempts = 15-minute lock (HTTP 423), Google OAuth unlock | M3 | ORIGINAL_REQUEST §B8 |
| 21 | Backend MQTT Service | aiomqtt in FastAPI lifespan, subscribe state/status, mirror DB, emit activity log | M3 | ORIGINAL_REQUEST §B9 |
| 22 | Backend Command Publishing | Validate 1000ms cooldown, publish command QoS 1 to office/<device_id>/command | M3 | ORIGINAL_REQUEST §B9 |
| 23 | WebSocket Manager | /api/ws?token=<jwt>, connection tracking, broadcast state_change & status | M3 | ORIGINAL_REQUEST §B10 |
| 24 | REST API Routes | Auth, appliances, activity-log, schedules, users, version routers | M3 | ORIGINAL_REQUEST §B11 |
| 25 | Pytest Test Suite | 25 test cases across Auth (T-A1..T-A13), Appliances (T-B1..T-B4), MQTT (T-C1..T-C4), WS (T-D1..T-D4) | M4 | ORIGINAL_REQUEST §Verification |
| 26 | Multi-Target Build Verification | pio run -e esp32dev, esp32dev_mqtt, esp32dev_release (0 errors, 0 warnings) | M4 | ORIGINAL_REQUEST §Verification |
| 27 | Code Quality & Zero Comments Audit | Ruff check 0 errors, git grep zero comments audit | M4 | AGENTS.md §3 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Track 1: Firmware MQTT & OTA | platformio.ini, config.h, wifi_manager, mqtt_client, ota, relays hook, main.cpp | none | DONE (worker: 6df8f552-cd51-4afb-9026-361d4ac54670) |
| M2 | Track 2: Mosquitto & Infra | mosquitto.conf, acl.conf, README.md, .gitignore, .env.template, docker-compose.yml | none | DONE (worker: 0b37a11f-c2bc-48e3-8d38-74b529b4212e) |
| M3 | Track 3: Backend Core | Scaffold, database, models, migrations, auth, MQTT service, WS manager, REST API | M2 (config contracts) | DONE (worker: 099ffa39-dd8b-41a6-b3d6-3d1ed3722e59) |
| M4 | Track 4: Verification & Gating | Pytest suite, PlatformIO compilation (3 envs), Ruff, Zero-Comments forensic audit | M1, M2, M3 | DONE (Gate PASS: 2 Reviewers, 2 Challengers, 1 Forensic Auditor) |

## Interface Contracts

### Firmware ↔ MQTT Broker
- **Client ID**: `esp32_prototype_01` (from `MQTT_DEVICE_ID`)
- **Username / Password**: `saocs_esp32` / `MQTT_DEVICE_PASSWORD`
- **Subscribe Topic**: `office/esp32_prototype_01/command` (QoS 1)
  - Payload format: `{"channel": 0, "state": "ON"}` (channel: 0-indexed integer 0-3, state: `"ON"` or `"OFF"`)
- **Publish State Topic**: `office/esp32_prototype_01/state` (QoS 1, retain: false)
  - Payload format: `{"channel": 0, "state": "ON", "source": "switch"|"command"|"boot", "timestamp_ms": 12345}`
- **Publish Status Topic (LWT & Connect)**: `office/esp32_prototype_01/status` (QoS 1, retain: true)
  - Connected payload: `online`
  - LWT payload: `offline`

### Backend ↔ MQTT Broker
- **Client ID**: `saocs_backend_service`
- **Username / Password**: `saocs_backend` / `MQTT_BACKEND_PASSWORD`
- **Subscribe Topics**: `office/+/state` (QoS 1), `office/+/status` (QoS 1)
- **Publish Command Topic**: `office/<device_id>/command` (QoS 1)

### Backend ↔ Frontend Dashboard
- **REST Endpoints**:
  - `POST /api/auth/google/login` & `GET /api/auth/google/callback`
  - `POST /api/auth/setup-password`
  - `POST /api/auth/login`
  - `POST /api/auth/refresh`
  - `GET /api/auth/me`
  - `GET /api/appliances/`
  - `POST /api/appliances/{id}/command` (`{"state": "ON"|"OFF"}`)
  - `GET /api/activity-log/`
  - `GET /api/schedules/` & `POST /api/schedules/` & `DELETE /api/schedules/{id}`
  - `POST /api/users/register` (admin only)
  - `GET /api/version`
- **WebSocket Endpoint**: `/api/ws?token=<jwt_access_token>`
  - Messages emitted: `{"type": "state_change", "appliance_id": "...", "state": "ON"|"OFF", "source": "...", "timestamp": "..."}`
  - `{"type": "device_status", "device_id": "...", "status": "online"|"offline", "timestamp": "..."}`

## Code Layout
```
/
├── AGENTS.md
├── PROJECT.md
├── SKILLS_MANIFEST.md
├── STAGE_PROTOCOLS.md
├── docker-compose.yml
├── .env.template
├── .gitignore
├── firmware/
│   ├── platformio.ini
│   ├── include/
│   │   └── config.h
│   └── src/
│       ├── main.cpp
│       ├── config.h -> ../include/config.h
│       ├── storage.h / storage.cpp
│       ├── relays.h / relays.cpp
│       ├── switches.h / switches.cpp
│       ├── serial_harness.h / serial_harness.cpp
│       ├── wifi_manager.h / wifi_manager.cpp
│       ├── mqtt_client.h / mqtt_client.cpp
│       └── ota.h / ota.cpp
├── mosquitto/
│   ├── config/
│   │   └── mosquitto.conf
│   ├── acl/
│   │   └── acl.conf
│   └── README.md
└── backend/
    ├── pyproject.toml
    ├── Dockerfile
    ├── alembic.ini
    ├── alembic/
    │   ├── env.py
    │   └── versions/
    │       └── 001_initial_schema.py
    ├── app/
    │   ├── __init__.py
    │   ├── main.py
    │   ├── config.py
    │   ├── database.py
    │   ├── models/
    │   │   ├── __init__.py
    │   │   ├── user.py
    │   │   ├── appliance.py
    │   │   ├── activity_log.py
    │   │   └── schedule.py
    │   ├── schemas/
    │   │   ├── __init__.py
    │   │   ├── auth.py
    │   │   ├── appliance.py
    │   │   ├── activity_log.py
    │   │   └── schedule.py
    │   ├── services/
    │   │   ├── __init__.py
    │   │   ├── auth_service.py
    │   │   ├── appliance_service.py
    │   │   ├── mqtt_service.py
    │   │   └── websocket_manager.py
    │   ├── middleware/
    │   │   ├── __init__.py
    │   │   └── rate_limiter.py
    │   └── api/
    │       ├── __init__.py
    │       ├── router.py
    │       ├── auth.py
    │       ├── appliances.py
    │       ├── activity_log.py
    │       ├── schedules.py
    │       ├── users.py
    │       └── websocket.py
    └── tests/
        ├── __init__.py
        ├── conftest.py
        ├── test_auth.py
        ├── test_appliances.py
        ├── test_mqtt_integration.py
        └── test_websocket.py
```
