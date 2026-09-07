#include "storage.h"
#include "config.h"
#include <Preferences.h>

namespace Storage {

static Preferences preferences;

void begin() {
    preferences.begin(NVS_NAMESPACE, false);
}

bool readRelayState(uint8_t channel) {
    if (channel >= RELAY_COUNT) {
        return false;
    }
    return preferences.getBool(NVS_RELAY_KEYS[channel], false);
}

void writeRelayState(uint8_t channel, bool state) {
    if (channel >= RELAY_COUNT) {
        return;
    }
    preferences.putBool(NVS_RELAY_KEYS[channel], state);
}

}
