#pragma once

#include <stdint.h>

static constexpr uint8_t RELAY_PINS[4] = {16, 17, 18, 19};
static constexpr uint8_t SWITCH_PINS[4] = {32, 33, 34, 35};
static constexpr uint8_t RELAY_COUNT = 4;
static constexpr uint32_t RELAY_COOLDOWN_MS = 1000;
static constexpr uint32_t SWITCH_DEBOUNCE_MS = 50;
static constexpr char NVS_NAMESPACE[] = "saocs";
static constexpr char NVS_RELAY_KEYS[4][3] = {"r1", "r2", "r3", "r4"};

#ifdef MQTT_ENABLED
static constexpr char MQTT_TOPIC_PREFIX[] = "office";
static constexpr uint32_t WIFI_RECONNECT_INTERVAL_MS = 5000;
static constexpr uint32_t MQTT_RECONNECT_INTERVAL_MS = 5000;
static constexpr uint16_t MQTT_KEEPALIVE_SECONDS = 15;

#ifndef WIFI_SSID
#define WIFI_SSID ""
#endif

#ifndef WIFI_PASSWORD
#define WIFI_PASSWORD ""
#endif

#ifndef MQTT_BROKER_HOST
#define MQTT_BROKER_HOST "localhost"
#endif

#ifndef MQTT_BROKER_PORT
#define MQTT_BROKER_PORT 1883
#endif

#ifndef MQTT_DEVICE_USER
#define MQTT_DEVICE_USER "saocs_esp32"
#endif

#ifndef MQTT_DEVICE_PASSWORD
#define MQTT_DEVICE_PASSWORD ""
#endif

#ifndef MQTT_DEVICE_ID
#define MQTT_DEVICE_ID "esp32_prototype_01"
#endif

#ifndef OTA_PASSWORD
#define OTA_PASSWORD ""
#endif
#endif
