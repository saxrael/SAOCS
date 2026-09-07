#pragma once

#ifdef MQTT_ENABLED

#include <stdint.h>
#include <stdbool.h>

namespace MqttManager {

void begin();
void tick();
bool isConnected();
void publishState(uint8_t channel, bool state, const char* source);
void publishAllStates(const char* source);

}

#endif
