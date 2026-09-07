#pragma once

#ifdef SERIAL_HARNESS_ENABLED

#include <stdint.h>

namespace SerialHarness {

void begin(uint32_t baudRate);
void tick();

}

#endif
