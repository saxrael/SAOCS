#include <Arduino.h>
#include "config.h"
#include "storage.h"
#include "relays.h"
#include "switches.h"

#ifdef SERIAL_HARNESS_ENABLED
#include "serial_harness.h"
#endif

void setup() {
#ifdef SERIAL_HARNESS_ENABLED
    Serial.begin(115200);
#endif

    Storage::begin();

    Relays::begin();
    Relays::applyPersistedStates(); // Drive pins from NVS before network or switches (TRD §6)

    Switches::begin();

#ifdef SERIAL_HARNESS_ENABLED
    SerialHarness::begin(115200);
    Serial.println("SAOCS Stage 2 ready.");
#endif
}

void loop() {
    Switches::tick([](uint8_t channel, bool newState) {
        Relays::requestStateChange(channel, newState);
    });

    Relays::tick();

#ifdef SERIAL_HARNESS_ENABLED
    SerialHarness::tick();
#endif
}
