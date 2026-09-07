#ifdef MQTT_ENABLED

#include "ota.h"
#include "config.h"
#include <ArduinoOTA.h>
#include <string.h>

namespace Ota {

void begin() {
    ArduinoOTA.setHostname(MQTT_DEVICE_ID);
    if (strlen(OTA_PASSWORD) > 0) {
        ArduinoOTA.setPassword(OTA_PASSWORD);
    }
    ArduinoOTA.begin();
}

void tick() {
    ArduinoOTA.handle();
}

}

#endif
