#ifdef SERIAL_HARNESS_ENABLED

#include "serial_harness.h"
#include "relays.h"
#include "config.h"
#include <Arduino.h>
#include <string.h>
#include <stdio.h>

namespace SerialHarness {

namespace {

void processCommand(char* raw) {
    char* cmd = raw;
    while (*cmd == ' ' || *cmd == '\t') {
        cmd++;
    }

    size_t len = strlen(cmd);
    while (len > 0 && (cmd[len - 1] == ' ' || cmd[len - 1] == '\t' || cmd[len - 1] == '\r' || cmd[len - 1] == '\n')) {
        cmd[--len] = '\0';
    }

    if (len == 0) {
        return;
    }

    if (strcmp(cmd, "STATUS") == 0) {
        for (uint8_t i = 0; i < RELAY_COUNT; ++i) {
            uint8_t ch = i + 1;
            bool st = Relays::getState(i);
            if (Relays::hasPending(i)) {
                bool pend = Relays::getPendingState(i);
                uint32_t rem = Relays::getCooldownRemainingMs(i);
                Serial.printf("CH%u: %-3s (pending: %s, cooldown: %lums remaining)\n", ch, st ? "ON" : "OFF", pend ? "ON" : "OFF", (unsigned long)rem);
            } else {
                Serial.printf("CH%u: %-3s (no pending)\n", ch, st ? "ON" : "OFF");
            }
        }
        return;
    }

    int ch = 0;
    char action[8] = {0};
    char extra = '\0';
    int matched = sscanf(cmd, "RELAY %d %7s %c", &ch, action, &extra);
    if (matched == 2 && ch >= 1 && ch <= RELAY_COUNT) {
        if (strcmp(action, "ON") == 0) {
            Relays::requestStateChange(static_cast<uint8_t>(ch - 1), true);
            Serial.printf("OK RELAY %u ON\n", static_cast<unsigned int>(ch));
            return;
        }
        if (strcmp(action, "OFF") == 0) {
            Relays::requestStateChange(static_cast<uint8_t>(ch - 1), false);
            Serial.printf("OK RELAY %u OFF\n", static_cast<unsigned int>(ch));
            return;
        }
    }

    matched = sscanf(cmd, "TOGGLE %d %c", &ch, &extra);
    if (matched == 1 && ch >= 1 && ch <= RELAY_COUNT) {
        uint8_t channelIndex = static_cast<uint8_t>(ch - 1);
        bool cur = Relays::getState(channelIndex);
        Relays::requestStateChange(channelIndex, !cur);
        Serial.printf("OK TOGGLE %u -> %s\n", static_cast<unsigned int>(ch), !cur ? "ON" : "OFF");
        return;
    }

    Serial.println("ERR UNKNOWN CMD");
}

}

void begin(uint32_t baudRate) {
    Serial.begin(baudRate);
}

void tick() {
    static char lineBuf[64];
    static size_t lineLen = 0;

    while (Serial.available() > 0) {
        int c = Serial.read();
        if (c < 0) {
            break;
        }

        char ch = static_cast<char>(c);
        if (ch == '\r' || ch == '\n') {
            if (lineLen > 0) {
                lineBuf[lineLen] = '\0';
                processCommand(lineBuf);
                lineLen = 0;
            }
        } else {
            if (lineLen < sizeof(lineBuf) - 1) {
                lineBuf[lineLen++] = ch;
            }
        }
    }
}

}

#endif
