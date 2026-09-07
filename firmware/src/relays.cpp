#include "relays.h"
#include "config.h"
#include "storage.h"
#include <Arduino.h>

namespace Relays {

namespace {

struct RelayChannel {
    bool currentState;
    uint32_t cooldownStartMs;
    bool hasPending;
    bool pendingState;
    const char* pendingSource;
};

RelayChannel channels[RELAY_COUNT];
StateChangeCallback stateChangeCb = nullptr;
const char* activeSource = "boot";

void apply(uint8_t channel, bool newState, const char* source) {
    channels[channel].currentState = newState;
    digitalWrite(RELAY_PINS[channel], newState ? HIGH : LOW);
    Storage::writeRelayState(channel, newState);
    if (stateChangeCb != nullptr) {
        stateChangeCb(channel, newState, source);
    }
}

}

void begin() {
    for (uint8_t i = 0; i < RELAY_COUNT; ++i) {
        pinMode(RELAY_PINS[i], OUTPUT);
        digitalWrite(RELAY_PINS[i], LOW);
        channels[i].currentState = false;
        channels[i].cooldownStartMs = 0;
        channels[i].hasPending = false;
        channels[i].pendingState = false;
        channels[i].pendingSource = "boot";
    }
}

void applyPersistedStates() {
    for (uint8_t i = 0; i < RELAY_COUNT; ++i) {
        bool persistedState = Storage::readRelayState(i);
        channels[i].currentState = persistedState;
        channels[i].cooldownStartMs = 0;
        channels[i].hasPending = false;
        channels[i].pendingState = false;
        channels[i].pendingSource = "boot";
        digitalWrite(RELAY_PINS[i], persistedState ? HIGH : LOW);
    }
}

void requestStateChange(uint8_t channel, bool newState) {
    if (channel >= RELAY_COUNT) {
        return;
    }

    if (newState == channels[channel].currentState) {
        channels[channel].hasPending = false;
        return;
    }

    if (channels[channel].cooldownStartMs != 0) {
        channels[channel].hasPending = true;
        channels[channel].pendingState = newState;
        channels[channel].pendingSource = activeSource;
        return;
    }

    apply(channel, newState, activeSource);

    uint32_t now = millis();
    if (now == 0) {
        now = 1;
    }
    channels[channel].cooldownStartMs = now;
    channels[channel].hasPending = false;
}

void tick() {
    uint32_t now = millis();
    if (now == 0) {
        now = 1;
    }

    for (uint8_t i = 0; i < RELAY_COUNT; ++i) {
        if (channels[i].cooldownStartMs == 0) {
            continue;
        }

        uint32_t elapsed = now - channels[i].cooldownStartMs;
        if (elapsed >= RELAY_COOLDOWN_MS) {
            channels[i].cooldownStartMs = 0;
            if (channels[i].hasPending) {
                bool nextState = channels[i].pendingState;
                const char* nextSource = channels[i].pendingSource;
                channels[i].hasPending = false;
                if (nextState != channels[i].currentState) {
                    apply(i, nextState, nextSource);
                    uint32_t applyNow = millis();
                    if (applyNow == 0) {
                        applyNow = 1;
                    }
                    channels[i].cooldownStartMs = applyNow;
                }
            }
        }
    }
}

bool getState(uint8_t channel) {
    if (channel >= RELAY_COUNT) {
        return false;
    }
    return channels[channel].currentState;
}

bool hasPending(uint8_t channel) {
    if (channel >= RELAY_COUNT) {
        return false;
    }
    return channels[channel].hasPending;
}

bool getPendingState(uint8_t channel) {
    if (channel >= RELAY_COUNT) {
        return false;
    }
    return channels[channel].pendingState;
}

uint32_t getCooldownRemainingMs(uint8_t channel) {
    if (channel >= RELAY_COUNT || channels[channel].cooldownStartMs == 0) {
        return 0;
    }

    uint32_t elapsed = millis() - channels[channel].cooldownStartMs;
    if (elapsed >= RELAY_COOLDOWN_MS) {
        return 0;
    }

    return RELAY_COOLDOWN_MS - elapsed;
}

void setStateChangeCallback(StateChangeCallback callback) {
    stateChangeCb = callback;
}

void setCurrentSource(const char* source) {
    activeSource = source;
}

}
