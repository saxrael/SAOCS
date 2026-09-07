#include "switches.h"
#include "config.h"
#include <Arduino.h>

namespace Switches {

namespace {
constexpr uint8_t SWITCH_COUNT = sizeof(SWITCH_PINS) / sizeof(SWITCH_PINS[0]);

struct SwitchChannel {
    bool lastStableState;
    bool candidateState;
    uint32_t debounceStartMs;
};

SwitchChannel channels[SWITCH_COUNT];
} // namespace

void begin() {
    for (uint8_t i = 0; i < SWITCH_COUNT; ++i) {
        if (i < 2) {
            pinMode(SWITCH_PINS[i], INPUT_PULLUP);
        } else {
            // GPIO 34 and 35 are input-only on ESP32-WROOM-32 and lack internal pull-ups; external pull-up resistors required.
            pinMode(SWITCH_PINS[i], INPUT);
        }

        bool initialReading = (digitalRead(SWITCH_PINS[i]) == HIGH);
        channels[i].lastStableState = initialReading;
        channels[i].candidateState = initialReading;
        channels[i].debounceStartMs = 0;
    }
}

void tick(ChangeCallback callback) {
    uint32_t now = millis();
    if (now == 0) {
        now = 1;
    }

    for (uint8_t i = 0; i < SWITCH_COUNT; ++i) {
        bool rawReading = (digitalRead(SWITCH_PINS[i]) == HIGH);

        if (rawReading != channels[i].lastStableState) {
            if (channels[i].debounceStartMs == 0) {
                channels[i].candidateState = rawReading;
                channels[i].debounceStartMs = now;
            } else if (rawReading == channels[i].candidateState) {
                if ((now - channels[i].debounceStartMs) >= SWITCH_DEBOUNCE_MS) {
                    channels[i].lastStableState = rawReading;
                    channels[i].debounceStartMs = 0;
                    if (callback != nullptr) {
                        callback(i, rawReading);
                    }
                }
            } else {
                channels[i].candidateState = rawReading;
                channels[i].debounceStartMs = now;
            }
        } else {
            channels[i].debounceStartMs = 0;
        }
    }
}

}
