#pragma once

#include <stdint.h>
#include <stdbool.h>

namespace Switches {

using ChangeCallback = void (*)(uint8_t channel, bool newState);

void begin();
void tick(ChangeCallback callback);

}
