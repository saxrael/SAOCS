#ifdef MQTT_ENABLED

#include <espMqttClient.h>
#include "mqtt_client.h"
#include "config.h"
#include "wifi_manager.h"
#include "relays.h"
#include <ArduinoJson.h>
#include <Arduino.h>
#include <stdio.h>
#include <string.h>

namespace MqttManager {

namespace {

espMqttClient client;
uint32_t lastMqttAttemptMs = 0;

char topicCommand[64];
char topicState[64];
char topicStatus[64];
const char payloadOnline[] = "online";
const char payloadOffline[] = "offline";

void onConnect(bool sessionPresent) {
    client.publish(topicStatus, 1, true, payloadOnline);
    client.subscribe(topicCommand, 1);
    publishAllStates("boot");
}

void onDisconnect(espMqttClientTypes::DisconnectReason reason) {
}

void onMessage(const espMqttClientTypes::MessageProperties& properties, const char* topic, const uint8_t* payload, size_t len, size_t index, size_t total) {
    if (strcmp(topic, topicCommand) != 0) {
        return;
    }

    JsonDocument doc;
    DeserializationError err = deserializeJson(doc, payload, len);
    if (err) {
        return;
    }

    if (!doc["channel"].is<int>() || !doc["state"].is<const char*>()) {
        return;
    }

    int ch = doc["channel"].as<int>();
    uint8_t channelIndex = 0;
    if (ch >= 1 && ch <= RELAY_COUNT) {
        channelIndex = static_cast<uint8_t>(ch - 1);
    } else if (ch == 0) {
        channelIndex = 0;
    } else {
        return;
    }

    const char* stateStr = doc["state"].as<const char*>();
    bool targetState = false;
    if (strcmp(stateStr, "ON") == 0) {
        targetState = true;
    } else if (strcmp(stateStr, "OFF") == 0) {
        targetState = false;
    } else {
        return;
    }

    Relays::setCurrentSource("command");
    Relays::requestStateChange(channelIndex, targetState);
}

}

void begin() {
    snprintf(topicCommand, sizeof(topicCommand), "%s/%s/command", MQTT_TOPIC_PREFIX, MQTT_DEVICE_ID);
    snprintf(topicState, sizeof(topicState), "%s/%s/state", MQTT_TOPIC_PREFIX, MQTT_DEVICE_ID);
    snprintf(topicStatus, sizeof(topicStatus), "%s/%s/status", MQTT_TOPIC_PREFIX, MQTT_DEVICE_ID);

    client.setServer(MQTT_BROKER_HOST, MQTT_BROKER_PORT);
    client.setCredentials(MQTT_DEVICE_USER, MQTT_DEVICE_PASSWORD);
    client.setClientId(MQTT_DEVICE_ID);
    client.setKeepAlive(MQTT_KEEPALIVE_SECONDS);
    client.setCleanSession(true);
    client.setWill(topicStatus, 1, true, payloadOffline);

    client.onConnect(onConnect);
    client.onDisconnect(onDisconnect);
    client.onMessage(onMessage);
}

void tick() {
    client.loop();

    uint32_t now = millis();
    if (now == 0) {
        now = 1;
    }

    if (!WifiManager::isConnected()) {
        return;
    }

    if (!client.connected()) {
        if (now - lastMqttAttemptMs >= MQTT_RECONNECT_INTERVAL_MS) {
            lastMqttAttemptMs = now;
            client.connect();
        }
    }
}

bool isConnected() {
    return client.connected();
}

void publishState(uint8_t channel, bool state, const char* source) {
    if (channel >= RELAY_COUNT || !client.connected()) {
        return;
    }

    JsonDocument doc;
    doc["channel"] = channel + 1;
    doc["state"] = state ? "ON" : "OFF";
    doc["source"] = (source != nullptr) ? source : "unknown";
    doc["timestamp_ms"] = millis();

    char buffer[128];
    size_t len = serializeJson(doc, buffer, sizeof(buffer));
    if (len > 0) {
        client.publish(topicState, 1, false, buffer);
    }
}

void publishAllStates(const char* source) {
    for (uint8_t i = 0; i < RELAY_COUNT; ++i) {
        publishState(i, Relays::getState(i), source);
    }
}

}

#endif
