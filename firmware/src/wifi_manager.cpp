#ifdef MQTT_ENABLED

#include "wifi_manager.h"
#include "config.h"
#include <WiFi.h>
#include <Arduino.h>

namespace WifiManager {

namespace {
uint32_t lastAttemptMs = 0;
}

void begin() {
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    lastAttemptMs = millis();
    if (lastAttemptMs == 0) {
        lastAttemptMs = 1;
    }
}

void tick() {
    uint32_t now = millis();
    if (now == 0) {
        now = 1;
    }

    if (WiFi.status() == WL_CONNECTED) {
        return;
    }

    if (now - lastAttemptMs >= WIFI_RECONNECT_INTERVAL_MS) {
        lastAttemptMs = now;
        WiFi.disconnect();
        WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    }
}

bool isConnected() {
    return WiFi.status() == WL_CONNECTED;
}

}

#endif
