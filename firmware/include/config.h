#pragma once

#include <stdint.h>

// Relay output pins (TRD §6 locked contract)
static constexpr uint8_t RELAY_PINS[4] = {16, 17, 18, 19};

// Switch input pins (TRD §6). GPIO 34 and 35 are input-only on ESP32-WROOM-32 and lack internal pull-ups, requiring external pull-up resistors in physical wiring.
static constexpr uint8_t SWITCH_PINS[4] = {32, 33, 34, 35};

static constexpr uint8_t RELAY_COUNT = 4;

// Minimum interval (ms) between consecutive actuations of the same relay to protect physical contacts (PRD NFR-5, TRD §6)
static constexpr uint32_t RELAY_COOLDOWN_MS = 1000;

// Switch debounce window (ms) to filter electrical noise on mechanical contacts
static constexpr uint32_t SWITCH_DEBOUNCE_MS = 50;

// Flash storage namespace for Preferences (NVS)
static constexpr char NVS_NAMESPACE[] = "saocs";

// NVS key mapping per relay channel (0-indexed internally: channel 0 maps to "r1")
static constexpr char NVS_RELAY_KEYS[4][3] = {"r1", "r2", "r3", "r4"};
