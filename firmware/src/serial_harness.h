#pragma once

#ifdef SERIAL_HARNESS_ENABLED

#include <stdint.h>

namespace SerialHarness {

void begin(uint32_t baudRate);
void tick();

} // namespace SerialHarness

#endif // SERIAL_HARNESS_ENABLED
