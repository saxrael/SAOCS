#pragma once

#ifdef MQTT_ENABLED

#include <stdbool.h>

namespace WifiManager {

void begin();
void tick();
bool isConnected();

}

#endif
