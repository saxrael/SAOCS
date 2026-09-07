#pragma once

#include <stdint.h>

static constexpr uint8_t RELAY_PINS[4] = {16, 17, 18, 19};
static constexpr uint8_t SWITCH_PINS[4] = {32, 33, 34, 35};
static constexpr uint8_t RELAY_COUNT = 4;
static constexpr uint32_t RELAY_COOLDOWN_MS = 1000;
static constexpr uint32_t SWITCH_DEBOUNCE_MS = 50;
static constexpr char NVS_NAMESPACE[] = "saocs";
static constexpr char NVS_RELAY_KEYS[4][3] = {"r1", "r2", "r3", "r4"};
