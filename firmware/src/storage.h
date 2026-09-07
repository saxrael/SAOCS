#pragma once

#include <stdint.h>
#include <stdbool.h>

namespace Storage {

void begin();
bool readRelayState(uint8_t channel);
void writeRelayState(uint8_t channel, bool state);

}
