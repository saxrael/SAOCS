#include <Arduino.h>
#include "config.h"
#include "storage.h"
#include "relays.h"
#include "switches.h"

#ifdef MQTT_ENABLED
#include "wifi_manager.h"
#include "mqtt_client.h"
#include "ota.h"

namespace MqttClient = MqttManager;
#endif

#ifdef SERIAL_HARNESS_ENABLED
#include "serial_harness.h"
#endif

void setup() {
#ifdef SERIAL_HARNESS_ENABLED
    Serial.begin(115200);
#endif

    Storage::begin();

    Relays::begin();
    Relays::applyPersistedStates();

    Switches::begin();

#ifdef MQTT_ENABLED
    Relays::setStateChangeCallback([](uint8_t channel, bool newState, const char* source) {
        MqttClient::publishState(channel, newState, source);
    });

    WifiManager::begin();
    MqttClient::begin();
    Ota::begin();
#endif

#ifdef SERIAL_HARNESS_ENABLED
    SerialHarness::begin(115200);
    Serial.println("SAOCS ready.");
#endif
}

void loop() {
    Switches::tick([](uint8_t channel, bool newState) {
        Relays::setCurrentSource("switch");
        Relays::requestStateChange(channel, newState);
    });

    Relays::tick();

#ifdef MQTT_ENABLED
    WifiManager::tick();
    MqttClient::tick();
    Ota::tick();
#endif

#ifdef SERIAL_HARNESS_ENABLED
    SerialHarness::tick();
#endif
}
