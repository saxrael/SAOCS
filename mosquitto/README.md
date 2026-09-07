# Mosquitto Broker Setup & Local Runbook

This directory contains configuration and access control policies for the Eclipse Mosquitto 2.x MQTT message broker.

## 1. Password File Generation

The broker requires an authenticated password file at `mosquitto/config/password_file`. This file is gitignored and must never be committed.

### Option A: Using Docker (Recommended for Windows / Mac / Linux)

Run the following commands from the repository root:

For `saocs_esp32` (creates new file with `-c` flag):
```powershell
docker run --rm -it -v "${PWD}/mosquitto/config:/mosquitto/config" eclipse-mosquitto:2 mosquitto_passwd -c /mosquitto/config/password_file saocs_esp32
```

For `saocs_backend` (appends to existing file, omit `-c` flag):
```powershell
docker run --rm -it -v "${PWD}/mosquitto/config:/mosquitto/config" eclipse-mosquitto:2 mosquitto_passwd /mosquitto/config/password_file saocs_backend
```

Non-interactive automated generation using `-b` flag:
```powershell
docker run --rm -v "${PWD}/mosquitto/config:/mosquitto/config" eclipse-mosquitto:2 mosquitto_passwd -b -c /mosquitto/config/password_file saocs_esp32 <device_password>
docker run --rm -v "${PWD}/mosquitto/config:/mosquitto/config" eclipse-mosquitto:2 mosquitto_passwd -b /mosquitto/config/password_file saocs_backend <backend_password>
```

### Option B: Using Native mosquitto_passwd CLI

If Mosquitto tools are installed locally:
```bash
mosquitto_passwd -c mosquitto/config/password_file saocs_esp32
mosquitto_passwd mosquitto/config/password_file saocs_backend
```

## 2. File Permissions & Line Endings

1. On Linux or OCI VPS environments, ensure the generated password file is readable by UID 1883:
```bash
chmod 600 mosquitto/config/password_file
```
2. Ensure `mosquitto.conf` and `acl.conf` have LF (Unix) line endings, not CRLF (Windows). Trailing carriage returns (`\r`) will cause Mosquitto to misinterpret filenames and username definitions.

## 3. Running the Broker

### Start Broker Service
```bash
docker compose up -d mosquitto
```

### View Live Logs
```bash
docker compose logs -f mosquitto
```

### Stop Broker Service
```bash
docker compose stop mosquitto
```

## 4. Verification & Testing

### Test 1: Authenticated Subscription (Backend)
```bash
docker exec -it saocs-mosquitto mosquitto_sub -h localhost -p 1883 -u saocs_backend -P <backend_password> -t "office/+/state" -v
```

### Test 2: State Telemetry Publish (ESP32)
```bash
docker exec -it saocs-mosquitto mosquitto_pub -h localhost -p 1883 -u saocs_esp32 -P <device_password> -t "office/esp32_prototype_01/state" -m '{"channel":1,"state":"ON","source":"switch","timestamp_ms":1000}'
```

### Test 3: ACL Rejection Verification (Negative Test)
Attempt publishing to an unauthorized topic using ESP32 credentials:
```bash
docker exec -it saocs-mosquitto mosquitto_pub -h localhost -p 1883 -u saocs_esp32 -P <device_password> -t "office/unauthorized_device/state" -m '{"channel":1}'
```
The broker will drop the message and reject the action.
